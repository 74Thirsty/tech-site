import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PAGES = ["/control"];
const PROTECTED_APIS = [
  "/api/control",
  "/api/articles/generate",
  "/api/agents",
  "/api/operator",
  "/api/images/search",
  "/api/images/generate",
  "/api/seo",
  "/api/jobs/generate-articles",
  "/api/jobs/refresh-products",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession =
    request.cookies.has("nf_session") || request.cookies.has("nf_access_token");

  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronAuth =
    Boolean(cronSecret) &&
    (authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret);

  const isAuthenticated = hasSession || hasCronAuth;

  if (!isAuthenticated) {
    if (PROTECTED_APIS.some((path) => pathname.startsWith(path))) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 },
      );
    }
    if (PROTECTED_PAGES.some((path) => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/control/:path*",
    "/api/control/:path*",
    "/api/articles/generate/:path*",
    "/api/agents/:path*",
    "/api/operator/:path*",
    "/api/images/search/:path*",
    "/api/images/generate/:path*",
    "/api/seo/:path*",
    "/api/jobs/generate-articles/:path*",
    "/api/jobs/refresh-products/:path*",
  ],
};
