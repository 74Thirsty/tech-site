import type { ArticlePlan } from "@/editorial/types";
export function buildNewsletterSection(plan:ArticlePlan){return {name:"THE SIGNAL",whatHappened:plan.title,whyItMatters:plan.angle,yourMove:`Read the full mission and test one idea this week.`};}
