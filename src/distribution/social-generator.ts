import type { ArticlePlan } from "@/editorial/types";
export function generateSocial(plan:ArticlePlan){return {linkedin:`${plan.title}\n\n${plan.angle}\n\nRead the field note in Crystal // Forge.`,xThread:[`A new field note: ${plan.title}`,plan.angle,"The full breakdown is now in the archive."],discord:`NEW TRANSMISSION\n${plan.title}\n${plan.angle}`};}
