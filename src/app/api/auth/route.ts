import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { localAuth } from "@/lib/local-auth";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const { action, email, password, username } = await request.json().catch(() => ({}));

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    const local = await localAuth(
      action === "signup" ? "signup" : "login",
      typeof username === "string" ? username : "user",
      email,
      password,
    );
    const result = NextResponse.json(local, { status: local.status });
    if (local.ok && local.username) {
      const token = createSession(local.username);
      result.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
      });
    }
    return result;
  }

  const endpoint = action === "signup" ? "signup" : "token?grant_type=password";
  const response = await fetch(`${env.supabaseUrl}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: {
      apikey: env.supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json();
  const result = NextResponse.json(payload, { status: response.status });
  if (response.ok && payload.access_token) {
    result.cookies.set("nf_access_token", payload.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: payload.expires_in ?? 3600,
    });
    if (payload.refresh_token) {
      result.cookies.set("nf_refresh_token", payload.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  }
  return result;
}
