import type { ArticlePlan } from "@/editorial/types";
export function generatePodcastOutline(plan:ArticlePlan){return {title:`The Signal Room: ${plan.title}`,segments:["Cold open","What happened","Why it matters","A practical experiment","Closing transmission"]};}
