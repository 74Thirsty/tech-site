import { NextResponse } from "next/server";
import { hasSupabase, env } from "@/lib/env";

export async function GET(){return NextResponse.json({supabase:hasSupabase(),resend:Boolean(env.resendApiKey),stripe:Boolean(process.env.STRIPE_SECRET_KEY),discord:Boolean(process.env.DISCORD_WEBHOOK_URL),scheduler:Boolean(process.env.CRON_SECRET)});}
