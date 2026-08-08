import { env } from "../env";
import type { ProductAdapter, ProductSearchResult, NormalizedProduct } from "./types";

// ─── ProductSource Adapter ─────────────────────────────────────────────────────
// https://www.productsource.io
// Free tier: 500 lookups/month, no credit card required.
// Supports Amazon, eBay, Walmart, and 450+ other retailers.
//
// Uses MCP (Model Context Protocol) endpoint for product data.

const MCP_URL = "https://mcp.productsource.io/mcp";

// ─── MCP Tool Response Types ──────────────────────────────────────────────────

interface ProductSourceProduct {
  upc?: string;
  title: string;
  brand?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  url?: string;
  affiliateUrl?: string;
  price?: number | string;
  lowestPrice?: number | string;
  currency?: string;
  availability?: string;
  rating?: number;
  reviewCount?: number;
  features?: string[];
  specs?: Record<string, string>;
  retailers?: Array<{
    name: string;
    price: number;
    inStock: boolean;
    url?: string;
  }>;
}

interface MCPCallResult {
  content?: Array<{
    type: string;
    text?: string;
    data?: unknown;
  }>;
}

// ─── MCP Transport ────────────────────────────────────────────────────────────

async function mcpCall(tool: string, params: Record<string, unknown>): Promise<unknown> {
  const apiKey = env.productSourceApiKey;
  if (!apiKey) return null;

  try {
    // MCP JSON-RPC format
    const body = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: tool,
        arguments: params,
      },
    };

    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`ProductSource MCP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "";

    // Handle SSE response
    if (contentType.includes("text/event-stream")) {
      const text = await res.text();
      // Parse SSE events — last data event contains the result
      const events = text.split("\n\n").filter(e => e.startsWith("data: "));
      const lastEvent = events[events.length - 1];
      if (lastEvent) {
        const jsonStr = lastEvent.replace(/^data: /, "");
        return JSON.parse(jsonStr);
      }
      return null;
    }

    // Handle regular JSON response
    return await res.json();
  } catch (error) {
    console.error(`ProductSource MCP error: ${String(error)}`);
    return null;
  }
}

// ─── Response Normalization ───────────────────────────────────────────────────

function normalize(product: ProductSourceProduct, partnerTag: string): NormalizedProduct {
  const id = product.upc ?? "";
  const price = typeof product.lowestPrice === "number"
    ? product.lowestPrice
    : typeof product.price === "number"
      ? product.price
      : typeof product.lowestPrice === "string"
        ? parseFloat(product.lowestPrice) || 0
        : typeof product.price === "string"
          ? parseFloat(product.price) || 0
          : 0;
  const currency = product.currency ?? "USD";

  // Build affiliate URL from retailer data
  let affiliateUrl = product.affiliateUrl ?? product.url ?? "";
  const amazonRetailer = product.retailers?.find(r =>
    r.name.toLowerCase().includes("amazon") && r.url
  );
  if (amazonRetailer?.url) affiliateUrl = amazonRetailer.url;

  // Append Amazon partner tag if applicable
  if (partnerTag && affiliateUrl.includes("amazon") && !affiliateUrl.includes("tag=")) {
    const separator = affiliateUrl.includes("?") ? "&" : "?";
    affiliateUrl += `${separator}tag=${partnerTag}`;
  }

  return {
    id,
    source: "productsource",
    title: product.title ?? "",
    brand: product.brand,
    category: product.category,
    description: product.description,
    imageUrl: product.imageUrl ?? product.images?.[0],
    detailPageUrl: affiliateUrl,
    price: price > 0 ? { amount: price, currency, display: `${currency} ${price.toFixed(2)}` } : undefined,
    rating: product.rating,
    reviewCount: product.reviewCount,
    features: product.features ?? [],
    availability: product.availability,
  };
}

// ─── Adapter Implementation ───────────────────────────────────────────────────

export class ProductSourceAdapter implements ProductAdapter {
  readonly name = "productsource";

  isConfigured(): boolean {
    return Boolean(env.productSourceApiKey);
  }

  async search(
    keywords: string,
    options: { itemCount?: number; category?: string } = {}
  ): Promise<ProductSearchResult> {
    if (!this.isConfigured()) {
      return { products: [], totalResults: 0, query: keywords, source: this.name };
    }

    const limit = options.itemCount ?? 5;
    const partnerTag = env.amazonPartnerTag ?? "";

    const result = await mcpCall("search_products", {
      query: keywords,
      category: options.category,
      limit,
    }) as MCPCallResult | null;

    // Extract products from MCP response
    const content = result?.content;
    if (!content || content.length === 0) {
      return { products: [], totalResults: 0, query: keywords, source: this.name };
    }

    // Parse the response — may be JSON in text field or structured data
    let products: ProductSourceProduct[] = [];
    for (const item of content) {
      if (item.data && Array.isArray(item.data)) {
        products = item.data as ProductSourceProduct[];
        break;
      }
      if (item.text) {
        try {
          const parsed = JSON.parse(item.text);
          if (Array.isArray(parsed)) {
            products = parsed;
          } else if (parsed.products && Array.isArray(parsed.products)) {
            products = parsed.products;
          } else if (parsed.results && Array.isArray(parsed.results)) {
            products = parsed.results;
          }
        } catch {
          // Not JSON, skip
        }
      }
    }

    const normalized = products
      .map(p => normalize(p, partnerTag))
      .filter(p => p.title);

    return {
      products: normalized,
      totalResults: normalized.length,
      query: keywords,
      source: this.name,
    };
  }

  async getByIds(ids: string[]): Promise<NormalizedProduct[]> {
    if (!this.isConfigured() || ids.length === 0) return [];

    const partnerTag = env.amazonPartnerTag ?? "";
    const results: NormalizedProduct[] = [];

    // lookup_product takes one UPC at a time
    for (const upc of ids.slice(0, 5)) {
      const result = await mcpCall("lookup_product", { upc }) as MCPCallResult | null;
      const content = result?.content;
      if (!content || content.length === 0) continue;

      for (const item of content) {
        if (item.data && typeof item.data === "object") {
          results.push(normalize(item.data as ProductSourceProduct, partnerTag));
          break;
        }
        if (item.text) {
          try {
            const parsed = JSON.parse(item.text);
            if (parsed.title) {
              results.push(normalize(parsed, partnerTag));
            }
          } catch {
            // Not JSON, skip
          }
        }
      }
    }

    return results.filter(p => p.title);
  }
}
