import { NextResponse } from "next/server";
import { runResearchJob } from "@/jobs/research-job";
import { rateLimit } from "@/lib/rate-limit";
import { supabaseRequest } from "@/lib/supabase";

async function execute(request:Request){const auth=request.headers.get("authorization");const secret=request.headers.get("x-cron-secret");if(!process.env.CRON_SECRET||!(secret===process.env.CRON_SECRET||auth===`Bearer ${process.env.CRON_SECRET}`))return NextResponse.json({error:"Unauthorized job request"},{status:401});if(!rateLimit("research-job",1,300_000))return NextResponse.json({error:"Job rate limit exceeded"},{status:429});const result=await runResearchJob();await supabaseRequest("job_runs",{method:"POST",body:JSON.stringify({job_name:result.job,status:result.status,started_at:result.startedAt,finished_at:result.finishedAt,error_state:result.errors,output_count:result.outputCount})});return NextResponse.json(result,{status:result.status === "FAILED" ? 500 : 200});}
export async function POST(request:Request){return execute(request);}
export async function GET(request:Request){return execute(request);}
