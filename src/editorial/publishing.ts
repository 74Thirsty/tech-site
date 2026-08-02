import type { ArticlePlan } from "./types";
export function requestApproval(plan:ArticlePlan){return {...plan,status:"NEEDS_REVIEW" as const,approvalRequired:true,submittedAt:new Date().toISOString()};}
