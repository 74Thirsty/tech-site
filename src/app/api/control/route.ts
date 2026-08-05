import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getControlState, loadControlState, updateControl, recordArticleGeneration, recordResearch } from "@/control/state";
import { runResearchJob } from "@/jobs/research-job";
import { generateSingleArticle, generateFourArticles } from "@/articles/generator";
import { supabaseRequest } from "@/lib/supabase";

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
  if (!["research", "generate", "approve", "generate-articles", "generate-articles-batch", "clear-newsletters"].includes(body.action))
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
    const result = await generateSingleArticle();
    recordArticleGeneration({
      id: `gen-${Date.now()}`,
      topicCount: result.article ? 1 : 0,
      generatedAt: new Date().toISOString(),
      status: result.success ? "COMPLETE" : "FAILED",
      errors: result.errors,
    });
    const state = await getControlState();
    return NextResponse.json(state);
  }

  if (body.action === "generate-articles-batch") {
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

  if (body.action === "clear-newsletters") {
    try {
      const all = await supabaseRequest<Array<{ id: string }>>("newsletter_issues?select=id&status=neq.ARCHIVED", { method: "GET" });
      if (all?.length) {
        for (const row of all) {
          await supabaseRequest(`newsletter_issues?id=eq.${row.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "ARCHIVED" }),
          });
        }
      }
      const state = await getControlState();
      state.timeline.unshift(`Archived ${all?.length ?? 0} newsletter issues`);
      return NextResponse.json(state);
    } catch (e) {
      return NextResponse.json({ error: `Failed to archive newsletters: ${String(e)}` }, { status: 500 });
    }
  }

  if (body.action === "generate") {
    try {
      const state = await updateControl(body.action, body.id);
      return NextResponse.json(state);
    } catch (error) {
      return NextResponse.json(
        { error: `Newsletter generation failed: ${String(error)}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(await updateControl(body.action, body.id));
}
