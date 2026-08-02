"use client";

import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");

  return (
    <main className="auth-page">
      <div className="auth-card">
        <a className="brand" href="/">
          <span className="brand-mark">N</span>
          <span>NEON<span className="brand-slash">//</span>FORGE</span>
        </a>
        <div className="card-kicker">PLAYER IDENTITY / {mode.toUpperCase()}</div>
        <h1>{mode === "login" ? "WELCOME BACK." : "CREATE PLAYER."}</h1>
        <form onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const response = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: mode, username: data.get("username"), email: data.get("email"), password: data.get("password") }),
          });
          const result = await response.json();
          setMessage(result.message ?? result.error ?? "Transmission accepted.");
        }}>
          {mode === "signup" && <input name="username" defaultValue="uber" placeholder="username" required />}
          <input name="email" type="email" defaultValue="phoneshax@proton.me" placeholder="email@somewhere.com" required />
          <input name="password" type="password" placeholder="password" required />
          <button className="button button-primary" type="submit">
            {mode === "login" ? "Access profile →" : "Initialize profile →"}
          </button>
        </form>
        <p>{message}</p>
        <button className="text-link" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "New player? Create identity" : "Already registered? Access identity"}
        </button>
      </div>
    </main>
  );
}
