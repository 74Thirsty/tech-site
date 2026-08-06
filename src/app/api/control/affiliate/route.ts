import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getAffiliatePrograms, createAffiliateProgram, updateAffiliateProgram, deleteAffiliateProgram,
  getAffiliateProducts, createAffiliateProduct, updateAffiliateProduct, deleteAffiliateProduct,
  getAffiliateStats, getAffiliateInsights, createAffiliateInsight,
} from "@/lib/affiliate";

export const maxDuration = 60;

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  try {
    const [programs, products, stats, insights] = await Promise.all([
      getAffiliatePrograms(),
      getAffiliateProducts(),
      getAffiliateStats(),
      getAffiliateInsights(),
    ]);
    return NextResponse.json({ programs, products, stats, insights });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ programs: [], products: [], stats: null, insights: [], error: msg });
  }
}

export async function POST(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));

  if (body.action === "add-program") {
    const ok = await createAffiliateProgram(body.program);
    return NextResponse.json({ ok });
  }

  if (body.action === "update-program") {
    const ok = await updateAffiliateProgram(body.id, body.updates);
    return NextResponse.json({ ok });
  }

  if (body.action === "delete-program") {
    const ok = await deleteAffiliateProgram(body.id);
    return NextResponse.json({ ok });
  }

  if (body.action === "add-product") {
    const ok = await createAffiliateProduct(body.product);
    return NextResponse.json({ ok });
  }

  if (body.action === "update-product") {
    const ok = await updateAffiliateProduct(body.id, body.updates);
    return NextResponse.json({ ok });
  }

  if (body.action === "delete-product") {
    const ok = await deleteAffiliateProduct(body.id);
    return NextResponse.json({ ok });
  }

  if (body.action === "add-insight") {
    const ok = await createAffiliateInsight(body.insight);
    return NextResponse.json({ ok });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
