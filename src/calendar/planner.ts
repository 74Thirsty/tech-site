import { getAllPublishedArticles } from "@/lib/generated-articles";
import { missionTracks } from "@/lib/content";
import type { AudienceProfile } from "@/memory/audience-memory";

export type CalendarItem = { week: number; type: "ARTICLE" | "TUTORIAL" | "NEWSLETTER" | "PODCAST"; title: string; reason: string };

export async function buildCalendar(profile: AudienceProfile, weeks = 4): Promise<CalendarItem[]> {
  const topic = profile.topics[0] ?? "LINUX";
  const track = missionTracks[topic as keyof typeof missionTracks] ?? missionTracks.LINUX;
  const articles = await getAllPublishedArticles();

  return Array.from({ length: weeks }, (_, index) => {
    const article = articles[index % articles.length];
    return [
      { week: index + 1, type: "ARTICLE" as const, title: index === 0 ? `${topic} Security Field Note` : (article?.title ?? `${topic} Field Note`), reason: `Matches ${topic} audience signal.` },
      { week: index + 1, type: "TUTORIAL" as const, title: track.title, reason: `Builds toward ${track.reward}.` },
      { week: index + 1, type: "NEWSLETTER" as const, title: `THE SIGNAL / ${topic}`, reason: "Maintains the weekly publishing cadence." },
      { week: index + 1, type: "PODCAST" as const, title: `The Signal Room: ${topic}`, reason: "Repurpose the strongest weekly idea." },
    ];
  }).flat();
}
