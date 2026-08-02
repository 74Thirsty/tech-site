import type { ArticlePlan } from "./types";
export function writeDraft(plan:ArticlePlan){return [`# ${plan.title}`,"",`> ${plan.angle}`,"",...plan.sections.map((section)=>`## ${section}\n\nEditorial draft pending human research and voice pass.`)].join("\n");}
