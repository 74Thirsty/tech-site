import { analyzePerformance, type PerformanceRow } from "./analyzer";import { recommendNext } from "./recommendations";
export function buildAudienceReport(rows:PerformanceRow[]){return {ranked:analyzePerformance(rows),insight:recommendNext(rows),generatedAt:new Date().toISOString()};}
