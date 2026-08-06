"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import episodes from "@/content/podcast.json";

type Episode = { number: string; title: string; date: string; duration: string; summary: string; transcript?: string };
type SectionImage = { url: string; photographer: string; alt: string; placement: string };
type NewsletterIssue = {
  id: string;
  subject: string;
  status: string;
  content: {
    subtitle?: string;
    topics?: string[];
    estimatedReadTime?: string;
    difficulty?: string;
    learningObjectives?: string[];
    tableOfContents?: string[];
    summary?: string;
    mainGuide?: string;
    review?: string;
    reviewProduct?: string;
    reviewVerdict?: string;
    reviewScore?: number;
    reviewImage?: string;
    reviewSpecs?: Record<string, string>;
    heroImage?: { url: string; photographer: string; alt: string } | null;
    sectionImages?: SectionImage[];
  } | null;
  created_at: string;
};

const episodeList = episodes as Episode[];

function HeroBanner({ image, subject }: { image: { url: string; photographer: string; alt: string } | null | undefined; subject: string }) {
  if (!image?.url) return null;
  return (
    <div className="newsletter-hero">
      <Image src={image.url} alt={image.alt} fill style={{objectFit:"cover"}} />
      <div className="newsletter-hero-overlay">
        <span>{subject}</span>
      </div>
    </div>
  );
}

