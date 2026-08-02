import type { NewsletterIssue } from "./types";
import { articles } from "@/lib/content";

export function generateIssue(): NewsletterIssue {
  return {id:`signal-${new Date().toISOString().slice(0,10)}`,subject:`THE SIGNAL / ${articles[0].title}`,status:"NEEDS_REVIEW",topics:articles.slice(0,3).map((article) => article.category),openRate:0,clickRate:0,revenue:0};
}
