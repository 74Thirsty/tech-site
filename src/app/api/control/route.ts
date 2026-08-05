import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getControlState, loadControlState, updateControl, recordArticleGeneration, recordResearch } from "@/control/state";
import { runResearchJob } from "@/jobs/research-job";
import { generateFourArticles } from "@/articles/generator";

export const maxDuration = 300;

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
    const state = await getControlState();
    recordResearch({ outputCount: result.outputCount, errors: result.errors });
    state.timeline.unshift(
      `Research ${result.status.toLowerCase()}: ${result.outputCount} opportunities / ${result.errors.length} errors`,
    );
    return NextResponse.json(state);
  }

  if (body.action === "generate-articles") {
    const result = await generateFourArticles();
    recordArticleGeneration({
      id: `gen-${Date.now()}`,
      topicCount: result.articles.length,
      generatedAt: new Date().toISOString(),
      status: result.success ? "COMPLETE" : "FAILED",
      errors: result.errors,
    });
    const state = await getControlState();
    return NextResponse.json(state);
  }

  return NextResponse.json(await updateControl(body.action, body.id));
}
