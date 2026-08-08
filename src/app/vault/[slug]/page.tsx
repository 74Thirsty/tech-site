import Image from "next/image";
import { notFound } from "next/navigation";
import { getChartForArticle } from "@/lib/charts";
import { getArticleImages } from "@/lib/pexels";
import { getGeneratedArticle } from "@/lib/generated-articles";
import { isAnyProductSourceConfigured, getProductsForArticle } from "@/lib/products";
import MermaidDiagram from "@/components/MermaidDiagram";
import ArticleImage from "@/components/ArticleImage";
import ArticleFooter from "@/components/ArticleFooter";
import BookAd from "@/components/BookAd";
import ProductSidebar from "@/components/ProductSidebar";
import ProductBottom from "@/components/ProductBottom";

export const dynamic = "force-dynamic";

function splitBodyAtPositions(html: string): { first: string; second: string; third: string } {
  const tagPattern = /<(h[23]|p|pre|ul|ol|blockquote)[ >]/gi;
  const matches = [...html.matchAll(tagPattern)];
  const totalTags = matches.length;
  if (totalTags < 6) return { first: "", second: "", third: html };

  const firstSplit = Math.floor(totalTags / 3);
  const secondSplit = Math.floor((totalTags * 2) / 3);

  const firstIdx = matches[firstSplit]?.index ?? html.length;
  const secondIdx = matches[secondSplit]?.index ?? html.length;

  return {
    first: html.slice(0, firstIdx),
    second: html.slice(firstIdx, secondIdx),
    third: html.slice(secondIdx),
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const generated = await getGeneratedArticle(slug);

  if (!generated) notFound();

  const article = {
    slug: generated.slug,
    title: generated.title,
    category: generated.category,
    difficulty: generated.difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
    readTime: generated.read_time,
    xp: generated.xp,
    excerpt: generated.excerpt,
    tags: generated.tags ?? [],
    body: generated.body,
  };

  const chart = getChartForArticle(article.category, slug);
  const images = await getArticleImages(slug, article.category, article.tags, article.title);

  // Fetch affiliate products for this article
  let affiliateProducts: Array<{
    id: string;
    title: string;
    price?: string;
    imageUrl?: string;
    detailPageUrl: string;
    relevanceScore: number;
    reason: string;
  }> = [];
  if (isAnyProductSourceConfigured()) {
    try {
      const raw = await getProductsForArticle(slug, article.tags, article.category);
      affiliateProducts = raw.map((p, i) => ({
        id: p.id,
        title: p.title,
        price: p.price?.display,
        imageUrl: p.imageUrl,
        detailPageUrl: p.detailPageUrl,
        relevanceScore: Math.max(0.7 - i * 0.1, 0.4),
        reason: `Relevant to ${article.tags[0] ?? article.category}`,
      }));
    } catch {
      // Product fetch failure never blocks article rendering
    }
  }

  const sections = article.body ? splitBodyAtPositions(article.body) : null;

  return (
    <main className="subpage">
      <header className="site-header">
        <a className="brand" href="/">
          <Image className="brand-mark" src="/favicon.png" alt="Stratagem" width={26} height={26} />
          <span>STRATAGEM</span>
        </a>
        <a className="text-link" href="/vault">← Vault</a>
      </header>

      <article className="article-page">
        <div className="card-kicker">{article.category} / {article.difficulty} / +{article.xp} XP</div>
        <h1>{article.title}</h1>
        <p className="article-byline">by c. e. hirschauer</p>
        <p className="article-lede">{article.excerpt}</p>

        {images.hero && (
          <ArticleImage
            url={images.hero.url}
            alt={images.hero.alt}
            photographer={images.hero.photographer}
            photographerUrl={images.hero.photographerUrl}
            sourceUrl={images.hero.sourceUrl}
            className="article-hero"
            priority
          />
        )}

        {sections ? (
          <>
            <div className="article-content" dangerouslySetInnerHTML={{ __html: sections.first }} />

            <MermaidDiagram chart={chart.diagram} title={chart.title} id={slug} />

            <div className="article-content" dangerouslySetInnerHTML={{ __html: sections.second }} />

            {affiliateProducts.length > 0 ? (
              <ProductSidebar products={affiliateProducts.slice(0, 1)} articleSlug={slug} />
            ) : (
              <BookAd />
            )}

            <div className="article-content" dangerouslySetInnerHTML={{ __html: sections.third }} />

            {affiliateProducts.length > 1 && (
              <ProductBottom products={affiliateProducts.slice(1, 3)} articleSlug={slug} />
            )}
          </>
        ) : (
          <div className="article-body">
            <p>This article is pending research and generation. Content will appear here once the intelligence pipeline has collected sufficient sources.</p>
          </div>
        )}

        <ArticleFooter />
      </article>
    </main>
  );
}
