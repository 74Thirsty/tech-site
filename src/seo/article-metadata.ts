import type { Metadata } from "next";
import { getImage } from "@/content/image-store";
import { env } from "@/lib/env";

export function generateArticleMetadata(article: {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
}): Metadata {
  const image = getImage(article.slug);
  const url = `${env.siteUrl}/articles/${article.slug}`;

  return {
    title: `${article.title} | NEON//FORGE`,
    description: article.excerpt.slice(0, 155),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      url,
      siteName: "NEON//FORGE",
      ...(image && {
        images: [
          {
            url: image.url,
            width: 1200,
            height: 675,
            alt: image.alt,
          },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      ...(image && {
        images: [image.url],
      }),
    },
  };
}
