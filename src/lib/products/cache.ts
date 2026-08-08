import { supabaseRequest } from "../supabase";
import { searchProducts, getProductsByIds, isAnyProductSourceConfigured } from "./manager";
import type { NormalizedProduct } from "./types";

// ─── Product Cache (Adapter-Agnostic) ─────────────────────────────────────────
// Caches products from any adapter in Supabase affiliate_products table.
// Respects freshness windows per adapter. Never breaks the pipeline.

const STALENESS_HOURS = 22;

// ─── Types ───────────────────────────────────────────────────────────────────

interface CachedProductRow {
  id: string;
  program_id: string;
  name: string;
  category: string;
  vendor: string;
  description: string;
  affiliate_url: string;
  image_url: string;
  price: string;
  rating: number;
  topics: string[];
  enabled: boolean;
  created_at: string;
}

// ─── Cache Operations ────────────────────────────────────────────────────────

function isStale(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const hours = (now - created) / (1000 * 60 * 60);
  return hours > STALENESS_HOURS;
}

async function getProgramId(source: string): Promise<string | null> {
  try {
    const programs = await supabaseRequest<Array<{ id: string; network: string }>>(
      `affiliate_programs?select=id&network=eq.${source}&limit=1`,
      { method: "GET" }
    );
    return programs?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function ensureProgram(source: string, adapterName: string): Promise<string | null> {
  const existing = await getProgramId(source);
  if (existing) return existing;

  try {
    const results = await supabaseRequest<Array<{ id: string }>>("affiliate_programs", {
      method: "POST",
      body: JSON.stringify({
        name: adapterName,
        network: source,
        affiliate_id: "",
        base_url: "",
        commission_type: "percentage",
        commission_rate: "variable",
        cookie_days: 24,
        enabled: true,
        created_at: new Date().toISOString(),
      }),
      headers: { Prefer: "return=representation" },
    });
    return results?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function upsertCachedProducts(
  searchKey: string,
  products: NormalizedProduct[],
  topic: string
): Promise<number> {
  let stored = 0;
  for (const product of products) {
    const programId = await ensureProgram(product.source, product.source);
    if (!programId) continue;

    try {
      await supabaseRequest("affiliate_products", {
        method: "POST",
        body: JSON.stringify({
          program_id: programId,
          name: product.title.slice(0, 200),
          category: product.category ?? "GENERAL",
          vendor: product.brand ?? product.source,
          description: (product.description ?? product.features[0] ?? "").slice(0, 500),
          affiliate_url: product.detailPageUrl,
          image_url: product.imageUrl ?? "",
          price: product.price?.display ?? "",
          rating: product.rating ?? 0,
          topics: [searchKey, topic].filter(Boolean),
          enabled: true,
          created_at: new Date().toISOString(),
        }),
      });
      stored++;
    } catch {
      // Skip failed inserts silently
    }
  }
  return stored;
}

async function getCachedProducts(searchKey: string): Promise<CachedProductRow[]> {
  try {
    const results = await supabaseRequest<CachedProductRow[]>(
      `affiliate_products?enabled=eq.true&topics=cs.{${encodeURIComponent(searchKey)}}&select=*&order=created_at.desc&limit=10`,
      { method: "GET" }
    );
    return results ?? [];
  } catch {
    return [];
  }
}

async function refreshProduct(product: CachedProductRow): Promise<CachedProductRow | null> {
  // Extract ID from URL (ASIN for Amazon, UPC for others)
  const asinMatch = product.affiliate_url?.match(/\/dp\/([A-Z0-9]{10})/);
  const upcMatch = product.affiliate_url?.match(/\/upc\/(\d+)/);
  const productId = asinMatch?.[1] ?? upcMatch?.[1];
  if (!productId) return null;

  const refreshed = await getProductsByIds([productId]);
  if (refreshed.length === 0) return null;

  const p = refreshed[0];
  try {
    await supabaseRequest(`affiliate_products?id=eq.${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: p.title.slice(0, 200),
        description: (p.description ?? p.features[0] ?? "").slice(0, 500),
        image_url: p.imageUrl ?? product.image_url,
        price: p.price?.display ?? product.price,
        rating: p.rating ?? product.rating,
        created_at: new Date().toISOString(),
      }),
    });
    return {
      ...product,
      name: p.title,
      vendor: p.brand ?? product.vendor,
      description: p.description ?? product.description,
      affiliate_url: p.detailPageUrl,
      image_url: p.imageUrl ?? product.image_url,
      price: p.price?.display ?? product.price,
      rating: p.rating ?? product.rating,
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function rowToProduct(row: CachedProductRow): NormalizedProduct {
  const asinMatch = row.affiliate_url?.match(/\/dp\/([A-Z0-9]{10})/);
  const upcMatch = row.affiliate_url?.match(/\/upc\/(\d+)/);

  return {
    id: asinMatch?.[1] ?? upcMatch?.[1] ?? row.id,
    source: "cache",
    title: row.name,
    brand: row.vendor,
    description: row.description,
    imageUrl: row.image_url || undefined,
    detailPageUrl: row.affiliate_url,
    price: row.price ? { amount: 0, currency: "USD", display: row.price } : undefined,
    rating: row.rating || undefined,
    features: [],
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function findOrFetchProducts(
  keywords: string[],
  topic: string
): Promise<NormalizedProduct[]> {
  if (!isAnyProductSourceConfigured()) return [];

  const searchKey = keywords[0] ?? topic;

  // 1. Check cache
  const cached = await getCachedProducts(searchKey);
  const fresh = cached.filter(c => !isStale(c.created_at));

  if (fresh.length >= 2) {
    return fresh.map(rowToProduct);
  }

  // 2. Fetch from adapters
  const searchQuery = keywords.slice(0, 3).join(" ");
  let result;
  try {
    result = await searchProducts(searchQuery, { itemCount: 5 });
  } catch (error) {
    console.error(`Product search failed for "${searchQuery}": ${String(error)}`);
    if (cached.length > 0) return cached.map(rowToProduct);
    return [];
  }

  if (result.products.length === 0) {
    return cached.length > 0 ? cached.map(rowToProduct) : [];
  }

  // 3. Cache new results
  await upsertCachedProducts(searchKey, result.products, topic);

  return result.products;
}

export async function refreshStaleProducts(): Promise<{ refreshed: number; failed: number }> {
  let refreshed = 0;
  let failed = 0;

  try {
    const allProducts = await supabaseRequest<CachedProductRow[]>(
      "affiliate_products?enabled=eq.true&select=*&order=created_at.asc&limit=50",
      { method: "GET" }
    );

    if (!allProducts) return { refreshed: 0, failed: 0 };

    const stale = allProducts.filter(p => isStale(p.created_at));

    for (const product of stale.slice(0, 10)) {
      const result = await refreshProduct(product);
      if (result) refreshed++;
      else failed++;
    }
  } catch (error) {
    console.error(`Product refresh failed: ${String(error)}`);
  }

  return { refreshed, failed };
}

export async function getProductsForArticle(
  articleSlug: string,
  tags: string[],
  category: string
): Promise<NormalizedProduct[]> {
  for (const tag of tags.slice(0, 3)) {
    const products = await findOrFetchProducts([tag], category);
    if (products.length > 0) return products;
  }

  const categoryProducts = await findOrFetchProducts([category], category);
  return categoryProducts;
}
