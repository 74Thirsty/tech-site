import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { researchAgent } from "@/agents/researchAgent";
import { newsletterAgent } from "@/agents/newsletterAgent";
import { seoAgent } from "@/agents/seoAgent";
import { socialAgent } from "@/agents/socialAgent";

export async function POST(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));
  const agents = [researchAgent, newsletterAgent, seoAgent, socialAgent];
  const results = [];
  for (const agent of agents) results.push({ agent: agent.name, result: await agent.run(body) });
  return NextResponse.json({
    pipeline: "RESEARCH → EDITOR → SEO → NEWSLETTER → SOCIAL",
    results,
  });
}
