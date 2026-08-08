import { supabaseRequest } from "./supabase";
import { searchAmazon, getAmazonItems, isAmazonConfigured, type NormalizedProduct } from "./amazon";

// ─── Amazon Product Cache ────────────────────────────────────────────────────
// Caches Amazon products in Supabase affiliate_products table.
// Respects Amazon's 24-hour data freshness requirement.
// Never breaks the pipeline — returns empty on failure.

const STALENESS_HOURS = 22; // Amazon requires freshness within 24h

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

async function getAmazonProgramId(): Promise<string | null> {
  try {
    const programs = await supabaseRequest<Array<{ id: string; network: string }>>(
      "affiliate_programs?select=id&network=eq.amazon&limit=1",
      { method: "GET" }
    );
    return programs?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function ensureAmazonProgram(): Promise<string | null> {
  const existing = await getAmazonProgramId();
  if (existing) return existing;

  try {
    const results = await supabaseRequest<Array<{ id: string }>>("affiliate_programs", {
      method: "POST",
      body: JSON.stringify({
        name: "Amazon Associates",
        network: "amazon",
        affiliate_id: process.env.AMAZON_PARTNER_TAG ?? "",
        base_url: `https://${process.env.AMAZON_MARKETPLACE ?? "www.amazon.com"}`,
        commission_type: "percentage",
        commission_rate: "1-10%",
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
  const programId = await ensureAmazonProgram();
  if (!programId) return 0;

  let stored = 0;
  for (const product of products) {
    try {
      await supabaseRequest("affiliate_products", {
        method: "POST",
        body: JSON.stringify({
          program_id: programId,
          name: product.title.slice(0, 200),
          category: product.category ?? "TECHNOLOGY",
          vendor: product.brand ?? "Amazon",
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
  const asinMatch = product.affiliate_url?.match(/\/dp\/([A-Z0-9]{10})/);
  if (!asinMatch) return null;

  const refreshed = await getAmazonItems([asinMatch[1]]);
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
        created_at: new Date().toISOString(), // Reset staleness clock
      }),
    });
    return {
      id: product.id,
      program_id: product.program_id,
      name: p.title,
      category: product.category,
      vendor: p.brand ?? product.vendor,
      description: p.description ?? product.description,
      affiliate_url: p.detailPageUrl,
      image_url: p.imageUrl ?? product.image_url,
      price: p.price?.display ?? product.price,
      rating: p.rating ?? product.rating,
      topics: product.topics,
      enabled: product.enabled,
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function findOrFetchProducts(
  keywords: string[],
  topic: string
): Promise<NormalizedProduct[]> {
  if (!isAmazonConfigured()) return [];

  const searchKey = keywords[0] ?? topic;

  // 1. Check cache
  const cached = await getCachedProducts(searchKey);
  const fresh = cached.filter(c => !isStale(c.created_at));

  if (fresh.length >= 2) {
    return fresh.map(row => ({
      asin: row.affiliate_url?.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? "",
      title: row.name,
      brand: row.vendor,
      description: row.description,
      imageUrl: row.image_url || undefined,
      detailPageUrl: row.affiliate_url,
      price: row.price ? { amount: 0, currency: "USD", display: row.price } : undefined,
      rating: row.rating || undefined,
      features: [],
    }));
  }

  // 2. Fetch from Amazon
  const searchQuery = keywords.slice(0, 3).join(" ");
  let result;
  try {
    result = await searchAmazon(searchQuery, { itemCount: 5 });
  } catch (error) {
    console.error(`Amazon search failed for "${searchQuery}": ${String(error)}`);
    // Return stale cached if available
    if (cached.length > 0) {
      return cached.map(row => ({
        asin: row.affiliate_url?.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? "",
        title: row.name,
        brand: row.vendor,
        description: row.description,
        imageUrl: row.image_url || undefined,
        detailPageUrl: row.affiliate_url,
        price: row.price ? { amount: 0, currency: "USD", display: row.price } : undefined,
        rating: row.rating || undefined,
        features: [],
      }));
    }
    return [];
  }

  if (result.products.length === 0) return cached.length > 0
    ? cached.map(row => ({
        asin: row.affiliate_url?.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? "",
        title: row.name,
        brand: row.vendor,
        description: row.description,
        imageUrl: row.image_url || undefined,
        detailPageUrl: row.affiliate_url,
        price: row.price ? { amount: 0, currency: "USD", display: row.price } : undefined,
        rating: row.rating || undefined,
        features: [],
      }))
    : [];

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

    for (const product of stale.slice(0, 10)) { // Cap at 10 per refresh cycle
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
  // Try each tag as a search key
  for (const tag of tags.slice(0, 3)) {
    const products = await findOrFetchProducts([tag], category);
    if (products.length > 0) return products;
  }

  // Fallback: try category
  const categoryProducts = await findOrFetchProducts([category], category);
  return categoryProducts;
}
