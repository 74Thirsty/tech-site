// ─── Products Module ───────────────────────────────────────────────────────────
// Pluggable adapter system for product data. Supports multiple adapters
// running in parallel with deduplication and caching.
//
// Usage:
//   import { findOrFetchProducts, getProductsForArticle, isAnyProductSourceConfigured } from "@/lib/products";
//
// Adding a new adapter:
//   1. Create src/lib/products/myadapter.ts implementing ProductAdapter
//   2. Add `new MyAdapter()` to adapters array in manager.ts
//   3. Done — manager handles discovery, dedup, and caching automatically.

export type { NormalizedProduct, ProductSearchResult, ProductAdapter } from "./types";
export { isAnyProductSourceConfigured, getActiveAdapters, searchProducts, getProductsByIds } from "./manager";
export { findOrFetchProducts, getProductsForArticle, refreshStaleProducts } from "./cache";
