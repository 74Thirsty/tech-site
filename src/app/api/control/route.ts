import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getControlState, loadControlState, updateControl } from "@/control/state";
import { runResearchJob } from "@/jobs/research-job";
import { generateAllArticles, generateArticleBySlug } from "@/articles/generator";

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;
  return NextResponse.json(await loadControlState());
}

export async function POST(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));
  if (!["research", "generate", "approve", "generate-articles"].includes(body.action))
    return NextResponse.json({ error: "Unknown control action" }, { status: 400 });

  if (body.action === "research") {
    const result = await runResearchJob();
    const state = await updateControl("research");
    state.timeline.unshift(
      `Research ${result.status.toLowerCase()}: ${result.outputCount} opportunities / ${result.errors.length} errors`,
    );
    return NextResponse.json(state);
  }

  if (body.action === "generate-articles") {
    if (typeof body.slug === "string") {
      const result = await generateArticleBySlug(body.slug);
      const state = await getControlState();
      state.timeline.unshift(
        result.success
          ? `Article "${body.slug}" generated`
          : `Failed to generate "${body.slug}": ${result.error}`,
      );
      return NextResponse.json(state);
    }
    const results = await generateAllArticles();
    const state = await getControlState();
    const successful = results.filter((r) => r.success).length;
    state.timeline.unshift(`Generated ${successful}/${results.length} articles`);
    return NextResponse.json(state);
  }

  return NextResponse.json(await updateControl(body.action, body.id));
}
