import type { ScoredOpportunity } from "@/intelligence/types";
export type ArticlePlan={title:string;angle:string;audience:string;sections:string[];sourceUrls:string[];status:"DRAFT"|"NEEDS_REVIEW"|"APPROVED"};
import type { Evaluation } from "@/evaluation/types";import type { SeoAnalysis } from "@/seo/types";
export type EditorialResult={plan:ArticlePlan;draft:string;review:Evaluation;seo:SeoAnalysis};
