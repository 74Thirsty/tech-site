import type { JobResult } from "./types";
export async function runSocialJob():Promise<JobResult>{return {job:"social",status:"COMPLETE",startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),errors:[],outputCount:0};}
