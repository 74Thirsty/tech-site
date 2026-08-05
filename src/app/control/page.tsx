"use client";
import { useEffect, useState, useCallback, Component, type ReactNode } from "react";
import Image from "next/image";

class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

type ArticleStatus = "PENDING" | "PUBLISHED" | "REJECTED";

type StoredArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  read_time: string;
  xp: number;
  excerpt: string;
  tags: string[];
  status: ArticleStatus;
  generated_at: string;
  published_at: string | null;
};

type NewsletterIssue = {
  id: string;
  subject: string;
  status: string;
  content: { topics?: string[]; subtitle?: string; difficulty?: string; estimatedReadTime?: string } | null;
  created_at: string;
};

type QueueItem = { id: string; kind: string; title: string; status: "NEEDS_REVIEW" | "APPROVED" | "SENT"; createdAt: string };
type ArticleGen = { id: string; topicCount: number; generatedAt: string; status: string; errors: string[] };
type State = {
  issue: { id: string; subject: string; subtitle?: string; topics: string[]; estimatedReadTime?: string; difficulty?: string } | null;
  queue: QueueItem[];
  timeline: string[];
  lastResearch: string | null;
  counts: { articles: number; projects: number; books: number; pendingArticles: number; publishedArticles: number; newsletters: number; subscribers: number };
  articleGenerations: ArticleGen[];
  researchRuns: number;
};

type Subscriber = { email: string; source: string; created_at: string; status: string };

type ResearchArticle = {
  id: string; title: string; summary: string; url: string; publisher: string;
  published_at: string; keyword: string; source: string; fetched_at: string; sentiment?: number;
};

type ResearchGroup = {
  id: string; topic: string; keyword: string; summary: string; key_facts: string[];
  sources: string[]; importance: string; source_count: number; freshness_score: number;
};

type ResearchAnalysis = {
  id: string; group_external_id: string; what_happened: string; is_breaking: boolean;
  is_important: boolean; technical_significance: string; why_it_matters: string;
  key_entities: string[]; research_notes: string;
};

type ResearchData = {
  articles: ResearchArticle[];
  groups: ResearchGroup[];
  analyses: ResearchAnalysis[];
  stats: { totalArticles: number; totalGroups: number; totalAnalyses: number; sourcesBreakdown: Record<string, number>; keywordsBreakdown: Record<string, number> };
};

type Tab = "queue" | "articles" | "newsletters" | "subscribers" | "research" | "seo" | "system";

export default function ControlCenter() {
  return (
    <ErrorBoundary fallback={<main className="control-page"><div className="auth-page">Control center crashed — check console for details.</div></main>}>
      <ControlCenterInner />
    </ErrorBoundary>
  );
}

