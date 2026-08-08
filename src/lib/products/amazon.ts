import { env } from "../env";
import type { ProductAdapter, ProductSearchResult, NormalizedProduct } from "./types";

// ─── Amazon Creators API Adapter ───────────────────────────────────────────────
// OAuth2 client_credentials flow + SearchItems/GetItems operations.
// Implements the ProductAdapter interface for pluggable multi-adapter support.

// ─── Token Management ────────────────────────────────────────────────────────

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

function getTokenEndpoint(): string {
  const version = process.env.AMAZON_API_VERSION ?? "3.1";
  if (version.startsWith("3.2")) return "https://api.amazon.co.uk/auth/o2/token";
  if (version.startsWith("3.3")) return "https://api.amazon.co.jp/auth/o2/token";
  return "https://api.amazon.com/auth/o2/token";
}

async function getAccessToken(): Promise<string | null> {
  if (!env.amazonClientId || !env.amazonClientSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
    return cachedToken.accessToken;
  }

  try {
    const res = await fetch(getTokenEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: env.amazonClientId,
        client_secret: env.amazonClientSecret,
        scope: "creatorsapi::default",
      }),
    });

    if (!res.ok) {
      console.error(`Amazon token request failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return cachedToken.accessToken;
  } catch (error) {
    console.error(`Amazon token request error: ${String(error)}`);
    return null;
  }
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 req/sec

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();
}

// ─── API Request ─────────────────────────────────────────────────────────────

async function amazonApiRequest<T>(
  path: string,
  body: Record<string, unknown>,
  retries = 2
): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const marketplace = env.amazonMarketplace ?? "www.amazon.com";

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, attempt * 2000));
    }

    await throttle();

    try {
      const res = await fetch(`https://creatorsapi.amazon${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-marketplace": marketplace,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        console.log(`Amazon API rate limited (attempt ${attempt + 1})`);
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`Amazon API ${res.status}: ${text.slice(0, 200)}`);
        return null;
      }

      return await res.json();
    } catch (error) {
      console.error(`Amazon API request error: ${String(error)}`);
      if (attempt === retries) return null;
    }
  }

  return null;
}

// ─── Response Normalization ───────────────────────────────────────────────────

function normalizeProduct(item: Record<string, unknown>): NormalizedProduct {
  const itemInfo = (item.itemInfo ?? {}) as Record<string, unknown>;
  const title = (itemInfo.title as { displayValue?: string })?.displayValue ?? "";
  const features = (itemInfo.features as { displayValues?: string[] })?.displayValues ?? [];
  const byLine = (itemInfo.byLineInfo as { displayValues?: Array<{ displayValue: string }> })?.displayValues;
  const brand = byLine?.[0]?.displayValue;

  const images = (item.images ?? {}) as Record<string, unknown>;
  const primary = (images.primary ?? {}) as Record<string, unknown>;
  const img = (primary.medium ?? primary.small ?? primary.large ?? {}) as { url?: string };

  const offers = (item.offersV2 ?? {}) as Record<string, unknown>;
  const listings = (offers.listings ?? []) as Array<Record<string, unknown>>;
  const firstListing = listings[0];
  let price: NormalizedProduct["price"] | undefined;
  if (firstListing) {
    const priceData = (firstListing.price ?? {}) as Record<string, unknown>;
    const amount = Number(priceData.amount ?? 0);
    const currency = String(priceData.currency ?? "USD");
    const display = String(priceData.displayAmount ?? `$${amount}`);
    if (amount > 0) price = { amount, currency, display };
  }

  const reviews = (item.customerReviews ?? {}) as Record<string, unknown>;
  const stars = (reviews.starRating ?? {}) as { value?: number };

  const asin = String(item.asin ?? "");
  const marketplace = env.amazonMarketplace ?? "www.amazon.com";
  const partnerTag = env.amazonPartnerTag ?? "";
  const tagParam = partnerTag ? `?tag=${partnerTag}&linkCode=ogi&psc=1` : "";

  return {
    id: asin,
    source: "amazon",
    title,
    brand,
    description: features[0] ?? "",
    imageUrl: img.url ?? undefined,
    detailPageUrl: `https://${marketplace}/dp/${asin}${tagParam}`,
    price,
    rating: stars.value ?? undefined,
    reviewCount: undefined,
    features,
    availability: undefined,
  };
}

// ─── Adapter Implementation ───────────────────────────────────────────────────

export class AmazonAdapter implements ProductAdapter {
  readonly name = "amazon";

  isConfigured(): boolean {
    return Boolean(env.amazonClientId && env.amazonClientSecret && env.amazonPartnerTag);
  }

  async search(
    keywords: string,
    options: { itemCount?: number; category?: string } = {}
  ): Promise<ProductSearchResult> {
    if (!this.isConfigured()) {
      return { products: [], totalResults: 0, query: keywords, source: this.name };
    }

    const marketplace = env.amazonMarketplace ?? "www.amazon.com";
    const partnerTag = env.amazonPartnerTag ?? "";
    const itemCount = options.itemCount ?? 5;

    const body: Record<string, unknown> = {
      keywords,
      marketplace,
      partnerTag,
      itemCount,
      resources: [
        "images.primary.medium",
        "itemInfo.title",
        "itemInfo.features",
        "itemInfo.byLineInfo",
        "offersV2.listings.price",
        "customerReviews.starRating",
      ],
    };

    if (options.category) {
      body.searchIndex = options.category;
    }

    const data = await amazonApiRequest<{
      searchResult?: { items?: Array<Record<string, unknown>>; totalResultCount?: number };
    }>("/catalog/v1/searchItems", body);

    if (!data?.searchResult?.items) {
      return { products: [], totalResults: 0, query: keywords, source: this.name };
    }

    const products = data.searchResult.items.map(normalizeProduct).filter(p => p.id && p.title);

    return {
      products,
      totalResults: data.searchResult.totalResultCount ?? products.length,
      query: keywords,
      source: this.name,
    };
  }

  async getByIds(ids: string[]): Promise<NormalizedProduct[]> {
    if (!this.isConfigured() || ids.length === 0) return [];

    const marketplace = env.amazonMarketplace ?? "www.amazon.com";
    const partnerTag = env.amazonPartnerTag ?? "";

    const data = await amazonApiRequest<{
      itemsResult?: { items?: Array<Record<string, unknown>> };
    }>("/catalog/v1/getItems", {
      itemIds: ids,
      itemIdType: "ASIN",
      marketplace,
      partnerTag,
      resources: [
        "images.primary.medium",
        "itemInfo.title",
        "itemInfo.features",
        "itemInfo.byLineInfo",
        "offersV2.listings.price",
        "customerReviews.starRating",
      ],
    });

    if (!data?.itemsResult?.items) return [];

    return data.itemsResult.items.map(normalizeProduct).filter(p => p.id && p.title);
  }
}
