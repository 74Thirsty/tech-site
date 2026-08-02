import type { JobResult } from "./types";
export async function runNewsletterJob():Promise<JobResult>{return {job:"newsletter",status:"COMPLETE",startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),errors:[],outputCount:0};}
