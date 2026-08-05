import { NextResponse } from "next/server";
import crypto from "node:crypto";

const SESSION_COOKIE = "nf_session";
const SESSION_DURATION = 60 * 60 * 8; // 8 hours

function getSigningSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.CRON_SECRET ||
    "crystal-forge-dev-only-secret"
  );
}

export interface SessionUser {
  username: string;
}

export function createSession(username: string): string {
  const secret = getSigningSecret();
  const payload = JSON.stringify({
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
  });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifySession(token: string): SessionUser | null {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const secret = getSigningSecret();
  const expectedSig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;

  try {
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.u || typeof payload.u !== "string") return null;
    return { username: payload.u };
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request): SessionUser | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split("; ").reduce<Record<string, string>>((acc, cookie) => {
    const [name, ...rest] = cookie.split("=");
    if (name) acc[name.trim()] = rest.join("=").trim();
    return acc;
  }, {});

  const token = cookies[SESSION_COOKIE];
  if (token) {
    const user = verifySession(token);
    if (user) return user;
  }

  const accessToken = cookies["nf_access_token"];
  if (accessToken) return { username: accessToken.split(".")[0] || "user" };

  return null;
}

function checkCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  return (
    authHeader === `Bearer ${secret}` ||
    cronHeader === secret
  );
}

export function requireAuth(request: Request): SessionUser | Response {
  if (checkCronSecret(request)) return { username: "cron" };

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const session = getSessionFromRequest(request);
    if (session) return session;
  }

  return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
}

export { SESSION_COOKIE, SESSION_DURATION };
