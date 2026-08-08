import type { ProductAdapter, ProductSearchResult, NormalizedProduct } from "./types";
import { ProductSourceAdapter } from "./productsource";
import { AmazonAdapter } from "./amazon";

// ─── Product Adapter Manager ───────────────────────────────────────────────────
// Orchestrates multiple product adapters. Runs all configured adapters in
// parallel, merges results, deduplicates by ID, and ranks by relevance.
//
// Adding a new adapter:
// 1. Implement ProductAdapter interface
// 2. Instantiate it in adapters array below
// 3. That's it — manager handles the rest.

// ─── Adapter Registry ─────────────────────────────────────────────────────────

const adapters: ProductAdapter[] = [
  new ProductSourceAdapter(),
  new AmazonAdapter(),
];

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicate(products: NormalizedProduct[]): NormalizedProduct[] {
  const seen = new Map<string, NormalizedProduct>();

  for (const product of products) {
    const key = product.id.toLowerCase();
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, product);
    } else {
      // Prefer the one with more data (price, image, rating)
      const scoreA = (existing.price ? 1 : 0) + (existing.imageUrl ? 1 : 0) + (existing.rating ? 1 : 0);
      const scoreB = (product.price ? 1 : 0) + (product.imageUrl ? 1 : 0) + (product.rating ? 1 : 0);
      if (scoreB > scoreA) seen.set(key, product);
    }
  }

  return Array.from(seen.values());
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getActiveAdapters(): ProductAdapter[] {
  return adapters.filter(a => a.isConfigured());
}

export function isAnyProductSourceConfigured(): boolean {
  return adapters.some(a => a.isConfigured());
}

export async function searchProducts(
  keywords: string,
  options: { itemCount?: number; category?: string } = {}
): Promise<ProductSearchResult> {
  const active = getActiveAdapters();
  if (active.length === 0) {
    return { products: [], totalResults: 0, query: keywords, source: "none" };
  }

  // Run all adapters in parallel
  const results = await Promise.allSettled(
    active.map(adapter => adapter.search(keywords, options))
  );

  // Collect successful results
  const allProducts: NormalizedProduct[] = [];
  let totalResults = 0;
  let primarySource = active[0].name;

  for (const result of results) {
    if (result.status === "fulfilled") {
      allProducts.push(...result.value.products);
      totalResults += result.value.totalResults;
    }
  }

  // Deduplicate across adapters
  const deduped = deduplicate(allProducts);

  return {
    products: deduped,
    totalResults,
    query: keywords,
    source: primarySource,
  };
}

export async function getProductsByIds(ids: string[]): Promise<NormalizedProduct[]> {
  const active = getActiveAdapters();
  if (active.length === 0 || ids.length === 0) return [];

  const results = await Promise.allSettled(
    active.map(adapter => adapter.getByIds(ids))
  );

  const allProducts: NormalizedProduct[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allProducts.push(...result.value);
    }
  }

  return deduplicate(allProducts);
}