function SpecTable({ specs }: { specs: Record<string, string> }) {
  if (!specs || Object.keys(specs).length === 0) return null;
  return (
    <div className="newsletter-specs">
      <div className="newsletter-specs-title">SPECIFICATIONS</div>
      <table>
        <tbody>
          {Object.entries(specs).map(([key, val]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewCard({ content }: { content: NewsletterIssue["content"] }) {
  if (!content?.reviewProduct) return null;
  const verdictColor = (v?: string) => {
    if (v === "BUY") return "var(--acid)";
    if (v === "BUY WITH CONDITIONS") return "var(--orange)";
    if (v === "AVOID") return "#ff6b6b";
    return "var(--muted)";
  };
  return (
    <div className="newsletter-review-card">
      <div className="newsletter-review-header">
        <div className="card-kicker">PRODUCT REVIEW</div>
        <h2>{content.reviewProduct}</h2>
        <div className="newsletter-review-meta">
          <span className="newsletter-verdict" style={{ color: verdictColor(content.reviewVerdict), borderColor: verdictColor(content.reviewVerdict) }}>
            {content.reviewVerdict}
          </span>
          {(content.reviewScore ?? 0) > 0 && (
            <span className="newsletter-score">{content.reviewScore}/10</span>
          )}
        </div>
      </div>
      {content.reviewImage && (
        <figure className="newsletter-figure">
          <Image src={content.reviewImage} alt={content.reviewProduct || ""} fill style={{objectFit:"cover"}} loading="lazy" />
        </figure>
      )}
      <SpecTable specs={content.reviewSpecs || {}} />
    </div>
  );
}

function TableOfContents({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="newsletter-toc">
      <div className="card-kicker">CONTENTS</div>
      <ol>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ol>
    </div>
  );
}

export default function SignalPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [newsletters, setNewsletters] = useState<NewsletterIssue[]>([]);
  const [selected, setSelected] = useState<NewsletterIssue | null>(null);

  useEffect(() => {
    fetch("/api/control/newsletters")
      .then(r => r.json())
      .then(d => setNewsletters(d.issues ?? []))
      .catch(() => {});
  }, []);

  const active = newsletters.filter(n => n.status !== "ARCHIVED");
  const published = active.filter(n => n.status === "APPROVED" || n.status === "SENT");
  const display = selected || published[0] || active[0];

  const insertSectionImages = (html: string, images: SectionImage[]) => {
    if (!images.length) return html;
    const sections = html.split(/<hr[^>]*>/i);
    if (sections.length <= 1) return html;
    const result: string[] = [];
    sections.forEach((section, i) => {
      result.push(section);
      const img = images[i] || images.find(img => img.placement.includes(`section-${i}`));
      if (img?.url) {
        result.push(`<figure class="newsletter-figure"><img src="${img.url}" alt="${img.alt}" loading="lazy" /><figcaption>Photo: ${img.photographer} / Pexels</figcaption></figure>`);
      }
    });
    return result.join("<hr>");
  };

  return (
    <main className="subpage">
      <header className="site-header">
        <a className="brand" href="/">
          <Image className="brand-mark" src="/favicon.png" alt="Stratagem" width={26} height={26} />
          <span>STRATAGEM</span>
        </a>
        <nav className="desktop-nav">
          <a href="/newsletter">NEWSLETTER</a>
          <a href="/podcast">PODCAST</a>
        </nav>
        <a className="text-link" href="/">← Home</a>
      </header>

      <section className="subpage-hero">
        <div className="card-kicker">THE SIGNAL / NEWSLETTER + PODCAST</div>
        <h1>GOOD SIGNAL<br /><em>INBOXED.</em></h1>
        <p>One concise dispatch every Sunday, plus long-form conversations from the Signal Room.</p>
        <form className="signal-signup" onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const email = new FormData(event.currentTarget).get("email");
          const response = await fetch("/api/newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const result = await response.json();
          if (!response.ok) { setError(result.error ?? "Transmission failed."); return; }
          setSent(true);
        }}>
          <input name="email" type="email" placeholder="you@somewhere.com" required />
          <button className="button button-primary">{sent ? "TRANSMISSION QUEUED ✓" : "Subscribe →"}</button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>

      {display ? (
        <section className="newsletter-content">
          <article className="newsletter-issue">
            <HeroBanner image={display.content?.heroImage} subject={display.subject} />

            <div className="newsletter-issue-header">
              <span className="newsletter-issue-id">THE SIGNAL / {display.id}</span>
              <h2>{display.subject}</h2>
              {display.content?.subtitle && <p className="newsletter-subtitle">{display.content.subtitle}</p>}
              <div className="newsletter-issue-meta">
                {display.content?.estimatedReadTime && <span>{display.content.estimatedReadTime}</span>}
                {display.content?.difficulty && <span>{display.content.difficulty}</span>}
                {display.content?.topics && display.content.topics.length > 0 && (
                  <span>{display.content.topics.join(" / ")}</span>
                )}
              </div>
            </div>

            <TableOfContents items={display.content?.tableOfContents || []} />

            <ReviewCard content={display.content} />

            {display.content?.mainGuide && (
              <div
                className="newsletter-guide"
                dangerouslySetInnerHTML={{ __html: insertSectionImages(display.content.mainGuide, display.content.sectionImages || []) }}
              />
            )}
          </article>
        </section>
      ) : (
        <section className="newsletter-content">
          <article className="issue-card">
            <span>THE SIGNAL / 001</span>
            <h2>Ideas for the technically curious.</h2>
            <p>Systems thinking, security notes, and useful things worth building.</p>
            <a className="text-link" href="/vault">Read the archive ↗</a>
          </article>
        </section>
      )}

      <section className="newsletter-bottom">
        <div className="newsletter-bottom-grid">
          <div>
            <div className="card-kicker">SIGNAL ROOM / PODCAST</div>
            {episodeList.slice(0, 4).map((episode) => (
              <article className="episode-mini" key={episode.number}>
                <span>EP {episode.number}</span>
                <h2>{episode.title}</h2>
                <p>{episode.duration} / {episode.date}</p>
                <a href={`/podcast#ep-${episode.number}`}>Listen ↗</a>
              </article>
            ))}
          </div>

          {active.length > 1 && (
            <div>
              <div className="card-kicker">PAST ISSUES</div>
              <div className="newsletter-archive-grid">
                {active.slice(1).map((issue) => (
                  <article
                    className="newsletter-archive-card"
                    key={issue.id}
                    onClick={() => setSelected(issue)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(issue)}
                    tabIndex={0}
                    role="button"
                  >
                    <span className="newsletter-archive-status">{issue.status}</span>
                    <h3>{issue.subject}</h3>
                    {issue.content?.subtitle && <p>{issue.content.subtitle}</p>}
                    <div className="newsletter-archive-meta">
                      {issue.content?.reviewProduct && <span>REVIEW: {issue.content.reviewProduct}</span>}
                      {issue.content?.reviewVerdict && <span>{issue.content.reviewVerdict}</span>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
