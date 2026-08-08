import type { NormalizedProduct } from "@/lib/products/types";
import type { DetectedEntity } from "./entity-detector";

// ─── Relevance Scorer ────────────────────────────────────────────────────────
// Scores each candidate product against detected entities and article context.
// Factors: semantic match, category match, use-case match, data quality,
// affiliate eligibility. Normalized to 0-1. Minimum threshold: 0.4.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoredProduct extends NormalizedProduct {
  relevanceScore: number;
  matchedEntity: string;
  matchedIntent: string;
  placementReason: string;
}

// ─── Scoring Weights ─────────────────────────────────────────────────────────

const WEIGHTS = {
  semanticMatch: 0.30,
  categoryMatch: 0.20,
  useCaseMatch: 0.25,
  dataQuality: 0.15,
  affiliateEligibility: 0.10,
} as const;

const MIN_THRESHOLD = 0.4;

// ─── Scoring Functions ───────────────────────────────────────────────────────

function semanticScore(product: NormalizedProduct, entities: DetectedEntity[]): number {
  const titleLower = product.title.toLowerCase();
  const descLower = (product.description ?? "").toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  let bestScore = 0;

  for (const entity of entities) {
    const termLower = entity.term.toLowerCase();

    // Direct title match
    if (titleLower.includes(termLower)) {
      bestScore = Math.max(bestScore, 0.9);
      continue;
    }

    // Description match
    if (descLower.includes(termLower)) {
      bestScore = Math.max(bestScore, 0.6);
      continue;
    }

    // Partial word overlap
    const entityWords = termLower.split(/\s+/);
    const matchedWords = entityWords.filter(w => combined.includes(w));
    const overlap = matchedWords.length / entityWords.length;
    if (overlap > 0.5) {
      bestScore = Math.max(bestScore, 0.4 + overlap * 0.3);
    }
  }

  return Math.min(bestScore, 1.0);
}

function categoryScore(product: NormalizedProduct, entities: DetectedEntity[]): number {
  const matchedEntity = entities.find(e =>
    product.title.toLowerCase().includes(e.term.toLowerCase())
  );

  if (!matchedEntity) return 0.3;

  // Check if product features mention relevant terms
  const features = product.features.join(" ").toLowerCase();
  const hasRelevantFeatures = entities.some(e =>
    features.includes(e.term.toLowerCase())
  );

  return hasRelevantFeatures ? 0.8 : 0.5;
}

function fitScore(product: NormalizedProduct, entities: DetectedEntity[]): number {
  let score = 0;

  for (const entity of entities) {
    if (entity.intent === "DIRECT") {
      // Direct intent products should match closely
      if (product.title.toLowerCase().includes(entity.term.toLowerCase())) {
        score += 0.4;
      }
      if (entity.searchTemplates.some(t =>
        product.title.toLowerCase().includes(t.toLowerCase().split(" ")[0])
      )) {
        score += 0.3;
      }
    } else {
      // Supporting intent — looser matching
      if (product.features.some(f =>
        f.toLowerCase().includes(entity.term.toLowerCase())
      )) {
        score += 0.2;
      }
    }
  }

  return Math.min(score, 1.0);
}

function dataQualityScore(product: NormalizedProduct): number {
  let score = 0;

  if (product.imageUrl) score += 0.25;
  if (product.price && product.price.amount > 0) score += 0.25;
  if (product.rating && product.rating > 0) score += 0.15;
  if (product.features.length > 0) score += 0.15;
  if (product.title.length > 10) score += 0.10;
  if (product.brand) score += 0.10;

  return score;
}

function affiliateEligibilityScore(product: NormalizedProduct): number {
  let score = 0;

  if (product.detailPageUrl) score += 0.4;
  if (product.detailPageUrl.includes("tag=")) score += 0.3;
  if (product.id) score += 0.2;
  if (product.availability !== "OutOfStock") score += 0.1;

  return score;
}

function generatePlacementReason(
  product: NormalizedProduct,
  entities: DetectedEntity[],
  score: number
): string {
  const matchedEntity = entities.find(e =>
    product.title.toLowerCase().includes(e.term.toLowerCase())
  );

  if (!matchedEntity) return "Product matches article topic";

  const entityDesc = matchedEntity.term;
  const intent = matchedEntity.intent === "DIRECT"
    ? "directly relevant to"
    : "complements the discussion of";

  return `This ${matchedEntity.productType} ${intent} ${entityDesc}.`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function scoreProducts(
  products: NormalizedProduct[],
  entities: DetectedEntity[],
  articleCategory: string
): ScoredProduct[] {
  const scored: ScoredProduct[] = [];

  for (const product of products) {
    const semantic = semanticScore(product, entities);
    const category = categoryScore(product, entities);
    const fit = fitScore(product, entities);
    const quality = dataQualityScore(product);
    const eligibility = affiliateEligibilityScore(product);

    const totalScore =
      semantic * WEIGHTS.semanticMatch +
      category * WEIGHTS.categoryMatch +
      fit * WEIGHTS.useCaseMatch +
      quality * WEIGHTS.dataQuality +
      eligibility * WEIGHTS.affiliateEligibility;

    if (totalScore < MIN_THRESHOLD) continue;

    const matchedEntity = entities.find(e =>
      product.title.toLowerCase().includes(e.term.toLowerCase())
    ) ?? entities[0];

    scored.push({
      ...product,
      relevanceScore: Math.round(totalScore * 100) / 100,
      matchedEntity: matchedEntity.term,
      matchedIntent: matchedEntity.intent,
      placementReason: generatePlacementReason(product, entities, totalScore),
    });
  }

  return scored
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3); // Top 3 only
}
