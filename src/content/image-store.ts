import type { PexelsImage } from "@/lib/pexels";

export type ArticleImage = PexelsImage;

export type ImageStore = Record<string, ArticleImage>;

let cachedImages: ImageStore | null = null;

export async function loadImages(): Promise<ImageStore> {
  if (cachedImages) return cachedImages;
  try {
    const mod = await import("@/content/images.json");
    cachedImages = mod.default || mod;
    return cachedImages!;
  } catch {
    cachedImages = {};
    return cachedImages;
  }
}

export function getImage(slug: string): ArticleImage | null {
  return cachedImages?.[slug] ?? null;
}

export async function saveImage(slug: string, image: ArticleImage): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const store = await loadImages();
  store[slug] = image;
  const filePath = path.resolve(process.cwd(), "src/content/images.json");
  await fs.writeFile(filePath, JSON.stringify(store, null, 2));
  cachedImages = store;
}
