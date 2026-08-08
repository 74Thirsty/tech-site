// ─── Product Adapter Types ─────────────────────────────────────────────────────
// Shared types for all product data adapters. Each adapter normalizes
// external API responses into NormalizedProduct.

export interface NormalizedProduct {
  id: string;                     // Unique ID (ASIN, UPC, or adapter-specific)
  source: string;                 // Adapter name that produced this product
  title: string;
  brand?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  detailPageUrl: string;          // Affiliate-tracked link
  price?: { amount: number; currency: string; display: string };
  rating?: number;
  reviewCount?: number;
  features: string[];
  availability?: string;
}

export interface ProductSearchResult {
  products: NormalizedProduct[];
  totalResults: number;
  query: string;
  source: string;                 // Adapter name
}

export interface ProductAdapter {
  readonly name: string;

  /** Check if this adapter has valid credentials configured */
  isConfigured(): boolean;

  /** Search for products by keywords */
  search(
    keywords: string,
    options?: { itemCount?: number; category?: string }
  ): Promise<ProductSearchResult>;

  /** Fetch specific products by ID (ASIN, UPC, etc.) */
  getByIds(ids: string[]): Promise<NormalizedProduct[]>;
}
