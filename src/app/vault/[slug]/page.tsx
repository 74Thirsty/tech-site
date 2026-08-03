import { articles } from "@/lib/content";
import { notFound } from "next/navigation";
import { getChartForArticle } from "@/lib/charts";
import { getArticleImages } from "@/lib/pexels";
import { getGeneratedArticle } from "@/lib/generated-articles";
import MermaidDiagram from "@/components/MermaidDiagram";
import ArticleImage from "@/components/ArticleImage";
import ArticleFooter from "@/components/ArticleFooter";

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
  let article = articles.find((item) => item.slug === slug);

  if (!article) {
    const generated = await getGeneratedArticle(slug);
    if (generated) {
      article = {
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
    }
  }

  if (!article) notFound();

  const chart = getChartForArticle(article.category, slug);
  const images = await getArticleImages(slug, article.category, article.tags, article.title);

  const sections = article.body ? splitBodyAtPositions(article.body) : null;

  return (
    <main className="subpage">
      <header className="site-header">
        <a className="brand" href="/">
          <span className="brand-mark">N</span>
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

            {images.mid && (
              <ArticleImage
                url={images.mid.url}
                alt={images.mid.alt}
                photographer={images.mid.photographer}
                photographerUrl={images.mid.photographerUrl}
                sourceUrl={images.mid.sourceUrl}
                className="article-mid-image"
              />
            )}

            <div className="article-content" dangerouslySetInnerHTML={{ __html: sections.third }} />
          </>
        ) : (
          <div className="article-body">
            <h2>WHY IT MATTERS</h2>
            <p>This field note is part of the Crystal // Forge archive. The full editorial and technical walkthrough will be published here as the knowledge base expands.</p>
            <h2>YOUR MOVE</h2>
            <p>Open a terminal, test one idea, and return with a sharper question.</p>
          </div>
        )}

        <ArticleFooter />
      </article>
    </main>
  );
}
