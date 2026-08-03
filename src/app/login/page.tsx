"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.action = mode;

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.ok && result.redirect) {
        window.location.href = result.redirect;
        return;
      }

      setMessage(result.error ?? "Authentication failed. Please try again.");
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <a className="brand" href="/">
          <span className="brand-mark">N</span>
          <span>STRATAGEM</span>
        </a>
        <div className="card-kicker">USERNAME / {mode.toUpperCase()}</div>
        <h1>{mode === "login" ? "WELCOME BACK." : "CREATE ACCOUNT."}</h1>
        <form onSubmit={handleSubmit}>
          {mode === "signup" && <input name="username" placeholder="username" required />}
          <input name="email" type="email" placeholder="email@somewhere.com" required />
          <input name="password" type="password" placeholder="password" required />
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Authenticating..." : mode === "login" ? "Access profile →" : "Create account →"}
          </button>
        </form>
        {message && <p style={{ color: "#f44", marginTop: 12, font: "12px 'DM Mono'" }}>{message}</p>}
        <button className="text-link" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
          {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </main>
  );
}
