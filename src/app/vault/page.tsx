import Image from "next/image";
import { getAllPublishedArticles } from "@/lib/generated-articles";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vault — Stratagem" };

export default async function VaultPage() {
  const published = await getAllPublishedArticles();
  const allArticles = published.map(a => ({
    slug: a.slug,
    title: a.title,
    category: a.category,
    difficulty: a.difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
    readTime: a.read_time,
    xp: a.xp,
    excerpt: a.excerpt,
    tags: a.tags,
  }));

  return (
    <main className="subpage">
      <header className="site-header">
        <a className="brand" href="/"><Image className="brand-mark" src="/favicon.png" alt="Stratagem" width={26} height={26} /><span>STRATAGEM</span></a>
        <a className="text-link" href="/">← Home</a>
      </header>
      <section className="subpage-hero">
        <div className="card-kicker">KNOWLEDGE DATABASE / FIELD NOTES</div>
        <h1>THE<br /><em>VAULT.</em></h1>
        <p>Technical writing, missions, and useful rabbit holes from the archive.</p>
      </section>
      <section className="vault-page-list">
        {allArticles.length === 0 ? (
          <div style={{textAlign:"center",padding:"80px 0"}}>
            <div className="card-kicker">FORTHCOMING</div>
            <h2 style={{fontSize:"clamp(36px,5vw,60px)",fontWeight:500,letterSpacing:"-.07em",margin:"20px 0"}}>ARTICLES<br/><em>COMING SOON.</em></h2>
            <p style={{color:"var(--muted)",maxWidth:400,margin:"0 auto",lineHeight:1.5}}>No articles have been generated yet. Run the research pipeline to produce content.</p>
          </div>
        ) : (
          allArticles.map((article) => (
            <a className="note" href={`/vault/${article.slug}`} key={article.slug}>
              <span className="note-date">{article.category} / {article.difficulty}</span>
              <strong>{article.title}</strong>
              <span className="note-arrow">+{article.xp} XP ↗</span>
            </a>
          ))
        )}
      </section>
    </main>
  );
}
