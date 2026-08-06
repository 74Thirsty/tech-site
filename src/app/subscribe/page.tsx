"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

function GridBackground() {
  return (
    <div className="subscribe-grid-bg">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="subgrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(212,243,74,0.04)" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="subglow" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="rgba(212,243,74,0.08)" />
            <stop offset="100%" stopColor="rgba(212,243,74,0)" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#subgrid)" />
        <rect width="100%" height="100%" fill="url(#subglow)" />
      </svg>
    </div>
  );
}

function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,243,74,${p.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="subscribe-particles" />;
}

function GlitchText({ children }: { children: React.ReactNode }) {
  return (
    <span className="subscribe-glitch" data-text={typeof children === "string" ? children : ""}>
      {children}
    </span>
  );
}

function AnimatedCounter({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = () => {
            start += 1;
            setCount(start);
            if (start < target) requestAnimationFrame(step);
          };
          step();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return (
    <div ref={ref} className="subscribe-counter">
      <span className="subscribe-counter-number">{count}</span>
      <span className="subscribe-counter-label">{label}</span>
    </div>
  );
}

type ArchiveIssue = {
  id: string;
  subject: string;
  status: string;
  content: {
    subtitle?: string;
    topics?: string[];
    difficulty?: string;
    estimatedReadTime?: string;
    reviewProduct?: string;
    reviewVerdict?: string;
  } | null;
  created_at: string;
};

function isLocked(createdAt: string): boolean {
  const published = new Date(createdAt).getTime();
  const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return published > oneMonthAgo;
}

function daysUntilUnlock(createdAt: string): number {
  const published = new Date(createdAt).getTime();
  const unlockAt = published + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((unlockAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function SubscribePage() {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoveredOffer, setHoveredOffer] = useState<number | null>(null);
  const [newsletters, setNewsletters] = useState<ArchiveIssue[]>([]);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/control/newsletters")
      .then(r => r.json())
      .then(d => setNewsletters(d.issues ?? []))
      .catch(() => {});
  }, []);

  const scrollToForm = () => {
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          email: data.get("email"),
          phone: data.get("phone"),
        }),
      });
      const result = await res.json();
      if (!res.ok) { setError(result.error ?? "Something went wrong."); setLoading(false); return; }
      setSubmitted(true);
      setLoading(false);
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  };

  return (
    <main className="subscribe-page">
      <GridBackground />
      <FloatingParticles />

      <header className="site-header" style={{ position: "relative", zIndex: 10 }}>
        <a className="brand" href="/">
          <Image className="brand-mark" src="/favicon.png" alt="Stratagem" width={26} height={26} />
          <span>STRATAGEM</span>
        </a>
        <nav className="desktop-nav">
          <a href="/projects">PROJECTS</a>
          <a href="/newsletter">SIGNAL</a>
          <a href="/books">BOOKS</a>
        </nav>
        <a className="text-link" href="/">← Home</a>
      </header>

      {/* ═══════════════════════════════════════════════ HERO ═══════════════════════════════════════════════ */}
      <section className="subscribe-hero">
        <div className="subscribe-hero-orb subscribe-hero-orb-1" />
        <div className="subscribe-hero-orb subscribe-hero-orb-2" />
        <div className="subscribe-hero-scanline" />

        <div className="subscribe-hero-badge">
          <span className="subscribe-hero-badge-dot" />
          PREMIUM MEMBERSHIP — LIMITED FOUNDING SPOTS
        </div>

        <h1 className="subscribe-hero-title">
          <span className="subscribe-hero-line">GET THE</span>
          <span className="subscribe-hero-line subscribe-hero-accent">
            <GlitchText>SIGNAL.</GlitchText>
          </span>
        </h1>

        <p className="subscribe-hero-sub">
          One monthly dispatch. Four deep technical pieces. Zero filler.
          <br />
          <span className="subscribe-hero-sub-accent">Plus your free copy of EVM MASTERY — not available anywhere else.</span>
        </p>

        <div className="subscribe-hero-stats">
          <AnimatedCounter target={4} label="PIECES / MONTH" />
          <div className="subscribe-hero-stat-divider" />
          <AnimatedCounter target={12} label="GUIDES / YEAR" />
          <div className="subscribe-hero-stat-divider" />
          <AnimatedCounter target={24} label="REVIEWS / YEAR" />
        </div>

        <button className="subscribe-hero-cta" onClick={scrollToForm}>
          <span className="subscribe-hero-cta-text">CLAIM YOUR COPY</span>
          <span className="subscribe-hero-cta-glow" />
        </button>

        <div className="subscribe-hero-trust">
          <span>✓ Free with subscription</span>
          <span>✓ Unsubscribe anytime</span>
          <span>✓ No spam, ever</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ BOOK ═══════════════════════════════════════════════ */}
      <section className="subscribe-section subscribe-book-section">
        <div className="subscribe-book-layout">
          <div className="subscribe-book-visual">
            <div className="subscribe-book-3d">
              <div className="subscribe-book-spine-3d" />
              <div className="subscribe-book-front-3d">
                <div className="subscribe-book-glow" />
                <div className="subscribe-book-cover-content">
                  <div className="subscribe-book-cover-top">
                    <span className="subscribe-book-cover-series">THE SIGNAL PRESS</span>
                    <div className="subscribe-book-cover-line" />
                  </div>
                  <div className="subscribe-book-cover-main">
                    <span className="subscribe-book-cover-title">EVM<br />MASTERY</span>
                    <span className="subscribe-book-cover-sub">The Complete Guide to Ethereum Virtual Machine Architecture &amp; Development</span>
                  </div>
                  <div className="subscribe-book-cover-bottom">
                    <div className="subscribe-book-cover-line" />
                    <span className="subscribe-book-cover-author">CHRIS HIRSCHAUER</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="subscribe-book-shadow" />
            <div className="subscribe-book-label">UNRELEASED — SUBSCRIBERS ONLY</div>
          </div>

          <div className="subscribe-book-copy">
            <div className="card-kicker">FREE WITH SUBSCRIPTION</div>
            <h2>Your copy of<br /><em>EVM MASTERY.</em></h2>
            <p className="subscribe-book-desc">
              Our unreleased textbook. Not in stores. Not on Amazon. Not available anywhere else.
              Every subscriber gets a free digital copy on signup.
            </p>
            <div className="subscribe-book-topics">
              <span>EVM Internals</span>
              <span>Opcodes</span>
              <span>Memory Models</span>
              <span>Gas Optimization</span>
              <span>Smart Contract Security</span>
              <span>Upgrade Patterns</span>
              <span>Assembly</span>
              <span>Advanced Patterns</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ WHAT YOU GET ═══════════════════════════════════════════════ */}
      <section className="subscribe-section">
        <div className="subscribe-centered">
          <div className="card-kicker">WHAT&apos;S INSIDE EVERY MONTH</div>
          <h2>Four pieces of<br /><em>field-tested content.</em></h2>
        </div>

        <div className="subscribe-offers">
          {[
            { num: "01", title: "DIY Project Guide", desc: "A complete, step-by-step how-to manual. Real commands, real configs, real hardware. You build something you can use today.", icon: "⚡" },
            { num: "02", title: "Technical Build Guide", desc: "A second deep-dive guide covering infrastructure, security, or systems architecture. Field manual quality.", icon: "🔧" },
            { num: "03", title: "Product Review", desc: "Honest, brutal reviews of tools, hardware, and services. Specs, real-world performance, hidden costs.", icon: "📊" },
            { num: "04", title: "Product Review", desc: "No sponsorship bias. No affiliate shilling. Just the truth about whether it's worth your money.", icon: "🎯" },
          ].map((offer, i) => (
            <div
              key={i}
              className={`subscribe-offer-card ${hoveredOffer === i ? "subscribe-offer-active" : ""}`}
              onMouseEnter={() => setHoveredOffer(i)}
              onMouseLeave={() => setHoveredOffer(null)}
            >
              <div className="subscribe-offer-header">
                <span className="subscribe-offer-num">{offer.num}</span>
                <span className="subscribe-offer-icon">{offer.icon}</span>
              </div>
              <h3>{offer.title}</h3>
              <p>{offer.desc}</p>
              <div className="subscribe-offer-glow" />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ WHO IT'S FOR ═══════════════════════════════════════════════ */}
      <section className="subscribe-section subscribe-audience-section">
        <div className="subscribe-centered">
          <div className="card-kicker">WHO THIS IS FOR</div>
          <h2>Built for people who<br /><em>ship things.</em></h2>
        </div>
        <div className="subscribe-audience-grid">
          {[
            { title: "Smart Contract Developers", desc: "You write Solidity but want to understand what the EVM actually does with your code. Optimize gas, find vulnerabilities, understand the machine beneath the compiler.", tag: "SOLIDITY" },
            { title: "Security Engineers", desc: "You audit contracts or run a security practice. Field-tested knowledge about attack vectors, exploitation patterns, and defensive techniques.", tag: "SECURITY" },
            { title: "Infrastructure Builders", desc: "You run nodes, build tooling, or design systems that interact with blockchain networks. Practical, operational knowledge.", tag: "INFRA" },
            { title: "Technical Founders", desc: "You're building a Web3 product and need to understand the technical landscape deeply enough to make good architecture decisions.", tag: "FOUNDING" },
          ].map((item, i) => (
            <div key={i} className="subscribe-audience-card">
              <span className="subscribe-audience-tag">{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ CTA ═══════════════════════════════════════════════ */}
      <section className="subscribe-section subscribe-cta-section">
        <div className="subscribe-cta-glow-bg" />
        <div className="subscribe-centered" style={{ position: "relative", zIndex: 2 }}>
          <div className="subscribe-cta-box">
            <div className="subscribe-cta-badge">FOUNDING MEMBER RATE</div>
            <h2>One newsletter.<br /><em>Once a month.</em></h2>
            <p>
              No weekly spam. No hot takes. One carefully crafted dispatch with four pieces of
              content you&apos;ll actually bookmark. Plus your free copy of EVM MASTERY.
            </p>
            <button className="subscribe-cta-button" onClick={scrollToForm}>
              <span>GET THE SIGNAL →</span>
              <span className="subscribe-cta-btn-glow" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ ARCHIVE ═══════════════════════════════════════════════ */}
      <section className="subscribe-section subscribe-archive-section">
        <div className="subscribe-centered">
          <div className="card-kicker">PAST ISSUES</div>
          <h2>Browse the<br /><em>archive.</em></h2>
          <p className="subscribe-archive-note">
            Issues unlock 30 days after publication. Subscribers get instant access to everything.
          </p>
        </div>

        {newsletters.length === 0 ? (
          <div className="subscribe-archive-empty">
            <div className="subscribe-archive-empty-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="6" width="24" height="20" rx="1" stroke="var(--line)" strokeWidth="1.5" />
                <path d="M4 10L16 18L28 10" stroke="var(--line)" strokeWidth="1.5" />
              </svg>
            </div>
            <p>No issues published yet. The first issue drops soon.</p>
          </div>
        ) : (
          <div className="subscribe-archive-grid">
            {newsletters.map((issue) => {
              const locked = isLocked(issue.created_at);
              const days = daysUntilUnlock(issue.created_at);
              const content = issue.content;
              const date = new Date(issue.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              return (
                <div key={issue.id} className={`subscribe-archive-card ${locked ? "subscribe-archive-locked" : ""}`}>
                  <div className="subscribe-archive-card-top">
                    <span className="subscribe-archive-date">{date}</span>
                    {locked ? (
                      <span className="subscribe-archive-lock">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M4 5V3.5C4 2.4 4.9 1.5 6 1.5C7.1 1.5 8 2.4 8 3.5V5" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                        UNLOCK IN {days}D
                      </span>
                    ) : (
                      <span className="subscribe-archive-unlocked">UNLOCKED</span>
                    )}
                  </div>

                  <h3 className="subscribe-archive-title">{issue.subject}</h3>

                  {content?.subtitle && (
                    <p className="subscribe-archive-subtitle">{content.subtitle}</p>
                  )}

                  <div className="subscribe-archive-meta">
                    {content?.topics && content.topics.length > 0 && (
                      <span>{content.topics.slice(0, 3).join(" / ")}</span>
                    )}
                    {content?.estimatedReadTime && <span>{content.estimatedReadTime}</span>}
                    {content?.difficulty && <span>{content.difficulty}</span>}
                  </div>

                  {content?.reviewProduct && (
                    <div className="subscribe-archive-review">
                      <span className="subscribe-archive-review-label">REVIEW</span>
                      <span>{content.reviewProduct}</span>
                      {content.reviewVerdict && (
                        <span className={`subscribe-archive-verdict ${content.reviewVerdict === "BUY" ? "verdict-buy" : content.reviewVerdict === "AVOID" ? "verdict-avoid" : ""}`}>
                          {content.reviewVerdict}
                        </span>
                      )}
                    </div>
                  )}

                  {locked ? (
                    <div className="subscribe-archive-cta-locked">
                      <span>Subscribers get instant access</span>
                      <button className="subscribe-archive-signup-btn" onClick={scrollToForm}>SUBSCRIBE TO UNLOCK →</button>
                    </div>
                  ) : (
                    <a href="/newsletter" className="subscribe-archive-read">
                      Read this issue →
                    </a>
                  )}

                  {locked && <div className="subscribe-archive-lock-overlay" />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════ FORM ═══════════════════════════════════════════════ */}
      {showForm && !submitted && (
        <section className="subscribe-section subscribe-form-section" ref={formRef}>
          <div className="subscribe-form-glow" />
          <div className="subscribe-form-container">
            <div className="card-kicker">SUBSCRIBE TO THE SIGNAL</div>
            <h2>Enter your details.<br /><em>Get EVM MASTERY free.</em></h2>
            <form className="subscribe-form" onSubmit={handleSubmit}>
              <div className="subscribe-form-row">
                <div className="subscribe-form-field">
                  <label htmlFor="firstName">First Name</label>
                  <input id="firstName" name="firstName" type="text" placeholder="Chris" required />
                  <div className="subscribe-field-focus" />
                </div>
                <div className="subscribe-form-field">
                  <label htmlFor="lastName">Last Name</label>
                  <input id="lastName" name="lastName" type="text" placeholder="Hirschauer" required />
                  <div className="subscribe-field-focus" />
                </div>
              </div>
              <div className="subscribe-form-field">
                <label htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" placeholder="you@example.com" required />
                <div className="subscribe-field-focus" />
              </div>
              <div className="subscribe-form-field">
                <label htmlFor="phone">Phone Number <span className="subscribe-field-optional">(optional)</span></label>
                <input id="phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" />
                <div className="subscribe-field-focus" />
              </div>
              {error && <div className="subscribe-form-error">{error}</div>}
              <button className="subscribe-form-submit" type="submit" disabled={loading}>
                <span>{loading ? "SUBSCRIBING..." : "SUBSCRIBE & GET EVM MASTERY →"}</span>
                <span className="subscribe-form-submit-glow" />
              </button>
              <p className="subscribe-form-disclaimer">
                One email per month. Unsubscribe anytime. We never share your data.
              </p>
            </form>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════ SUCCESS ═══════════════════════════════════════════════ */}
      {submitted && (
        <section className="subscribe-section subscribe-form-section">
          <div className="subscribe-form-container subscribe-success">
            <div className="subscribe-success-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="23" stroke="var(--acid)" strokeWidth="2" />
                <path d="M14 24L21 31L34 17" stroke="var(--acid)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>You&apos;re in.</h2>
            <p>Check your email for confirmation and your copy of EVM MASTERY. Your first issue of The Signal drops next month.</p>
            <a className="text-link" href="/" style={{ marginTop: 24, display: "inline-block" }}>← Back to Stratagem</a>
          </div>
        </section>
      )}

      <div style={{ height: 120 }} />
    </main>
  );
}
