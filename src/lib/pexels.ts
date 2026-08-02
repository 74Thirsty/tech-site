import { env } from "./env";

export type PexelsImage = {
  id: number;
  url: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  width: number;
  height: number;
  avgColor: string;
};

type PexelsSearchResponse = {
  photos: Array<{
    id: number;
    src: { large2x: string; large: string; medium: string };
    alt: string | null;
    photographer: string;
    photographer_url: string;
    url: string;
    width: number;
    height: number;
    avg_color: string;
  }>;
  total_results: number;
};

export async function searchPexels(query: string, perPage: number = 5): Promise<PexelsImage[]> {
  if (!env.pexelsApiKey) throw new Error("PEXELS_API_KEY not configured");
  const params = new URLSearchParams({ query, per_page: String(perPage), orientation: "landscape" });
  const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: env.pexelsApiKey },
  });
  if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);
  const data: PexelsSearchResponse = await response.json();
  return data.photos.map((p) => ({
    id: p.id,
    url: p.src.large2x || p.src.large,
    alt: p.alt || query,
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    sourceUrl: `https://www.pexels.com/photo/${p.id}/`,
    width: p.width,
    height: p.height,
    avgColor: p.avg_color,
  }));
}

export async function findBestImage(topics: string[], title: string): Promise<PexelsImage | null> {
  const queries = [title.slice(0, 80), ...topics.slice(0, 2)].filter(Boolean);
  for (const q of queries) {
    const results = await searchPexels(q, 3);
    if (results.length > 0) return results[0];
  }
  return null;
}
