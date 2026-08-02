import type { ArticlePlan } from "./types";
export function formatMission(plan:ArticlePlan){return {type:"MISSION",title:plan.title,difficulty:"INTERMEDIATE",sections:plan.sections,requiresApproval:true};}
