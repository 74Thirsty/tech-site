import { env } from "@/lib/env";
import { generateContent } from "@/lib/puter";
import type { ResearchGroup, ResearchAnalysis } from "./types";

// ─── AI Research Analyzer ────────────────────────────────────────────────────
// Uses Puter.js AI to analyze grouped research and produce structured notes.
// This happens BEFORE article planning — the AI analyzes, not writes.

export async function analyzeResearchGroups(
  groups: ResearchGroup[]
): Promise<ResearchAnalysis[]> {
  const analyses: ResearchAnalysis[] = [];

  const batched = batchGroups(groups, 5);

  for (const batch of batched) {
    const batchAnalyses = await Promise.all(
      batch.map(group => analyzeGroup(group))
    );
    analyses.push(...batchAnalyses.filter((a): a is ResearchAnalysis => a !== null));
  }

  return analyses;
}

async function analyzeGroup(
  group: ResearchGroup
): Promise<ResearchAnalysis | null> {
  try {
    const sourcesText = group.articles
      .map((a, i) => `${i + 1}. [${a.publisher}] ${a.title}\n   ${a.summary}`)
      .join("\n\n");

    const prompt = `You are a senior research analyst. Analyze the following grouped research articles about "${group.topic}".

ARTICLES (${group.articles.length} articles from ${group.sourceCount} sources):
${sourcesText}

Provide a structured analysis. Return ONLY valid JSON (no markdown fences):

{
  "whatHappened": "One paragraph summary of what actually happened, based ONLY on the facts in the articles",
  "isBreaking": true/false,
  "isImportant": true/false,
  "sourceDisagreement": true/false,
  "technicalSignificance": "One paragraph explaining the technical significance for engineers and builders",
  "whyItMatters": "One paragraph explaining why readers should care",
  "keyEntities": ["Entity1", "Entity2", "Entity3"],
  "relatedTopics": ["TOPIC1", "TOPIC2"],
  "researchNotes": "3-5 bullet points of verified facts extracted from the articles. Each fact must be directly supported by at least one source."
}

Rules:
- Only state facts that appear in the provided articles
- If articles disagree, note the disagreement
- Key entities should be specific (company names, protocol names, people)
- Research notes should be factual, not interpretive
- Do not add information not present in the articles`;

    const text = await generateContent(prompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      group,
      analysis: {
        whatHappened: String(parsed.whatHappened || ""),
        isBreaking: Boolean(parsed.isBreaking),
        isImportant: Boolean(parsed.isImportant),
        sourceDisagreement: Boolean(parsed.sourceDisagreement),
        technicalSignificance: String(parsed.technicalSignificance || ""),
        whyItMatters: String(parsed.whyItMatters || ""),
        keyEntities: Array.isArray(parsed.keyEntities) ? parsed.keyEntities : [],
        relatedTopics: Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics : [],
      },
      researchNotes: String(parsed.researchNotes || ""),
    };
  } catch (error) {
    console.error(`Failed to analyze group "${group.topic}":`, error);
    return null;
  }
}

function batchGroups<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
