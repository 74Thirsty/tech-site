import type { JobResult } from "./types";
export async function runAnalyticsJob():Promise<JobResult>{return {job:"analytics",status:"COMPLETE",startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),errors:[],outputCount:0};}
