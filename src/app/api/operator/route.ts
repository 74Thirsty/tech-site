import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { recommendToday } from "@/operator/decision";
import { remember, recall } from "@/memory/store";
import { decisionMemory } from "@/memory/decision-memory";
import type { AudienceProfile } from "@/memory/audience-memory";

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const memories = await recall("AUDIENCE", 1);
  const profile =
    (memories?.[0]?.value as unknown as AudienceProfile | undefined) ??
    { topics: [], skillLevel: "BEGINNER" as const, preferredFormats: [], updatedAt: new Date().toISOString() };
  const recommendation = recommendToday(profile);
  await remember(decisionMemory(recommendation.action, recommendation.reason));
  return NextResponse.json({ profile, recommendation });
}
