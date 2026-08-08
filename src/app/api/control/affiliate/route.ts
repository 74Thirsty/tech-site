import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getAffiliatePrograms, createAffiliateProgram, updateAffiliateProgram, deleteAffiliateProgram,
  getAffiliateProducts, createAffiliateProduct, updateAffiliateProduct, deleteAffiliateProduct,
  getAffiliateStats, getAffiliateInsights, createAffiliateInsight,
} from "@/lib/affiliate";
import { findOrFetchProducts } from "@/lib/products";

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

  if (body.action === "sync-amazon") {
    const { keywords, topic } = body;
    if (!keywords || !topic) {
      return NextResponse.json({ error: "Missing keywords or topic" }, { status: 400 });
    }
    const products = await findOrFetchProducts(
      Array.isArray(keywords) ? keywords : [keywords],
      topic
    );
    return NextResponse.json({
      ok: true,
      fetched: products.length,
      products: products.map(p => ({ id: p.id, title: p.title, price: p.price?.display })),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
