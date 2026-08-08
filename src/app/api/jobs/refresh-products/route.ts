import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { refreshStaleProducts } from "@/lib/amazon-cache";

export const maxDuration = 120;

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  console.log("═══ PRODUCT REFRESH JOB ═══");

  try {
    const result = await refreshStaleProducts();
    console.log(`  Refreshed: ${result.refreshed}, Failed: ${result.failed}`);

    return NextResponse.json({
      success: true,
      refreshed: result.refreshed,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`  Product refresh failed: ${String(error)}`);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
