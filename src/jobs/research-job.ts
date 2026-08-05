import { cveCollector } from "@/intelligence/collectors/cve";
import { githubCollector } from "@/intelligence/collectors/github";
import { hackerNewsCollector } from "@/intelligence/collectors/hackernews";
import { cryptoCollector, coinGeckoCollector } from "@/intelligence/collectors/crypto";
import { cryptopanicCollector } from "@/intelligence/collectors/cryptopanic";
import { gdeltCollector } from "@/intelligence/collectors/gdelt";
import { newsdataCollector } from "@/intelligence/collectors/newsdata";
import { newsapiCollector } from "@/intelligence/collectors/newsapi";
import { runIntelligence } from "@/intelligence/pipeline";
import type { JobResult } from "./types";

export async function runResearchJob(): Promise<
  JobResult & { opportunities?: Awaited<ReturnType<typeof runIntelligence>>["items"] }
> {
  const startedAt = new Date().toISOString();
  try {
    const result = await runIntelligence([
      githubCollector,
      hackerNewsCollector,
      cveCollector,
      cryptoCollector,
      coinGeckoCollector,
      cryptopanicCollector,
      gdeltCollector,
      newsdataCollector,
      newsapiCollector,
    ]);
    return {
      job: "research",
      status: "COMPLETE",
      startedAt,
      finishedAt: new Date().toISOString(),
      errors: result.errors,
      outputCount: result.items.length,
      opportunities: result.items,
    };
  } catch (error) {
    return {
      job: "research",
      status: "FAILED",
      startedAt,
      finishedAt: new Date().toISOString(),
      errors: [String(error)],
      outputCount: 0,
    };
  }
}
