"use client";
import { useEffect, useState, useCallback, Component, type ReactNode } from "react";

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

type Tab = "queue" | "articles" | "newsletters" | "subscribers" | "system";

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

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (tab === "articles") fetchArticles();
    if (tab === "newsletters") fetchNewsletters();
    if (tab === "subscribers") fetchSubscribers();
  }, [tab, fetchArticles, fetchNewsletters, fetchSubscribers]);

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
          <img className="brand-mark" src="/favicon.png" alt="Stratagem" width="26" height="26" />
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
              {busy === "generate-articles" ? "Generating..." : "Generate 4 articles"}
            </button>
            <button className="button button-outline" disabled={Boolean(busy)} onClick={function () { runAction("generate"); }}>
              {busy === "generate" ? "Generating..." : "Generate newsletter guide"}
            </button>
          </div>

          <div className="control-tabs">
            <TabButton label="QUEUE" active={tab === "queue"} badge={pendingArticles.length} onClick={function () { setTab("queue"); }} />
            <TabButton label="ARTICLES" active={tab === "articles"} onClick={function () { setTab("articles"); }} />
            <TabButton label="NEWSLETTERS" active={tab === "newsletters"} onClick={function () { setTab("newsletters"); }} />
            <TabButton label="SUBSCRIBERS" active={tab === "subscribers"} badge={activeSubscriberCount} onClick={function () { setTab("subscribers"); }} />
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
}: {
  newsletters: NewsletterIssue[];
  loading: boolean;
  busy: string;
  onRefresh: () => void;
  onAction: (id: string, status: string | "DELETE") => void;
}) {
  return (
    <div className="control-tab-content">
      <div className="control-section">
        <div className="control-section-header">
          <div className="card-kicker">NEWSLETTER ISSUES</div>
          <button className="button button-outline button-sm" onClick={onRefresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="empty-state">Loading newsletters...</p>
        ) : newsletters.length === 0 ? (
          <p className="empty-state">No newsletter issues found. Generate one from the Queue tab.</p>
        ) : (
          <div className="content-list">
            {newsletters.map(function (issue) {
              const badgeClass = issue?.status === "APPROVED" || issue?.status === "SENT" ? "published" : "pending";
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
  return (
    <div className="control-tab-content">
      <div className="control-panels">
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
