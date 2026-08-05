import { getAllPublishedArticles } from "@/lib/generated-articles";
import { buildCalendar } from "@/calendar";
import type { AudienceProfile } from "@/memory/audience-memory";

export async function recommendToday(profile: AudienceProfile) {
  const topic = profile.topics[0] ?? "LINUX";
  const articles = await getAllPublishedArticles();
  const article = articles.find((item) => item.category === topic) ?? articles[0];
  return {
    action: article ? `Finish ${article.title}.` : `No articles available for ${topic}.`,
    reason: [
      `It matches the strongest known audience topic: ${topic}.`,
      `It can become a newsletter section, mission, and product CTA.`,
    ],
    estimatedImpact: profile.topics.length ? "HIGH" : "UNKNOWN",
    calendar: await buildCalendar(profile, 1),
  };
}