function ControlCenterInner() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("queue");

  const [articles, setArticles] = useState<StoredArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articleFilter, setArticleFilter] = useState<"ALL" | ArticleStatus>("ALL");

  const [newsletters, setNewsletters] = useState<NewsletterIssue[]>([]);
  const [newslettersLoading, setNewslettersLoading] = useState(false);

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscriberFilter, setSubscriberFilter] = useState<"ALL" | "active" | "unsubscribed">("ALL");

  const [research, setResearch] = useState<ResearchData | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [seoRankings, setSeoRankings] = useState<any[]>([]);
  const [seoLoading, setSeoLoading] = useState(false);

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

  const fetchArticles = useCallback(async () => {
    setArticlesLoading(true);
    try {
      const res = await fetch("/api/control/articles");
      const data = await res.json();
      setArticles(data.articles ?? []);
    } catch {
      setArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  }, []);

  const fetchNewsletters = useCallback(async () => {
    setNewslettersLoading(true);
    try {
      const res = await fetch("/api/control/newsletters");
      const data = await res.json();
      setNewsletters(data.issues ?? []);
    } catch {
      setNewsletters([]);
    } finally {
      setNewslettersLoading(false);
    }
  }, []);

  const fetchSubscribers = useCallback(async () => {
    setSubscribersLoading(true);
    try {
      const res = await fetch("/api/control/subscribers");
      const data = await res.json();
      setSubscribers(data.subscribers ?? []);
    } catch {
      setSubscribers([]);
    } finally {
      setSubscribersLoading(false);
    }
  }, []);

  const fetchResearch = useCallback(async () => {
    setResearchLoading(true);
    try {
      const res = await fetch("/api/control/research");
      const data = await res.json();
      setResearch(data);
    } catch {
      setResearch(null);
    } finally {
      setResearchLoading(false);
    }
  }, []);

  const fetchSeo = useCallback(async () => {
    setSeoLoading(true);
    try {
      const res = await fetch("/api/control/seo");
      const data = await res.json();
      setSeoRankings(data.rankings ?? []);
    } catch {
      setSeoRankings([]);
    } finally {
      setSeoLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (tab === "articles") fetchArticles();
    if (tab === "newsletters") fetchNewsletters();
    if (tab === "subscribers") fetchSubscribers();
    if (tab === "research") fetchResearch();
    if (tab === "seo") fetchSeo();
  }, [tab, fetchArticles, fetchNewsletters, fetchSubscribers, fetchResearch, fetchSeo]);

  const runAction = async (actionName: string, id?: string) => {
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
        setError(data.error || "Action failed");
      } else {
        setState(data);
      }
    } catch (e: any) {
      setError(e.message || "Action failed");
    } finally {
      setBusy("");
    }
  };

  const articleAction = async (id: string, newStatus: ArticleStatus | "DELETE") => {
    setBusy("article-" + id);
    setError("");
    try {
      if (newStatus === "DELETE") {
        const res = await fetch("/api/control/articles/" + id, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
      } else {
        const res = await fetch("/api/control/articles/" + id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Update failed");
      }
      fetchArticles();
      refresh();
    } catch (e: any) {
      setError(e.message || "Article action failed");
    } finally {
      setBusy("");
    }
  };

  const newsletterAction = async (id: string, newStatus: string | "DELETE") => {
    setBusy("newsletter-" + id);
    setError("");
    try {
      if (newStatus === "DELETE") {
        const res = await fetch("/api/control/newsletters/" + id, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
      } else {
        const res = await fetch("/api/control/newsletters/" + id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Update failed");
      }
      fetchNewsletters();
      refresh();
    } catch (e: any) {
      setError(e.message || "Newsletter action failed");
    } finally {
      setBusy("");
    }
  };

  const subscriberAction = async (email: string, newStatus: "active" | "unsubscribed" | "DELETE") => {
    setBusy("sub-" + email);
    setError("");
    try {
      if (newStatus === "DELETE") {
        const res = await fetch("/api/control/subscribers/" + encodeURIComponent(email), { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
      } else {
        const res = await fetch("/api/control/subscribers/" + encodeURIComponent(email), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Update failed");
      }
      fetchSubscribers();
    } catch (e: any) {
      setError(e.message || "Subscriber action failed");
    } finally {
      setBusy("");
    }
  };

  if (!state) {
    return (
      <main className="control-page">
        <div className="auth-page">
          {error ? <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>{error}</pre> : "Loading command center..."}
        </div>
      </main>
    );
  }

  const safeArticles = articles || [];
  const safeNewsletters = newsletters || [];
  const safeSubscribers = subscribers || [];
  const counts = state?.counts || { articles: 0, projects: 0, books: 0, pendingArticles: 0, publishedArticles: 0, newsletters: 0, subscribers: 0 };
  const pendingArticles = safeArticles.filter(function (a) { return (a?.status || "PUBLISHED") === "PENDING"; });
  const filteredArticles = articleFilter === "ALL" ? safeArticles : safeArticles.filter(function (a) { return (a?.status || "PUBLISHED") === articleFilter; });
  const activeSubscriberCount = safeSubscribers.filter(function (s) { return s?.status === "active"; }).length;
  const unsubscribedCount = safeSubscribers.filter(function (s) { return s?.status === "unsubscribed"; }).length;

  return (
    <main className="control-page">
      <header className="site-header">
        <a className="brand" href="/">
          <Image className="brand-mark" src="/favicon.png" alt="Stratagem" width={26} height={26} />
          <span>STRATAGEM</span>
        </a>
        <span className="card-kicker">CONTROL CENTER / LIVE</span>
        <a className="text-link" href="/">Return to arcade</a>
      </header>
      <div className="control-grid">
        <aside className="section-label">
          <span>ROOT</span>
          <span>COMMAND<br />CENTER</span>
        </aside>
        <section>
          <div className="control-heading">
            <div>
              <div className="card-kicker">OPERATIONS / RUNTIME STATE</div>
              <h1>RUN THE<br /><em>FORGE.</em></h1>
            </div>
            <span className="status-dot">LOCAL CONTROL ACTIVE</span>
          </div>

          {error && (
            <div className="control-error">{error}</div>
          )}

          <div className="metric-grid">
            <Metric label="PENDING" value={String(counts.pendingArticles)} detail="Awaiting approval" accent={counts.pendingArticles > 0} />
            <Metric label="PUBLISHED" value={String(counts.publishedArticles)} detail="Live in vault" />
            <Metric label="ARTICLES" value={String((counts.articles || 0) + (counts.publishedArticles || 0))} detail={(state?.articleGenerations?.length || 0) + " generation runs"} />
            <Metric label="NEWSLETTERS" value={String(counts.newsletters)} detail="Issues generated" />
            <Metric label="SUBSCRIBERS" value={String(counts.subscribers)} detail="Newsletter list" />
            <Metric label="PROJECTS" value={String(counts.projects)} detail="LOCAL CONTENT" />
            <Metric label="BOOKS" value={String(counts.books)} detail="LOCAL CONTENT" />
            <Metric label="RESEARCH" value={String(state?.researchRuns || 0)} detail={state?.lastResearch ? "Last: " + new Date(state.lastResearch).toLocaleDateString() : "NOT RUN YET"} />
          </div>

          <div className="control-actions">
            <button className="button button-primary" disabled={Boolean(busy)} onClick={function () { runAction("research"); }}>
              {busy === "research" ? "Running..." : "Run research"}
            </button>
            <button className="button button-outline" disabled={Boolean(busy)} onClick={function () { runAction("generate-articles"); }}>
              {busy === "generate-articles" ? "Generating..." : "Generate 1 article"}
            </button>
            <button className="button button-outline" disabled={Boolean(busy)} onClick={function () { runAction("generate-articles-batch"); }}>
              {busy === "generate-articles-batch" ? "Generating..." : "Generate 4 articles"}
            </button>
            <button className="button button-outline" disabled={Boolean(busy)} onClick={function () { runAction("generate"); }}>
              {busy === "generate" ? "Generating..." : "Generate newsletter guide"}
            </button>
          </div>

          <div className="control-tabs">
            <TabButton label="STATUS" active={tab === "queue"} onClick={function () { setTab("queue"); }} />
            <TabButton label="ARTICLES" active={tab === "articles"} onClick={function () { setTab("articles"); }} />
            <TabButton label="NEWSLETTERS" active={tab === "newsletters"} onClick={function () { setTab("newsletters"); }} />
            <TabButton label="SUBSCRIBERS" active={tab === "subscribers"} badge={activeSubscriberCount} onClick={function () { setTab("subscribers"); }} />
            <TabButton label="RESEARCH" active={tab === "research"} badge={research?.stats?.totalArticles || 0} onClick={function () { setTab("research"); }} />
            <TabButton label="SEO" active={tab === "seo"} onClick={function () { setTab("seo"); }} />
            <TabButton label="SYSTEM" active={tab === "system"} onClick={function () { setTab("system"); }} />
          </div>

          {tab === "queue" && (
            <QueueTab
              pendingArticles={pendingArticles}
              busy={busy}
              onApprove={function (id) { articleAction(id, "PUBLISHED"); }}
              onReject={function (id) { articleAction(id, "REJECTED"); }}
              onDelete={function (id) { articleAction(id, "DELETE"); }}
              issue={state?.issue ?? null}
              onApproveIssue={function (id) { runAction("approve", id); }}
              queue={state?.queue || []}
            />
          )}

          {tab === "articles" && (
            <ArticlesTab
              articles={filteredArticles}
              loading={articlesLoading}
              filter={articleFilter}
              busy={busy}
              onFilter={setArticleFilter}
              onRefresh={fetchArticles}
              onAction={articleAction}
              totalArticles={articles.length}
            />
          )}

          {tab === "newsletters" && (
            <NewslettersTab
              newsletters={newsletters}
              loading={newslettersLoading}
              busy={busy}
              onRefresh={fetchNewsletters}
              onAction={newsletterAction}
              onClearAll={async () => {
                setBusy("clear-newsletters");
                try {
                  await fetch("/api/control", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "clear-newsletters" }),
                  });
                  fetchNewsletters();
                } finally {
                  setBusy("");
                }
              }}
            />
          )}

          {tab === "subscribers" && (
            <SubscribersTab
              subscribers={subscribers}
              loading={subscribersLoading}
              busy={busy}
              filter={subscriberFilter}
              activeCount={activeSubscriberCount}
              unsubscribedCount={unsubscribedCount}
              onFilter={setSubscriberFilter}
              onRefresh={fetchSubscribers}
              onAction={subscriberAction}
            />
          )}

          {tab === "research" && (
            <ResearchTab data={research} loading={researchLoading} onRefresh={fetchResearch} />
          )}

          {tab === "seo" && (
            <SeoTab rankings={seoRankings} loading={seoLoading} onRefresh={fetchSeo} />
          )}

          {tab === "system" && (
            <SystemTab state={{
              articleGenerations: state?.articleGenerations || [],
              timeline: state?.timeline || [],
              researchRuns: state?.researchRuns || 0,
              lastResearch: state?.lastResearch || null,
            }} />
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <div className={accent ? "metric metric-accent" : "metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function TabButton({ label, active, badge, onClick }: { label: string; active: boolean; badge?: number; onClick: () => void }) {
  return (
    <button className={active ? "control-tab active" : "control-tab"} onClick={onClick}>
      {label}
      {typeof badge === "number" && badge > 0 && <span className="tab-badge">{badge}</span>}
    </button>
  );
}

function QueueTab({
  pendingArticles,
  busy,
  onApprove,
  onReject,
  onDelete,
  issue,
  onApproveIssue,
  queue,
}: {
  pendingArticles: StoredArticle[];
  busy: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  issue: State["issue"];
  onApproveIssue: (id: string) => void;
  queue: QueueItem[];
}) {
  return (
    <div className="control-tab-content">
      <div className="control-section">
        <div className="card-kicker">PENDING ARTICLES - AWAITING APPROVAL</div>
        {pendingArticles.length === 0 ? (
          <p className="empty-state">No pending articles. Generate some content first.</p>
        ) : (
          <div className="content-list">
            {pendingArticles.map(function (article) {
              return (
                <div className="content-item" key={article.id}>
                  <div className="content-item-main">
                    <div className="content-item-title">{article.title}</div>
                    <div className="content-item-meta">
                      <span className="status-badge pending">PENDING</span>
                      <span>{article.category}</span>
                      <span>{article.difficulty}</span>
                      <span>{article.read_time}</span>
                      <span>{"+" + article.xp + " XP"}</span>
                    </div>
                    <div className="content-item-excerpt">{article.excerpt}</div>
                    <div className="content-item-date">
                      Generated {article.generated_at ? new Date(article.generated_at).toLocaleString() : "unknown"}
                    </div>
                  </div>
                  <div className="content-item-actions">
                    <button className="button button-primary button-sm" disabled={Boolean(busy)} onClick={function () { onApprove(article.id); }}>APPROVE</button>
                    <button className="button button-outline button-sm" disabled={Boolean(busy)} onClick={function () { onReject(article.id); }}>REJECT</button>
                    <button className="button button-danger button-sm" disabled={Boolean(busy)} onClick={function () { onDelete(article.id); }}>DELETE</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {issue && (
        <div className="control-section">
          <div className="card-kicker">LATEST NEWSLETTER GUIDE</div>
          <div className="content-item">
            <div className="content-item-main">
              <div className="content-item-title">{issue.subject}</div>
              {issue.subtitle && <div className="content-item-excerpt">{issue.subtitle}</div>}
              <div className="content-item-meta">
                {issue.difficulty && <span>{issue.difficulty}</span>}
                {issue.estimatedReadTime && <span>{issue.estimatedReadTime}</span>}
                <span>{(issue.topics || []).join(" / ")}</span>
              </div>
            </div>
            <div className="content-item-actions">
              <button className="button button-primary button-sm" disabled={Boolean(busy)} onClick={function () { onApproveIssue(issue.id); }}>APPROVE</button>
            </div>
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div className="control-section">
          <div className="card-kicker">REVIEW QUEUE</div>
          <div className="content-list">
            {queue.map(function (item) {
              const badgeClass = item.status === "NEEDS_REVIEW" ? "pending" : item.status === "APPROVED" ? "published" : "rejected";
              return (
                <div className="content-item" key={item.id}>
                  <div className="content-item-main">
                    <div className="content-item-meta">
                      <span className={"status-badge " + badgeClass}>{item.status}</span>
                      <span>{item.kind}</span>
                    </div>
                    <div className="content-item-title">{item.title}</div>
                    <div className="content-item-date">{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ArticlesTab({
  articles,
  loading,
  filter,
  busy,
  onFilter,
  onRefresh,
  onAction,
  totalArticles,
}: {
  articles: StoredArticle[];
  loading: boolean;
  filter: "ALL" | ArticleStatus;
  busy: string;
  onFilter: (f: "ALL" | ArticleStatus) => void;
  onRefresh: () => void;
  onAction: (id: string, status: ArticleStatus | "DELETE") => void;
  totalArticles: number;
}) {
  const filters: Array<"ALL" | ArticleStatus> = ["ALL", "PENDING", "PUBLISHED", "REJECTED"];
  return (
    <div className="control-tab-content">
      <div className="control-section">
        <div className="control-section-header">
          <div className="card-kicker">ALL ARTICLES</div>
          <div className="filter-group">
            {filters.map(function (f) {
              const count = f === "ALL" ? totalArticles : articles.filter(function (a) { return (a.status || "PUBLISHED") === f; }).length;
              return (
                <button key={f} className={filter === f ? "filter-btn active" : "filter-btn"} onClick={function () { onFilter(f); }}>
                  {f + " (" + count + ")"}
                </button>
              );
            })}
          </div>
          <button className="button button-outline button-sm" onClick={onRefresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="empty-state">Loading articles...</p>
        ) : articles.length === 0 ? (
          <p className="empty-state">No articles found.</p>
        ) : (
          <div className="content-list">
            {articles.map(function (article) {
              const status = article?.status || "PUBLISHED";
              return (
                <div className="content-item" key={article?.id || Math.random()}>
                  <div className="content-item-main">
                    <div className="content-item-title">{article?.title || "Untitled"}</div>
                    <div className="content-item-meta">
                      <span className={"status-badge " + status.toLowerCase()}>{status}</span>
                      <span>{article?.category || ""}</span>
                      <span>{article?.difficulty || ""}</span>
                      <span>{article?.read_time || ""}</span>
                      <span>{"+" + (article?.xp || 0) + " XP"}</span>
                    </div>
                    <div className="content-item-excerpt">{article?.excerpt || ""}</div>
                    <div className="content-item-date">
                      {article?.generated_at && "Generated " + new Date(article.generated_at).toLocaleDateString()}
                      {article?.published_at && " | Published " + new Date(article.published_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="content-item-actions">
                    {status !== "PUBLISHED" && (
                      <button className="button button-primary button-sm" disabled={Boolean(busy)} onClick={function () { onAction(article.id, "PUBLISHED"); }}>PUBLISH</button>
                    )}
                    {status !== "REJECTED" && (
                      <button className="button button-outline button-sm" disabled={Boolean(busy)} onClick={function () { onAction(article.id, "REJECTED"); }}>REJECT</button>
                    )}
                    {status !== "PENDING" && (
                      <button className="button button-outline button-sm" disabled={Boolean(busy)} onClick={function () { onAction(article.id, "PENDING"); }}>UNPUBLISH</button>
                    )}
                    <button className="button button-danger button-sm" disabled={Boolean(busy)} onClick={function () { onAction(article.id, "DELETE"); }}>DELETE</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NewslettersTab({
  newsletters,
  loading,
  busy,
  onRefresh,
  onAction,
  onClearAll,
}: {
  newsletters: NewsletterIssue[];
  loading: boolean;
  busy: string;
  onRefresh: () => void;
  onAction: (id: string, status: string | "DELETE") => void;
  onClearAll: () => void;
}) {
  return (
    <div className="control-tab-content">
      <div className="control-section">
        <div className="control-section-header">
          <div className="card-kicker">NEWSLETTER ISSUES</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="button button-outline button-sm" onClick={onRefresh} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
            {newsletters.length > 0 && (
              <button className="button button-danger button-sm" disabled={Boolean(busy)} onClick={onClearAll}>
                CLEAR ALL
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Loading newsletters...</p>
        ) : newsletters.length === 0 ? (
          <p className="empty-state">No newsletter issues found. Generate one from the Queue tab.</p>
        ) : (
          <div className="content-list">
            {newsletters.map(function (issue) {
              const badgeClass = issue?.status === "APPROVED" || issue?.status === "SENT" ? "published" : issue?.status === "ARCHIVED" ? "rejected" : "pending";
              const content = issue?.content || {};
              return (
                <div className="content-item" key={issue?.id || Math.random()}>
                  <div className="content-item-main">
                    <div className="content-item-title">{issue?.subject || "Untitled"}</div>
                    <div className="content-item-meta">
                      <span className={"status-badge " + badgeClass}>{issue?.status || "DRAFT"}</span>
                      {content.topics && content.topics.length > 0 && <span>{content.topics.join(" / ")}</span>}
                      {content.difficulty && <span>{content.difficulty}</span>}
                      {content.estimatedReadTime && <span>{content.estimatedReadTime}</span>}
                    </div>
                    {content.subtitle && <div className="content-item-excerpt">{content.subtitle}</div>}
                  </div>
                  <div className="content-item-actions">
                    {issue?.status !== "APPROVED" && issue?.status !== "SENT" && (
                      <button className="button button-primary button-sm" disabled={Boolean(busy)} onClick={function () { onAction(issue.id, "APPROVED"); }}>APPROVE</button>
                    )}
                    {issue?.status !== "SENT" && (
                      <button className="button button-outline button-sm" disabled={Boolean(busy)} onClick={function () { onAction(issue.id, "SENT"); }}>MARK SENT</button>
                    )}
                    <button className="button button-danger button-sm" disabled={Boolean(busy)} onClick={function () { onAction(issue.id, "DELETE"); }}>DELETE</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SubscribersTab({
  subscribers,
  loading,
  busy,
  filter,
  activeCount,
  unsubscribedCount,
  onFilter,
  onRefresh,
  onAction,
}: {
  subscribers: Subscriber[];
  loading: boolean;
  busy: string;
  filter: "ALL" | "active" | "unsubscribed";
  activeCount: number;
  unsubscribedCount: number;
  onFilter: (f: "ALL" | "active" | "unsubscribed") => void;
  onRefresh: () => void;
  onAction: (email: string, status: "active" | "unsubscribed" | "DELETE") => void;
}) {
  const filtered = filter === "ALL" ? subscribers : subscribers.filter(function (s) { return s.status === filter; });
  return (
    <div className="control-tab-content">
      <div className="control-section">
        <div className="control-section-header">
          <div className="card-kicker">SUBSCRIBER LIST</div>
          <div className="filter-group">
            <button className={filter === "ALL" ? "filter-btn active" : "filter-btn"} onClick={function () { onFilter("ALL"); }}>ALL ({subscribers.length})</button>
            <button className={filter === "active" ? "filter-btn active" : "filter-btn"} onClick={function () { onFilter("active"); }}>ACTIVE ({activeCount})</button>
            <button className={filter === "unsubscribed" ? "filter-btn active" : "filter-btn"} onClick={function () { onFilter("unsubscribed"); }}>UNSUBSCRIBED ({unsubscribedCount})</button>
          </div>
          <button className="button button-outline button-sm" onClick={onRefresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="empty-state">Loading subscribers...</p>
        ) : subscribers.length === 0 ? (
          <p className="empty-state">No subscribers found.</p>
        ) : (
          <div className="content-list">
            {filtered.map(function (sub) {
              return (
                <div className="content-item" key={sub?.email || Math.random()}>
                  <div className="content-item-main">
                    <div className="content-item-title">{sub?.email || "unknown"}</div>
                    <div className="content-item-meta">
                      <span className={sub?.status === "active" ? "status-badge published" : "status-badge rejected"}>{sub?.status || "unknown"}</span>
                      <span>{sub?.source || ""}</span>
                      <span>{sub?.created_at ? new Date(sub.created_at).toLocaleDateString() : "unknown"}</span>
                    </div>
                  </div>
                  <div className="content-item-actions">
                    {sub?.status === "active" && (
                      <button className="button button-outline button-sm" disabled={Boolean(busy)} onClick={function () { onAction(sub.email, "unsubscribed"); }}>UNSUBSCRIBE</button>
                    )}
                    {sub?.status === "unsubscribed" && (
                      <button className="button button-primary button-sm" disabled={Boolean(busy)} onClick={function () { onAction(sub.email, "active"); }}>REACTIVATE</button>
                    )}
                    <button className="button button-danger button-sm" disabled={Boolean(busy)} onClick={function () { onAction(sub?.email || "", "DELETE"); }}>DELETE</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SystemTab({ state }: { state: { articleGenerations: ArticleGen[]; timeline: string[]; researchRuns: number; lastResearch: string | null } }) {
  const gens = state?.articleGenerations || [];
  const timeline = state?.timeline || [];
  const [puterReady, setPuterReady] = useState(false);
  const [puterUser, setPuterUser] = useState<string | null>(null);
  const [puterToken, setPuterToken] = useState<string | null>(null);
  const [puterBusy, setPuterBusy] = useState(false);
  const [puterError, setPuterError] = useState("");
  const [puterMsg, setPuterMsg] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.defer = true;
    script.onload = () => {
      const check = setInterval(() => {
        if ((window as any).puter?.ai?.chat) {
          setPuterReady(true);
          clearInterval(check);
          (window as any).puter.auth.getUser().then((u: any) => {
            if (u) setPuterUser(u.username || u.email || u.id || "signed in");
          }).catch(() => {});
        }
      }, 500);
    };
    document.head.appendChild(script);
  }, []);

  const puterSignIn = async () => {
    setPuterBusy(true);
    setPuterError("");
    setPuterMsg("");
    try {
      await (window as any).puter.auth.signIn();
      const user = await (window as any).puter.auth.getUser();
      setPuterUser(user?.username || user?.email || user?.id || "signed in");
      setPuterMsg("Signed in. Extracting token...");
      // Puter stores auth in localStorage - try common keys
      const keys = Object.keys(localStorage);
      const authKey = keys.find(k => k.toLowerCase().includes("auth") && k.toLowerCase().includes("token"))
        || keys.find(k => k.toLowerCase().includes("puter") && k.toLowerCase().includes("token"))
        || keys.find(k => k.startsWith("puter_"));
      if (authKey) {
        const val = localStorage.getItem(authKey);
        if (val) {
          setPuterToken(val);
          // Persist to .env.local
          fetch("/api/control/env", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: val }),
          }).then(() => setPuterMsg("Token extracted and saved to .env.local. Add PUTERJS_API_KEY to Vercel env vars."))
            .catch(() => setPuterMsg("Token extracted. Copy to .env.local as PUTERJS_API_KEY."));
        }
      }
      if (!puterToken) {
        setPuterMsg("Signed in. Token not found in localStorage. Go to puter.com/account → API Keys and paste manually below.");
      }
    } catch (e: any) {
      setPuterError(e?.message || "Sign in failed");
    } finally {
      setPuterBusy(false);
    }
  };

  const puterSignOut = async () => {
    try {
      await (window as any).puter.auth.signOut();
      setPuterUser(null);
      setPuterToken(null);
      setPuterMsg("Signed out.");
    } catch {}
  };

  const copyToken = () => {
    if (puterToken) {
      navigator.clipboard.writeText(puterToken);
      setPuterMsg("Token copied to clipboard.");
    }
  };

  return (
    <div className="control-tab-content">
      <div className="control-panels">
        <div className="control-section">
          <div className="card-kicker">AI PROVIDERS</div>
          <div className="content-item">
            <div className="content-item-main">
              <div className="content-item-title">Multi-Provider AI (Auto-Failover)</div>
              <div className="content-item-meta">
                <span className="status-badge published">OPENROUTER</span>
                <span className="status-badge published">GROQ</span>
                <span className="status-badge pending">PUTER</span>
                <span className="status-badge pending">GEMINI</span>
              </div>
              <div className="content-item-excerpt" style={{ marginTop: 8 }}>
                Tries OpenRouter → Groq → Puter → Gemini. First available wins. Get free keys at <a href="https://openrouter.ai" target="_blank" rel="noopener" style={{ color: "#7dd3a0" }}>openrouter.ai</a> and <a href="https://console.groq.com" target="_blank" rel="noopener" style={{ color: "#7dd3a0" }}>console.groq.com</a> (no credit card).
              </div>
            </div>
          </div>
        </div>

        <div className="control-section">
          <div className="card-kicker">PUTER.JS SIGN IN</div>
          <div className="content-item">
            <div className="content-item-main">
              <div className="content-item-meta">
                <span className={"status-badge " + (puterReady ? "published" : "pending")}>{puterReady ? "READY" : "LOADING"}</span>
                {puterUser && <span>User: {puterUser}</span>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button className="button button-primary button-sm" disabled={!puterReady || puterBusy} onClick={puterSignIn}>
                  {puterBusy ? "Signing in..." : puterUser ? "Re-sign in" : "Sign in with Puter"}
                </button>
                {puterUser && (
                  <button className="button button-outline button-sm" onClick={puterSignOut}>Sign out</button>
                )}
              </div>
              {puterError && <div style={{ color: "#ff6b6b", marginTop: 8, fontSize: 13 }}>{puterError}</div>}
              {puterMsg && <div style={{ color: "#7dd3a0", marginTop: 8, fontSize: 13 }}>{puterMsg}</div>}
              {puterToken && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>AUTH TOKEN (click to copy):</div>
                  <div onClick={copyToken} style={{ padding: "8px 12px", background: "#0a0e17", border: "1px solid rgba(138,180,248,0.2)", borderRadius: 8, fontFamily: "monospace", fontSize: 11, color: "#7dd3a0", cursor: "pointer", wordBreak: "break-all", maxHeight: 60, overflow: "auto" }}>
                    {puterToken}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="control-section">
          <div className="card-kicker">ARTICLE GENERATIONS</div>
          {gens.length === 0 ? (
            <p className="empty-state">No generation runs yet.</p>
          ) : (
            <div className="content-list">
              {gens.map(function (gen) {
                const badgeClass = gen?.status === "COMPLETE" ? "published" : "rejected";
                return (
                  <div className="content-item" key={gen?.id || Math.random()}>
                    <div className="content-item-main">
                      <div className="content-item-meta">
                        <span className={"status-badge " + badgeClass}>{gen?.status || "UNKNOWN"}</span>
                        <span>{gen?.topicCount || 0} articles</span>
                      </div>
                      <div className="content-item-date">
                        {gen?.generatedAt && new Date(gen.generatedAt).toLocaleString()}
                        {gen?.errors && gen.errors.length > 0 && " | " + gen.errors.length + " errors"}
                      </div>
                        {gen?.errors && gen.errors.length > 0 && (
                          <div className="content-item-excerpt" style={{ color: "#ff6b6b" }}>{gen.errors.join("; ")}</div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="control-section">
          <div className="card-kicker">ACTIVITY TIMELINE</div>
          {timeline.length === 0 ? (
            <p className="empty-state">No activity yet.</p>
          ) : (
            <div className="content-list">
              {timeline.slice(0, 20).map(function (entry, i) {
                return (
                  <div className="timeline-entry" key={i}>
                    <span className="timeline-number">{String(i + 1).padStart(2, "0")}</span>
                    <span>{entry}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResearchTab({ data, loading, onRefresh }: { data: ResearchData | null; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) {
    return <div className="control-tab-content"><p className="empty-state">Loading research data...</p></div>;
  }

  if (!data) {
    return <div className="control-tab-content"><p className="empty-state">Failed to load research data.</p></div>;
  }

  const stats = data.stats;
  const topSources = Object.entries(stats.sourcesBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topKeywords = Object.entries(stats.keywordsBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 15);

  return (
    <div className="control-tab-content">
      <div className="control-panels">
        <div className="control-section">
          <div className="control-section-header">
            <div className="card-kicker">RESEARCH STATS</div>
            <button className="button button-outline button-sm" disabled={loading} onClick={onRefresh}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="metric-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <Metric label="ARTICLES" value={String(stats.totalArticles)} detail="Raw research articles" />
            <Metric label="GROUPS" value={String(stats.totalGroups)} detail="Deduplicated topics" />
            <Metric label="ANALYSES" value={String(stats.totalAnalyses)} detail="AI-analyzed groups" />
          </div>
          {topSources.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>TOP SOURCES</div>
              {topSources.map(([source, count]) => (
                <div key={source} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11, borderBottom: "1px solid var(--line)" }}>
                  <span>{source}</span>
                  <span style={{ color: "var(--acid)" }}>{count}</span>
                </div>
              ))}
            </div>
          )}
          {topKeywords.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>TOP KEYWORDS</div>
              {topKeywords.map(([kw, count]) => (
                <div key={kw} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11, borderBottom: "1px solid var(--line)" }}>
                  <span>{kw}</span>
                  <span style={{ color: "var(--orange)" }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="control-section">
          <div className="card-kicker">RECENT RESEARCH ARTICLES</div>
          {data.articles.length === 0 ? (
            <p className="empty-state">No research articles yet. Run the research pipeline.</p>
          ) : (
            <div className="content-list" style={{ maxHeight: 500, overflow: "auto" }}>
              {data.articles.slice(0, 30).map((article) => (
                <div className="content-item" key={article.id}>
                  <div className="content-item-main">
                    <div className="content-item-title">
                      <a href={article.url} target="_blank" rel="noopener" style={{ color: "var(--acid)", textDecoration: "none" }}>
                        {article.title}
                      </a>
                    </div>
                    <div className="content-item-meta">
                      <span className="status-badge published">{article.source}</span>
                      <span>{article.publisher}</span>
                      <span>{article.keyword}</span>
                      {article.sentiment != null && <span style={{ color: article.sentiment > 0 ? "var(--acid)" : "#ff6b6b" }}>sentiment: {article.sentiment.toFixed(2)}</span>}
                    </div>
                    <div className="content-item-excerpt">{article.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.groups.length > 0 && (
        <div className="control-section" style={{ marginTop: 20 }}>
          <div className="card-kicker">RESEARCH GROUPS (DEDUPLICATED TOPICS)</div>
          <div className="content-list">
            {data.groups.map((group) => (
              <div className="content-item" key={group.id}>
                <div className="content-item-main">
                  <div className="content-item-title">{group.topic}</div>
                  <div className="content-item-meta">
                    <span className={"status-badge " + (group.importance === "CRITICAL" ? "rejected" : group.importance === "HIGH" ? "pending" : "published")}>
                      {group.importance}
                    </span>
                    <span>{group.source_count} sources</span>
                    <span>{group.keyword}</span>
                    <span>freshness: {group.freshness_score.toFixed(2)}</span>
                  </div>
                  <div className="content-item-excerpt">{group.summary}</div>
                  {group.key_facts.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                      <strong>Key facts:</strong> {group.key_facts.slice(0, 3).join(" | ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.analyses.length > 0 && (
        <div className="control-section" style={{ marginTop: 20 }}>
          <div className="card-kicker">AI ANALYSES</div>
          <div className="content-list">
            {data.analyses.map((analysis) => (
              <div className="content-item" key={analysis.id}>
                <div className="content-item-main">
                  <div className="content-item-meta">
                    {analysis.is_breaking && <span className="status-badge rejected">BREAKING</span>}
                    {analysis.is_important && <span className="status-badge pending">IMPORTANT</span>}
                  </div>
                  <div className="content-item-excerpt">{analysis.what_happened}</div>
                  {analysis.technical_significance && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
                      <strong>Technical significance:</strong> {analysis.technical_significance}
                    </div>
                  )}
                  {analysis.why_it_matters && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "var(--acid)" }}>
                      <strong>Why it matters:</strong> {analysis.why_it_matters}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeoTab({ rankings, loading, onRefresh }: { rankings: any[]; loading: boolean; onRefresh: () => void }) {
  const scoreColor = (s: number) => s >= 80 ? "var(--acid)" : s >= 60 ? "var(--orange)" : "#ff6b6b";

  return (
    <div className="control-tab-content">
      <div className="control-section">
        <div className="control-section-header">
          <div className="card-kicker">SEO RANKINGS</div>
          <button className="button button-outline button-sm" disabled={loading} onClick={onRefresh}>
            {loading ? "Analyzing..." : "Run SEO Analysis"}
          </button>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
          Articles ranked by SEO score (readability 30% + engagement 30% + keyword density 20% + meta description 20%)
        </p>

        {loading && rankings.length === 0 ? (
          <p className="empty-state">Running SEO analysis on all articles...</p>
        ) : rankings.length === 0 ? (
          <p className="empty-state">No articles to analyze. Generate articles first.</p>
        ) : (
          <div className="content-list">
            {rankings.map((r, i) => (
              <div className="content-item" key={r.id} style={{ alignItems: "flex-start" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 500, color: scoreColor(r.overallScore), minWidth: 40, textAlign: "center", paddingTop: 4 }}>
                  {i + 1}
                </div>
                <div className="content-item-main">
                  <div className="content-item-title">
                    <a href={`/vault/${r.slug}`} target="_blank" rel="noopener" style={{ color: "var(--acid)", textDecoration: "none" }}>
                      {r.title}
                    </a>
                  </div>
                  <div className="content-item-meta">
                    <span className={"status-badge " + (r.status === "PUBLISHED" ? "published" : "pending")}>{r.status}</span>
                    <span>{r.category}</span>
                    <span>{r.xp} XP</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 10, flexWrap: "wrap" }}>
                    <div>
                      <span style={{ color: "var(--muted)" }}>READABILITY </span>
                      <span style={{ color: scoreColor(r.readabilityScore) }}>{r.readabilityScore}/100</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>ENGAGEMENT </span>
                      <span style={{ color: scoreColor(r.engagementScore) }}>{r.engagementScore}/100</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>KEYWORDS </span>
                      <span style={{ color: Math.abs(r.keywordDensity - 2.5) < 1.5 ? "var(--acid)" : "var(--orange)" }}>{r.keywordDensity.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>OVERALL </span>
                      <span style={{ color: scoreColor(r.overallScore), fontSize: 12, fontWeight: 700 }}>{r.overallScore}/100</span>
                    </div>
                  </div>
                  {r.metaDescription && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
                      META: {r.metaDescription}
                    </div>
                  )}
                  {r.suggestedTitle && r.suggestedTitle !== r.title && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "var(--orange)" }}>
                      SUGGESTED: {r.suggestedTitle}
                    </div>
                  )}
                  {r.contentGaps.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 10, color: "var(--muted)" }}>
                      GAPS: {r.contentGaps.join(" | ")}
                    </div>
                  )}
                  {r.keywords.length > 0 && (
                    <div style={{ marginTop: 4, fontSize: 10, color: "var(--acid)" }}>
                      KW: {r.keywords.slice(0, 5).join(", ")}
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: scoreColor(r.overallScore), minWidth: 50, textAlign: "right" }}>
                  {r.overallScore}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
