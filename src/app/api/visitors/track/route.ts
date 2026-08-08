import { NextResponse } from "next/server";
import { collectVisitorData, recordPageView, recordVisitorEvent } from "@/visitor-intelligence";

// ─── Visitor Tracking Endpoint ────────────────────────────────────────────────
// Public endpoint for collecting visitor data.
// Called by the client-side tracking script.
// Never blocks the response — failures are logged and ignored.

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { path, title, articleSlug, sessionId, event } = body;

    // Collect visitor data (creates/updates visitor + session)
    const result = await collectVisitorData(request, { sessionId, path });

    // Record page view if path provided
    if (path && result.visitorId && result.sessionId) {
      await recordPageView(result.visitorId, result.sessionId, path, {
        title,
        articleSlug,
      });
    }

    // Record custom event if provided
    if (event && result.visitorId && result.sessionId) {
      await recordVisitorEvent(result.visitorId, result.sessionId, event.type, event.name, {
        path,
        articleSlug,
        metadata: event.metadata,
      });
    }

    return NextResponse.json({
      ok: true,
      visitorId: result.visitorId,
      sessionId: result.sessionId,
    });
  } catch (error) {
    // Never fail the tracking endpoint
    console.error(`Visitor tracking error: ${String(error)}`);
    return NextResponse.json({ ok: true });
  }
}

// Also handle GET for simple page view tracking via image beacon
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get("path") ?? "/";
    const title = url.searchParams.get("title") ?? undefined;

    const result = await collectVisitorData(request, { path });

    if (result.visitorId && result.sessionId) {
      await recordPageView(result.visitorId, result.sessionId, path, { title });
    }

    // Return 1x1 transparent GIF
    const pixel = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
    ]);

    return new Response(pixel, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch {
    const pixel = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
    ]);
    return new Response(pixel, {
      headers: { "Content-Type": "image/gif" },
    });
  }
}
