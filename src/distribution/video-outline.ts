import type { ArticlePlan } from "@/editorial/types";
export function generateVideoOutline(plan:ArticlePlan){return {hook:plan.title,beats:["Problem","Context","Demo","Security note","Call to mission"]};}
