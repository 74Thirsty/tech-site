import { NextResponse } from "next/server";
import { supabaseRequest } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!firstName || !lastName || !email || !email.includes("@")) {
    return NextResponse.json(
      { error: "First name, last name, and a valid email are required." },
      { status: 400 }
    );
  }

  // Capture metadata from request
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";
  const referer = request.headers.get("referer") || "";
  const timestamp = new Date().toISOString();

  // Attempt geolocation from IP using a free service
  let geolocation: Record<string, string> = {};
  if (ip && ip !== "unknown" && !ip.startsWith("192.168.") && !ip.startsWith("10.")) {
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(3000),
      });
      if (geoRes.ok) {
        const geo = await geoRes.json();
        geolocation = {
          city: geo.city || "",
          region: geo.region || "",
          country: geo.country_name || "",
          latitude: String(geo.latitude || ""),
          longitude: String(geo.longitude || ""),
          timezone: geo.timezone || "",
          org: geo.org || "",
        };
      }
    } catch {
      // Geolocation is best-effort
    }
  }

  const profile = {
    email,
    first_name: firstName,
    last_name: lastName,
    phone: phone || null,
    source: "subscribe_page",
    status: "active",
    ip_address: ip,
    user_agent: userAgent,
    referer: referer || null,
    city: geolocation.city || null,
    region: geolocation.region || null,
    country: geolocation.country || null,
    latitude: geolocation.latitude || null,
    longitude: geolocation.longitude || null,
    timezone: geolocation.timezone || null,
    org: geolocation.org || null,
    subscribed_at: timestamp,
  };

  try {
    // Upsert into subscriber_profiles (deduplicate by email)
    const existing = await supabaseRequest<Array<{ id: string }>>(
      `subscriber_profiles?select=id&email=eq.${encodeURIComponent(email)}`,
      { method: "GET" }
    );

    if (existing && existing.length > 0) {
      // Update existing record
      await supabaseRequest(`subscriber_profiles?id=eq.${existing[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          ip_address: ip,
          user_agent: userAgent,
          referer: referer || null,
          city: geolocation.city || null,
          region: geolocation.region || null,
          country: geolocation.country || null,
          latitude: geolocation.latitude || null,
          longitude: geolocation.longitude || null,
          timezone: geolocation.timezone || null,
          org: geolocation.org || null,
          updated_at: timestamp,
        }),
      });
    } else {
      // Insert new record
      await supabaseRequest("subscriber_profiles", {
        method: "POST",
        body: JSON.stringify(profile),
      });
    }

    // Also upsert into the legacy subscribers table for backward compat
    try {
      await supabaseRequest("subscribers", {
        method: "POST",
        body: JSON.stringify({
          email,
          source: "subscribe_page",
          status: "active",
        }),
      });
    } catch {
      // Legacy table is best-effort
    }

    return NextResponse.json(
      {
        message: "Welcome to The Signal. Check your email for confirmation.",
        subscriber: { firstName, lastName, email },
      },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("does not exist") || msg.includes("404") || msg.includes("relation")) {
      return NextResponse.json(
        { error: "Subscriber database not configured. Run the migration first." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: `Failed to save subscriber: ${msg}` },
      { status: 500 }
    );
  }
}
