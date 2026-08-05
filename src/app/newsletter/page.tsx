"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import episodes from "@/content/podcast.json";

type Episode = { number: string; title: string; date: string; duration: string; summary: string; transcript?: string };
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
  } | null;
  created_at: string;
};

const episodeList = episodes as Episode[];

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

  const verdictColor = (v?: string) => {
    if (v === "BUY") return "var(--acid)";
    if (v === "BUY WITH CONDITIONS") return "var(--orange)";
    if (v === "AVOID") return "#ff6b6b";
    return "var(--muted)";
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

      <section className="signal-page-grid">
        <div>
          <div className="card-kicker">LATEST ISSUE</div>
          {display ? (
            <article className="issue-card">
              <span>THE SIGNAL / {display.id}</span>
              <h2>{display.subject}</h2>
              {display.content?.subtitle && <p>{display.content.subtitle}</p>}
              {display.content?.estimatedReadTime && <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>{display.content.estimatedReadTime} / {display.content.difficulty}</p>}

              {display.content?.reviewProduct && (
                <div style={{ margin: "24px 0 0" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    <span style={{ color: "var(--orange)" }}>REVIEW</span>
                    <span style={{ color: "var(--paper)" }}>{display.content.reviewProduct}</span>
                    <span style={{ color: verdictColor(display.content.reviewVerdict), border: `1px solid ${verdictColor(display.content.reviewVerdict)}`, padding: "2px 8px", fontSize: 10 }}>
                      {display.content.reviewVerdict}
                    </span>
                  {(display.content.reviewScore ?? 0) > 0 && (
                    <span style={{ color: "var(--acid)" }}>{display.content.reviewScore}/10</span>
                    )}
                  </div>

                  {display.content.reviewImage && (
                    <div style={{ border: "1px solid var(--line)", overflow: "hidden", marginBottom: 20 }}>
                      <img
                        src={`https://images.pexels.com/photos/search/${encodeURIComponent(display.content.reviewImage)}/pexels-photo.jpeg?auto=compress&cs=tinysrgb&w=800`}
                        alt={display.content.reviewProduct}
                        style={{ width: "100%", height: "auto", display: "block", aspectRatio: "16/9", objectFit: "cover", filter: "brightness(.85)" }}
                        loading="lazy"
                      />
                    </div>
                  )}

                  {display.content.reviewSpecs && Object.keys(display.content.reviewSpecs).length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11, marginBottom: 20 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid var(--line)", color: "var(--orange)" }}>SPECS</th>
                          <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid var(--line)", color: "var(--muted)" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(display.content.reviewSpecs).map(([key, val]) => (
                          <tr key={key}>
                            <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>{key}</td>
                            <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--line)", color: "var(--paper)" }}>{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {display.content?.summary && <p>{display.content.summary}</p>}

              {display.content?.mainGuide && (
                <div className="newsletter-guide" dangerouslySetInnerHTML={{ __html: display.content.mainGuide }} />
              )}
            </article>
          ) : (
            <article className="issue-card">
              <span>THE SIGNAL / 001</span>
              <h2>Ideas for the technically curious.</h2>
              <p>Systems thinking, security notes, and useful things worth building.</p>
              <a className="text-link" href="/vault">Read the archive ↗</a>
            </article>
          )}
        </div>

        <div>
          <div className="card-kicker">SIGNAL ROOM / PODCAST</div>
          {episodeList.map((episode) => (
            <article className="episode-mini" key={episode.number}>
              <span>EP {episode.number}</span>
              <h2>{episode.title}</h2>
              <p>{episode.duration} / {episode.date}</p>
              <a href={`/podcast#ep-${episode.number}`}>Listen ↗</a>
            </article>
          ))}
        </div>
      </section>

      {active.length > 1 && (
        <section className="signal-page-grid">
          <div>
            <div className="card-kicker">PAST ISSUES</div>
            {active.slice(1).map((issue) => (
              <article
                className="issue-card"
                key={issue.id}
                style={{ cursor: "pointer", borderColor: selected?.id === issue.id ? "var(--acid)" : undefined }}
                onClick={() => setSelected(issue)}
              >
                <span>{issue.status} / {new Date(issue.created_at).toLocaleDateString()}</span>
                <h2>{issue.subject}</h2>
                {issue.content?.subtitle && <p>{issue.content.subtitle}</p>}
                {issue.content?.reviewProduct && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--orange)" }}>
                    REVIEW: {issue.content.reviewProduct} — {issue.content.reviewVerdict} {(issue.content.reviewScore ?? 0) > 0 ? `${issue.content.reviewScore}/10` : ""}
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
