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

type Tab = "queue" | "articles" | "newsletters" | "subscribers" | "research" | "seo" | "affiliate" | "system";

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
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliateSubTab, setAffiliateSubTab] = useState<"programs" | "products" | "analytics" | "insights">("programs");

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

  const fetchAffiliate = useCallback(async () => {
    setAffiliateLoading(true);
    try {
      const res = await fetch("/api/control/affiliate");
      const data = await res.json();
      setAffiliateData(data);
    } catch {
      setAffiliateData(null);
    } finally {
      setAffiliateLoading(false);
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
    if (tab === "affiliate") fetchAffiliate();
  }, [tab, fetchArticles, fetchNewsletters, fetchSubscribers, fetchResearch, fetchSeo, fetchAffiliate]);

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
            <TabButton label="AFFILIATE" active={tab === "affiliate"} onClick={function () { setTab("affiliate"); }} />
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

          {tab === "affiliate" && (
            <AffiliateTab
              data={affiliateData}
              loading={affiliateLoading}
              subTab={affiliateSubTab}
              onSubTab={setAffiliateSubTab}
              onRefresh={fetchAffiliate}
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
  onClearAll,
}: {
  newsletters: NewsletterIssue[];
  loading: boolean;
  busy: string;
  onRefresh: () => void;
  onAction: (id: string, status: string | "DELETE") => void;
  onClearAll: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
              const content = (issue?.content || {}) as any;
              const researchItems = content.researchItems || [];
              const isExpanded = expandedId === issue?.id;
              return (
                <div className="content-item" key={issue?.id || Math.random()} style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="content-item-main">
                      <div className="content-item-title">{issue?.subject || "Untitled"}</div>
                      <div className="content-item-meta">
                        <span className={"status-badge " + badgeClass}>{issue?.status || "DRAFT"}</span>
                        {content.topics && content.topics.length > 0 && <span>{content.topics.join(" / ")}</span>}
                        {content.difficulty && <span>{content.difficulty}</span>}
                        {content.estimatedReadTime && <span>{content.estimatedReadTime}</span>}
                        {researchItems.length > 0 && (
                          <button
                            className="button button-outline button-sm"
                            style={{ marginLeft: 8, padding: "2px 8px", fontSize: 10 }}
                            onClick={() => setExpandedId(isExpanded ? null : (issue?.id || null))}
                          >
                            {isExpanded ? "HIDE RESEARCH" : `RESEARCH (${researchItems.length})`}
                          </button>
                        )}
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
                  {isExpanded && researchItems.length > 0 && (
                    <div style={{ marginTop: 12, padding: "12px 0", borderTop: "1px solid var(--line)" }}>
                      <div className="card-kicker" style={{ marginBottom: 8 }}>RESEARCH SOURCES USED FOR THIS GUIDE</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {researchItems.map((item: any, i: number) => (
                          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 12px", background: "#151512", borderLeft: "3px solid var(--acid)", fontSize: 11 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: 4 }}>
                                <a href={item.url} target="_blank" rel="noopener" style={{ color: "var(--acid)", textDecoration: "none", fontWeight: 500 }}>
                                  {item.title}
                                </a>
                              </div>
                              <div style={{ color: "var(--muted)", lineHeight: 1.4 }}>{item.summary}</div>
                              <div style={{ display: "flex", gap: 8, marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 9 }}>
                                <span className="status-badge published">{item.source}</span>
                                {item.topics?.map((t: string, j: number) => (
                                  <span key={j} style={{ color: "var(--orange)" }}>{t}</span>
                                ))}
                                {item.publishedAt && <span style={{ color: "var(--muted)" }}>{new Date(item.publishedAt).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
  const [subTab, setSubTab] = useState<"articles" | "groups" | "analyses" | "sources">("articles");
  const [sourceFilter, setSourceFilter] = useState("");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [importanceFilter, setImportanceFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  if (loading && !data) {
    return <div className="control-tab-content"><p className="empty-state">Loading research data...</p></div>;
  }
  if (!data) {
    return <div className="control-tab-content"><p className="empty-state">Failed to load research data.</p></div>;
  }

  const stats = data.stats;
  const topSources = Object.entries(stats.sourcesBreakdown).sort((a, b) => b[1] - a[1]);
  const topKeywords = Object.entries(stats.keywordsBreakdown).sort((a, b) => b[1] - a[1]);
  const maxSourceCount = topSources.length > 0 ? topSources[0][1] : 1;

  const filteredArticles = data.articles.filter(a => {
    if (sourceFilter && a.source !== sourceFilter) return false;
    if (keywordFilter && a.keyword !== keywordFilter) return false;
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase()) && !a.summary.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredGroups = data.groups.filter(g => {
    if (importanceFilter && g.importance !== importanceFilter) return false;
    if (keywordFilter && g.keyword !== keywordFilter) return false;
    if (searchQuery && !g.topic.toLowerCase().includes(searchQuery.toLowerCase()) && !g.summary.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredAnalyses = data.analyses.filter(a => {
    if (searchQuery && !a.what_happened?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const sentimentColor = (s: number | undefined) => {
    if (s == null) return "var(--muted)";
    return s > 0.2 ? "var(--acid)" : s < -0.2 ? "#ff6b6b" : "var(--orange)";
  };

  const importanceBadge = (imp: string) => {
    if (imp === "CRITICAL") return "rejected";
    if (imp === "HIGH") return "pending";
    return "published";
  };

  const subTabs = [
    { key: "articles" as const, label: "ARTICLES", count: filteredArticles.length },
    { key: "groups" as const, label: "GROUPS", count: filteredGroups.length },
    { key: "analyses" as const, label: "ANALYSES", count: filteredAnalyses.length },
    { key: "sources" as const, label: "SOURCES", count: topSources.length },
  ];

  return (
    <div className="control-tab-content">
      <div className="control-section">
        <div className="control-section-header">
          <div className="card-kicker">INTELLIGENCE PIPELINE</div>
          <button className="button button-outline button-sm" disabled={loading} onClick={onRefresh}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="metric-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <Metric label="ARTICLES" value={String(stats.totalArticles)} detail="Raw signals" accent />
          <Metric label="GROUPS" value={String(stats.totalGroups)} detail="Deduplicated topics" />
          <Metric label="ANALYSES" value={String(stats.totalAnalyses)} detail="AI-analyzed" />
          <Metric label="SOURCES" value={String(topSources.length)} detail="Active feeds" />
        </div>

        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line)", marginTop: 24 }}>
          {subTabs.map(st => (
            <button key={st.key} className="control-tab" style={{ borderBottom: subTab === st.key ? "2px solid var(--acid)" : undefined, color: subTab === st.key ? "var(--acid)" : undefined }} onClick={() => setSubTab(st.key)}>
              {st.label}{st.count > 0 && <span className="tab-badge" style={{ marginLeft: 6 }}>{st.count}</span>}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <input className="control-input" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ maxWidth: 250 }} />
          {subTab === "articles" && (
            <>
              <select className="control-input" style={{ maxWidth: 160 }} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                <option value="">All sources</option>
                {topSources.map(([s]) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="control-input" style={{ maxWidth: 160 }} value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)}>
                <option value="">All keywords</option>
                {topKeywords.map(([k]) => <option key={k} value={k}>{k}</option>)}
              </select>
            </>
          )}
          {subTab === "groups" && (
            <>
              <select className="control-input" style={{ maxWidth: 160 }} value={importanceFilter} onChange={e => setImportanceFilter(e.target.value)}>
                <option value="">All importance</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
              <select className="control-input" style={{ maxWidth: 160 }} value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)}>
                <option value="">All keywords</option>
                {topKeywords.map(([k]) => <option key={k} value={k}>{k}</option>)}
              </select>
            </>
          )}
          {(sourceFilter || keywordFilter || importanceFilter || searchQuery) && (
            <button className="button button-outline button-sm" onClick={() => { setSourceFilter(""); setKeywordFilter(""); setImportanceFilter(""); setSearchQuery(""); }}>Clear</button>
          )}
        </div>
      </div>

      {subTab === "articles" && (
        <div className="control-section" style={{ marginTop: 16 }}>
          {filteredArticles.length === 0 ? (
            <p className="empty-state">No articles match your filters.</p>
          ) : (
            <div className="content-list">
              {filteredArticles.slice(0, 50).map((article) => (
                <div className="content-item" key={article.id} style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 50, textAlign: "center", paddingTop: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: sentimentColor(article.sentiment), margin: "0 auto 4px" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>{article.sentiment != null ? article.sentiment.toFixed(1) : "—"}</span>
                  </div>
                  <div className="content-item-main">
                    <div className="content-item-title">
                      <a href={article.url} target="_blank" rel="noopener" style={{ color: "var(--acid)", textDecoration: "none" }}>
                        {article.title}
                      </a>
                    </div>
                    <div className="content-item-meta">
                      <span className="status-badge published">{article.source}</span>
                      <span style={{ color: "var(--orange)" }}>{article.keyword}</span>
                      <span>{article.publisher}</span>
                    </div>
                    <div className="content-item-excerpt">{article.summary}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {article.published_at ? new Date(article.published_at).toLocaleDateString() : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "groups" && (
        <div className="control-section" style={{ marginTop: 16 }}>
          {filteredGroups.length === 0 ? (
            <p className="empty-state">No groups match your filters.</p>
          ) : (
            <div className="content-list">
              {filteredGroups.map((group) => (
                <div className="content-item" key={group.id} style={{ alignItems: "flex-start", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="content-item-main">
                      <div className="content-item-title">{group.topic}</div>
                      <div className="content-item-meta">
                        <span className={"status-badge " + importanceBadge(group.importance)}>{group.importance}</span>
                        <span style={{ color: "var(--orange)" }}>{group.keyword}</span>
                        <span>{group.source_count} sources</span>
                        <span style={{ color: group.freshness_score > 0.7 ? "var(--acid)" : "var(--muted)" }}>freshness {group.freshness_score.toFixed(2)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div style={{ width: 60, height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${group.freshness_score * 100}%`, height: "100%", background: group.freshness_score > 0.7 ? "var(--acid)" : "var(--orange)", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>{group.source_count}</span>
                    </div>
                  </div>
                  <div className="content-item-excerpt">{group.summary}</div>
                  {group.key_facts.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {group.key_facts.slice(0, 4).map((fact, i) => (
                        <span key={i} style={{ font: "9px 'DM Mono'", color: "var(--paper)", background: "var(--ink)", border: "1px solid var(--line)", padding: "3px 8px", borderRadius: 2 }}>{fact}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "analyses" && (
        <div className="control-section" style={{ marginTop: 16 }}>
          {filteredAnalyses.length === 0 ? (
            <p className="empty-state">No analyses yet.</p>
          ) : (
            <div className="content-list">
              {filteredAnalyses.map((analysis) => (
                <div className="content-item" key={analysis.id} style={{ alignItems: "flex-start", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {analysis.is_breaking && <span className="status-badge rejected">BREAKING</span>}
                    {analysis.is_important && <span className="status-badge pending">IMPORTANT</span>}
                  </div>
                  <div className="content-item-excerpt" style={{ fontSize: 13, lineHeight: 1.5 }}>{analysis.what_happened}</div>
                  {analysis.technical_significance && (
                    <div style={{ fontSize: 11, color: "var(--muted)", padding: "8px 12px", background: "#151512", borderLeft: "3px solid var(--line)" }}>
                      <strong style={{ color: "var(--paper)" }}>TECHNICAL:</strong> {analysis.technical_significance}
                    </div>
                  )}
                  {analysis.why_it_matters && (
                    <div style={{ fontSize: 11, color: "var(--acid)", padding: "8px 12px", background: "#151512", borderLeft: "3px solid var(--acid)" }}>
                      <strong>WHY IT MATTERS:</strong> {analysis.why_it_matters}
                    </div>
                  )}
                  {analysis.key_entities && analysis.key_entities.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {analysis.key_entities.map((e, i) => (
                        <span key={i} style={{ font: "9px 'DM Mono'", color: "var(--orange)", border: "1px solid var(--orange)", padding: "2px 6px", borderRadius: 2 }}>{e}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "sources" && (
        <div className="control-section" style={{ marginTop: 16 }}>
          <div className="content-list">
            {topSources.map(([source, count]) => (
              <div key={source} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--paper)", minWidth: 140 }}>{source}</span>
                <div style={{ flex: 1, height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(count / maxSourceCount) * 100}%`, height: "100%", background: "var(--acid)", borderRadius: 4, transition: "width .3s" }} />
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--acid)", minWidth: 40, textAlign: "right" }}>{count}</span>
              </div>
            ))}
          </div>
          {topKeywords.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="card-kicker" style={{ marginBottom: 12 }}>KEYWORD CLOUD</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {topKeywords.map(([kw, count]) => {
                  const size = Math.max(10, Math.min(18, 10 + (count / topKeywords[0][1]) * 8));
                  return (
                    <span key={kw} style={{ fontFamily: "var(--font-mono)", fontSize: size, color: count > topKeywords[0][1] * 0.6 ? "var(--acid)" : "var(--muted)", cursor: "pointer", padding: "2px 4px" }} onClick={() => { setKeywordFilter(kw); setSubTab("articles"); }}>
                      {kw}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
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

function AffiliateTab({ data, loading, subTab, onSubTab, onRefresh }: {
  data: any;
  loading: boolean;
  subTab: "programs" | "products" | "analytics" | "insights";
  onSubTab: (t: "programs" | "products" | "analytics" | "insights") => void;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState<Record<string, any>>({});

  const programs = data?.programs ?? [];
  const products = data?.products ?? [];
  const stats = data?.stats ?? null;
  const insights = data?.insights ?? [];

  const api = async (action: string, body: any = {}) => {
    setBusy(action);
    try {
      await fetch("/api/control/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      onRefresh();
    } finally { setBusy(""); }
  };

  const runInsights = async () => {
    setBusy("insights");
    try {
      await fetch("/api/control/affiliate/insights", { method: "POST" });
      onRefresh();
    } finally { setBusy(""); }
  };

  const subTabs = [
    { key: "programs" as const, label: "PROGRAMS", count: programs.length },
    { key: "products" as const, label: "PRODUCTS", count: products.length },
    { key: "analytics" as const, label: "ANALYTICS", count: stats?.totalClicks || 0 },
    { key: "insights" as const, label: "AI INSIGHTS", count: insights.length },
  ];

  return (
    <div className="control-tab-content">
      <div className="control-section">
        <div className="control-section-header">
          <div className="card-kicker">AFFILIATE INTELLIGENCE</div>
          <button className="button button-outline button-sm" disabled={loading} onClick={onRefresh}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line)", marginBottom: 20 }}>
          {subTabs.map(st => (
            <button key={st.key} className="control-tab" style={{ borderBottom: subTab === st.key ? "2px solid var(--acid)" : undefined, color: subTab === st.key ? "var(--acid)" : undefined }} onClick={() => onSubTab(st.key)}>
              {st.label}{st.count > 0 && <span className="tab-badge" style={{ marginLeft: 6 }}>{st.count}</span>}
            </button>
          ))}
        </div>

        {subTab === "programs" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input className="control-input" placeholder="Program name" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} style={{ flex: 1 }} />
              <input className="control-input" placeholder="Network (e.g. Amazon, ShareASale)" value={form.network || ""} onChange={e => setForm({ ...form, network: e.target.value })} style={{ flex: 1 }} />
              <input className="control-input" placeholder="Affiliate ID" value={form.affiliate_id || ""} onChange={e => setForm({ ...form, affiliate_id: e.target.value })} style={{ flex: 1 }} />
              <button className="button button-primary button-sm" disabled={busy === "add-program" || !form.name} onClick={() => { api("add-program", { program: { ...form, commission_type: "percentage", commission_rate: "5%", cookie_days: 30, enabled: true, base_url: "", } }); setForm({}); }}>
                {busy === "add-program" ? "Adding..." : "Add"}
              </button>
            </div>
            {programs.length === 0 ? (
              <p className="empty-state">No affiliate programs configured. Add one above.</p>
            ) : (
              <div className="content-list">
                {programs.map((p: any) => (
                  <div className="content-item" key={p.id}>
                    <div className="content-item-main">
                      <div className="content-item-title">{p.name}</div>
                      <div className="content-item-meta">
                        <span className={"status-badge " + (p.enabled ? "published" : "rejected")}>{p.enabled ? "ACTIVE" : "DISABLED"}</span>
                        <span>{p.network}</span>
                        <span>ID: {p.affiliate_id}</span>
                        <span>{p.commission_rate}</span>
                        <span>{p.cookie_days}d cookie</span>
                      </div>
                    </div>
                    <div className="content-item-actions">
                      <button className="button button-outline button-sm" disabled={!!busy} onClick={() => api("update-program", { id: p.id, updates: { enabled: !p.enabled } })}>
                        {p.enabled ? "Disable" : "Enable"}
                      </button>
                      <button className="button button-danger button-sm" disabled={!!busy} onClick={() => api("delete-program", { id: p.id })}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {subTab === "products" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <input className="control-input" placeholder="Product name" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="control-input" placeholder="Category" value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value })} />
              <input className="control-input" placeholder="Vendor" value={form.vendor || ""} onChange={e => setForm({ ...form, vendor: e.target.value })} />
              <input className="control-input" placeholder="Price" value={form.price || ""} onChange={e => setForm({ ...form, price: e.target.value })} />
              <input className="control-input" placeholder="Affiliate URL" value={form.affiliate_url || ""} onChange={e => setForm({ ...form, affiliate_url: e.target.value })} style={{ gridColumn: "span 2" }} />
              <input className="control-input" placeholder="Description" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} style={{ gridColumn: "span 2" }} />
              <input className="control-input" placeholder="Topics (comma separated)" value={form.topics || ""} onChange={e => setForm({ ...form, topics: e.target.value.split(",").map((s: string) => s.trim()) })} style={{ gridColumn: "span 2" }} />
              <button className="button button-primary button-sm" disabled={busy === "add-product" || !form.name} onClick={() => { api("add-product", { product: { ...form, program_id: form.program_id || "", image_url: form.image_url || "", rating: 0, enabled: true } }); setForm({}); }}>
                {busy === "add-product" ? "Adding..." : "Add Product"}
              </button>
            </div>
            {products.length === 0 ? (
              <p className="empty-state">No products configured. Add one above.</p>
            ) : (
              <div className="content-list">
                {products.map((p: any) => (
                  <div className="content-item" key={p.id}>
                    <div className="content-item-main">
                      <div className="content-item-title">{p.name}</div>
                      <div className="content-item-meta">
                        <span className={"status-badge " + (p.enabled ? "published" : "rejected")}>{p.enabled ? "ACTIVE" : "OFF"}</span>
                        <span>{p.category}</span>
                        <span>{p.vendor}</span>
                        {p.price && <span>{p.price}</span>}
                      </div>
                      {p.description && <div className="content-item-excerpt">{p.description}</div>}
                      {p.topics?.length > 0 && <div style={{ fontSize: 10, color: "var(--acid)", marginTop: 4 }}>TOPICS: {p.topics.join(", ")}</div>}
                    </div>
                    <div className="content-item-actions">
                      <button className="button button-outline button-sm" disabled={!!busy} onClick={() => api("update-product", { id: p.id, updates: { enabled: !p.enabled } })}>
                        {p.enabled ? "Disable" : "Enable"}
                      </button>
                      <button className="button button-danger button-sm" disabled={!!busy} onClick={() => api("delete-product", { id: p.id })}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {subTab === "analytics" && (
          <div>
            {stats ? (
              <>
                <div className="metric-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                  <Metric label="TOTAL CLICKS" value={String(stats.totalClicks)} detail="All time" />
                  <Metric label="CONVERSIONS" value={String(stats.totalConversions)} detail="Tracked sales" />
                  <Metric label="REVENUE" value={`$${stats.totalRevenue.toFixed(2)}`} detail="Gross sales" />
                  <Metric label="COMMISSION" value={`$${stats.totalCommission.toFixed(2)}`} detail="Earned" />
                </div>
                {stats.topProducts.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>TOP PRODUCTS BY CLICKS</div>
                    {stats.topProducts.map((tp: any) => {
                      const prod = products.find((p: any) => p.id === tp.product_id);
                      return (
                        <div key={tp.product_id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 11, borderBottom: "1px solid var(--line)" }}>
                          <span>{prod?.name || tp.product_id}</span>
                          <span style={{ color: "var(--acid)" }}>{tp.clicks} clicks</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {stats.topArticles.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>TOP ARTICLES BY AFFILIATE CLICKS</div>
                    {stats.topArticles.map((ta: any) => (
                      <div key={ta.article_slug} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 11, borderBottom: "1px solid var(--line)" }}>
                        <a href={`/vault/${ta.article_slug}`} target="_blank" rel="noopener" style={{ color: "var(--acid)", textDecoration: "none" }}>{ta.article_slug}</a>
                        <span style={{ color: "var(--acid)" }}>{ta.clicks} clicks</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="empty-state">No analytics data yet. Clicks will appear here once tracking is active.</p>
            )}
          </div>
        )}

        {subTab === "insights" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <button className="button button-primary button-sm" disabled={!!busy} onClick={runInsights}>
                {busy === "insights" ? "Analyzing..." : "Run AI Analysis"}
              </button>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", marginLeft: 12 }}>
                Analyzes published articles against affiliate products
              </span>
            </div>
            {insights.length === 0 ? (
              <p className="empty-state">No insights yet. Run the AI analysis above.</p>
            ) : (
              <div className="content-list">
                {insights.map((ins: any) => (
                  <div className="content-item" key={ins.id}>
                    <div className="content-item-main">
                      <div className="content-item-title">{ins.title}</div>
                      <div className="content-item-meta">
                        <span className={"status-badge " + (ins.priority === "HIGH" ? "rejected" : ins.priority === "MEDIUM" ? "pending" : "published")}>{ins.priority}</span>
                        <span>{ins.insight_type}</span>
                        {ins.article_slug && <span>Article: {ins.article_slug}</span>}
                      </div>
                      <div className="content-item-excerpt">{ins.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
