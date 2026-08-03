import { env } from "@/lib/env";
import { localAuth } from "@/lib/local-auth";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

async function parseBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json().catch(() => ({}));
  }
  const text = await request.text();
  const params = new URLSearchParams(text);
  const obj: Record<string, string> = {};
  params.forEach((v, k) => { obj[k] = v; });
  return obj;
}

function cookieStr(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export async function POST(request: Request) {
  const { action, email, password, username } = await parseBody(request);
  const url = new URL(request.url);
  const origin = url.origin;
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    try {
      const local = await localAuth(
        action === "signup" ? "signup" : "login",
        typeof username === "string" ? username : "user",
        email,
        password,
      );
      if (local.ok && local.username) {
        const token = createSession(local.username);
        const cookies = [cookieStr(SESSION_COOKIE, token, 60 * 60 * 8)];
        if (isJson) {
          const res = Response.json({ ok: true, redirect: `${origin}/control` });
          for (const c of cookies) res.headers.append("Set-Cookie", c);
          return res;
        }
        const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${origin}/control"></head><body></body></html>`;
        const headers = new Headers({ "Content-Type": "text/html", "Location": `${origin}/control` });
        for (const c of cookies) headers.append("Set-Cookie", c);
        return new Response(html, { status: 200, headers });
      }
      if (isJson) return Response.json({ ok: false, error: local.message ?? "Invalid credentials." }, { status: 401 });
      return new Response(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/login?error=1"></head><body></body></html>`, { status: 200, headers: { "Content-Type": "text/html" } });
    } catch {
      if (isJson) return Response.json({ ok: false, error: "Auth service unavailable." }, { status: 500 });
      return new Response(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/login?error=1"></head><body></body></html>`, { status: 200, headers: { "Content-Type": "text/html" } });
    }
  }

  const endpoint = action === "signup" ? "signup" : "token?grant_type=password";
  const response = await fetch(`${env.supabaseUrl}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: {
      apikey: env.supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, options: { emailRedirectTo: env.siteUrl } }),
  });
  const payload = await response.json();

  let tokenPayload = payload;
  if (action === "signup" && response.ok && !payload.access_token) {
    const loginRes = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: env.supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    if (loginRes.ok) {
      tokenPayload = await loginRes.json();
    }
  }

  const accessToken = tokenPayload.access_token;
  if (accessToken) {
    const cookies = [
      cookieStr("nf_access_token", accessToken, tokenPayload.expires_in ?? 3600),
    ];
    if (tokenPayload.refresh_token) {
      cookies.push(cookieStr("nf_refresh_token", tokenPayload.refresh_token, 60 * 60 * 24 * 30));
    }
    if (isJson) {
      const res = Response.json({ ok: true, redirect: `${origin}/control` });
      for (const c of cookies) res.headers.append("Set-Cookie", c);
      return res;
    }
    const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${origin}/control"></head><body></body></html>`;
    const headers = new Headers({ "Content-Type": "text/html", "Location": `${origin}/control` });
    for (const c of cookies) headers.append("Set-Cookie", c);
    return new Response(html, { status: 200, headers });
  }

  const errorMsg = tokenPayload.msg ?? tokenPayload.error_description ?? tokenPayload.message ?? "Login failed. Check your credentials.";
  if (isJson) return Response.json({ ok: false, error: errorMsg }, { status: 401 });
  return new Response(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/login?error=1"></head><body></body></html>`, { status: 200, headers: { "Content-Type": "text/html" } });
}
