"use client";
import { useEffect, useState } from "react";

type QueueItem = { id: string; kind: string; title: string; status: "NEEDS_REVIEW" | "APPROVED" | "SENT"; createdAt: string };
type ArticleGen = { id: string; topicCount: number; generatedAt: string; status: string; errors: string[] };
type State = {
  issue: { id: string; subject: string; subtitle?: string; topics: string[]; estimatedReadTime?: string; difficulty?: string } | null;
  queue: QueueItem[];
  timeline: string[];
  lastResearch: string | null;
  counts: { articles: number; projects: number; books: number };
  articleGenerations: ArticleGen[];
  researchRuns: number;
};

export default function ControlCenter() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      const response = await fetch("/api/control");
      const data = await response.json();
      if (!response.ok) {
        setError(typeof data === "object" ? JSON.stringify(data) : "Failed to load control state");
        setState(null);
        return;
      }
      setError("");
      setState(data);
    } catch (e: any) {
      setError(e.message || "Network error");
      setState(null);
    }
  };

  useEffect(() => { refresh(); }, []);

  const action = async (actionName: string, id?: string) => {
    setBusy(actionName);
    setError("");
    try {
      const response = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || `Action "${actionName}" failed`);
      } else {
        setState(data);
      }
    } catch (e: any) {
      setError(e.message || `Action "${actionName}" failed`);
    } finally {
      setBusy("");
    }
  };

  if (!state) return (
    <main className="control-page">
      <div className="auth-page">
        {error ? <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>{error}</pre> : "Loading command center..."}
      </div>
    </main>
  );

  return (
    <main className="control-page">
      <header className="site-header">
        <a className="brand" href="/"><img className="brand-mark" src="/favicon.png" alt="Stratagem" width="26" height="26" /><span>STRATAGEM</span></a>
        <span className="card-kicker">CONTROL CENTER / LIVE</span>
        <a className="text-link" href="/">Return to arcade ↗</a>
      </header>
      <div className="control-grid">
        <aside className="section-label"><span>ROOT</span><span>COMMAND<br />CENTER</span></aside>
        <section>
          <div className="control-heading">
            <div>
              <div className="card-kicker">OPERATIONS / RUNTIME STATE</div>
              <h1>RUN THE<br /><em>FORGE.</em></h1>
            </div>
            <span className="status-dot">● LOCAL CONTROL ACTIVE</span>
          </div>

          {error && (
            <div style={{ padding: "12px 16px", background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.3)", borderRadius: "8px", marginBottom: "20px", color: "#ff6b6b", fontFamily: "11px 'DM Mono'", whiteSpace: "pre-wrap" }}>
              {error}
            </div>
          )}

          <div className="metric-grid">
            <Metric label="ARTICLES" value={String(state.counts.articles)} detail={`${state.articleGenerations.length} generation runs`} />
            <Metric label="PROJECTS" value={String(state.counts.projects)} detail="LOCAL CONTENT" />
            <Metric label="BOOKS" value={String(state.counts.books)} detail="LOCAL CONTENT" />
            <Metric label="RESEARCH" value={String(state.researchRuns)} detail={state.lastResearch ? `Last: ${new Date(state.lastResearch).toLocaleDateString()}` : "NOT RUN YET"} />
          </div>

          <div className="control-actions">
            <button
              className="button button-primary"
              disabled={Boolean(busy)}
              onClick={() => action("research")}
            >
              {busy === "research" ? "⏳ Research running..." : "Run research →"}
            </button>
            <button
              className="button button-outline"
              disabled={Boolean(busy)}
              onClick={() => action("generate-articles")}
            >
              {busy === "generate-articles" ? "⏳ Generating 4 articles..." : "Generate 4 articles →"}
            </button>
            <button
              className="button button-outline"
              disabled={Boolean(busy)}
              onClick={() => action("generate")}
            >
              {busy === "generate" ? "⏳ Generating newsletter guide..." : "Generate newsletter guide →"}
            </button>
          </div>

          {state.issue && (
            <article className="control-panels" style={{ marginBottom: "20px" }}>
              <div>
                <div className="card-kicker">LATEST NEWSLETTER GUIDE</div>
                <h2 style={{ fontSize: "18px", marginBottom: "4px" }}>{state.issue.subject}</h2>
                {state.issue.subtitle && <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "8px" }}>{state.issue.subtitle}</p>}
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  {state.issue.difficulty && <span style={{ fontSize: "11px", fontFamily: "'DM Mono'", color: "var(--accent)" }}>{state.issue.difficulty}</span>}
                  {state.issue.estimatedReadTime && <span style={{ fontSize: "11px", fontFamily: "'DM Mono'", color: "var(--muted)" }}>{state.issue.estimatedReadTime}</span>}
                </div>
                <p style={{ fontSize: "13px", color: "var(--muted)" }}>{state.issue.topics.join(" / ")}</p>
                <button
                  className="button button-primary"
                  disabled={Boolean(busy)}
                  onClick={() => action("approve", state.issue?.id)}
                >
                  Approve guide →
                </button>
              </div>
            </article>
          )}

          {state.articleGenerations.length > 0 && (
            <div className="control-panels" style={{ marginBottom: "20px" }}>
              <article>
                <div className="card-kicker">RECENT ARTICLE GENERATIONS</div>
                {state.articleGenerations.slice(0, 3).map((gen) => (
                  <div className="pipeline-row" key={gen.id}>
                    <span style={{ color: gen.status === "COMPLETE" ? "var(--accent)" : "#ff6b6b" }}>
                      {gen.status === "COMPLETE" ? "✓" : "✗"}
                    </span>
                    <b>{gen.topicCount} articles generated</b>
                    <small style={{ color: "var(--muted)", fontSize: "10px" }}>
                      {new Date(gen.generatedAt).toLocaleString()}
                      {gen.errors.length > 0 && ` (${gen.errors.length} errors)`}
                    </small>
                  </div>
                ))}
              </article>
            </div>
          )}

          <div className="control-panels">
            <article>
              <div className="card-kicker">TIMELINE</div>
              {state.timeline.length === 0 && (
                <p style={{ color: "var(--muted)", font: "11px 'DM Mono'", marginTop: 20 }}>No activity yet</p>
              )}
              {state.timeline.slice(0, 10).map((entry, i) => (
                <div className="pipeline-row" key={i}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <b>{entry}</b>
                </div>
              ))}
            </article>
            <article>
              <div className="card-kicker">REVIEW QUEUE</div>
              {state.queue.length === 0 && (
                <p style={{ color: "var(--muted)", font: "11px 'DM Mono'", marginTop: 20 }}>No items in queue</p>
              )}
              {state.queue.map((item) => (
                <div className="queue-item" key={item.id}>
                  <span>{item.kind}</span>
                  <b>{item.title}</b>
                  {item.status === "NEEDS_REVIEW" && (
                    <button
                      className="queue-approve"
                      disabled={Boolean(busy)}
                      onClick={() => action("approve", item.id)}
                    >
                      APPROVE ↗
                    </button>
                  )}
                  {item.status === "APPROVED" && (
                    <span style={{ color: "var(--accent)", fontSize: "11px", fontFamily: "'DM Mono'" }}>APPROVED</span>
                  )}
                </div>
              ))}
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
