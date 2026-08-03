import { articles } from "@/lib/content";
import { getAllPublishedArticles } from "@/lib/generated-articles";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vault — Stratagem" };

export default async function VaultPage() {
  const published = await getAllPublishedArticles();
  const allArticles = [...articles, ...published.map(a => ({
    slug: a.slug,
    title: a.title,
    category: a.category,
    difficulty: a.difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
    readTime: a.read_time,
    xp: a.xp,
    excerpt: a.excerpt,
    tags: a.tags,
  }))];

  return (
    <main className="subpage">
      <header className="site-header">
        <a className="brand" href="/"><span className="brand-mark">N</span><span>STRATAGEM</span></a>
        <a className="text-link" href="/">← Home</a>
      </header>
      <section className="subpage-hero">
        <div className="card-kicker">KNOWLEDGE DATABASE / FIELD NOTES</div>
        <h1>THE<br /><em>VAULT.</em></h1>
        <p>Technical writing, missions, and useful rabbit holes from the archive.</p>
      </section>
      <section className="vault-page-list">
        {allArticles.map((article) => (
          <a className="note" href={`/vault/${article.slug}`} key={article.slug}>
            <span className="note-date">{article.category} / {article.difficulty}</span>
            <strong>{article.title}</strong>
            <span className="note-arrow">+{article.xp} XP ↗</span>
          </a>
        ))}
      </section>
    </main>
  );
}
