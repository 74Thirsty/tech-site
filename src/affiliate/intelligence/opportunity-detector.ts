import type { ArticlePlan } from "@/research/types";
import { isAnyProductSourceConfigured, findOrFetchProducts } from "@/lib/products";
import { detectEntities, type DetectedEntity } from "./entity-detector";
import { generateQueries, type ProductQuery } from "./query-generator";
import { scoreProducts, type ScoredProduct } from "./relevance-scorer";

// ─── Opportunity Detector ────────────────────────────────────────────────────
// Orchestrates the full product intelligence pipeline:
// entity detection → query generation → product fetching → relevance scoring
// → placement decision. Returns null if no legitimate opportunity exists.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductOpportunity {
  entities: DetectedEntity[];
  queries: ProductQuery[];
  products: ScoredProduct[];
  placement: {
    sidebar: boolean;
    bottom: boolean;
    reason: string;
  };
  editorialGuidance: string;
}

// ─── Placement Logic ─────────────────────────────────────────────────────────

function decidePlacement(products: ScoredProduct[]): {
  sidebar: boolean;
  bottom: boolean;
  reason: string;
} {
  if (products.length === 0) {
    return { sidebar: false, bottom: false, reason: "No products available" };
  }

  const topProduct = products[0];
  const hasMultiple = products.length >= 2;
  const highConfidence = topProduct.relevanceScore >= 0.7;
  const mediumConfidence = topProduct.relevanceScore >= 0.5;

  // High confidence + strong product → sidebar
  if (highConfidence && topProduct.matchedIntent === "DIRECT") {
    return {
      sidebar: true,
      bottom: hasMultiple,
      reason: `High-confidence product match (${Math.round(topProduct.relevanceScore * 100)}%) for ${topProduct.matchedEntity}`,
    };
  }

  // Medium confidence + multiple products → bottom only
  if (mediumConfidence && hasMultiple) {
    return {
      sidebar: false,
      bottom: true,
      reason: `Multiple relevant products available (top: ${Math.round(topProduct.relevanceScore * 100)}%)`,
    };
  }

  // Medium confidence + single product → bottom
  if (mediumConfidence) {
    return {
      sidebar: false,
      bottom: true,
      reason: `Relevant product available (${Math.round(topProduct.relevanceScore * 100)}%)`,
    };
  }

  // Low confidence → no placement
  return {
    sidebar: false,
    bottom: false,
    reason: `Product relevance too low (${Math.round(topProduct.relevanceScore * 100)}%)`,
  };
}

// ─── Editorial Guidance ──────────────────────────────────────────────────────

function generateEditorialGuidance(
  entities: DetectedEntity[],
  products: ScoredProduct[]
): string {
  if (entities.length === 0 || products.length === 0) {
    return "";
  }

  const entityList = entities
    .slice(0, 3)
    .map(e => `- ${e.term} (${e.intent.toLowerCase()}: ${e.productType})`)
    .join("\n");

  const productList = products
    .slice(0, 3)
    .map((p, i) => `${i + 1}. ${p.title} — Relevance: ${Math.round(p.relevanceScore * 100)}%\n   Use case: ${p.placementReason}`)
    .join("\n");

  return `ARTICLE PRODUCT CONTEXT

Detected commercial entities:
${entityList}

Relevant product opportunities:
${productList}

Editorial instruction:
Products may be referenced when genuinely useful to the reader.
Do not restructure the article around these products.
Do not manufacture product recommendations.
Do not make unsupported claims.
Do not make the article read like an advertisement.
If no product reference fits naturally, omit it entirely.
Products should appear as helpful suggestions, not as the article's purpose.`;
}

// ─── Main Orchestrator ───────────────────────────────────────────────────────

export async function detectOpportunities(
  plan: ArticlePlan
): Promise<ProductOpportunity | null> {
  // 1. Check if any product source is configured
  if (!isAnyProductSourceConfigured()) return null;

  // 2. Detect commercial entities
  const entities = detectEntities(plan);

  // Filter out INCIDENTAL — never display
  const actionableEntities = entities.filter(e => e.intent !== ("INCIDENTAL" as "DIRECT"));

  if (actionableEntities.length === 0) return null;

  // 3. Generate search queries
  const queries = generateQueries(actionableEntities, plan.category, plan.tags);

  if (queries.length === 0) return null;

  // 4. Fetch products from Amazon (via cache)
  const searchKeywords = queries.slice(0, 3).map(q => q.query);
  let products;
  try {
    products = await findOrFetchProducts(searchKeywords, plan.category);
  } catch (error) {
    console.error(`Product fetch failed: ${String(error)}`);
    return null;
  }

  if (products.length === 0) return null;

  // 5. Score products
  const scored = scoreProducts(products, actionableEntities, plan.category);

  if (scored.length === 0) return null;

  // 6. Decide placement
  const placement = decidePlacement(scored);

  if (!placement.sidebar && !placement.bottom) return null;

  // 7. Generate editorial guidance
  const editorialGuidance = generateEditorialGuidance(actionableEntities, scored);

  return {
    entities: actionableEntities,
    queries,
    products: scored,
    placement,
    editorialGuidance,
  };
}
