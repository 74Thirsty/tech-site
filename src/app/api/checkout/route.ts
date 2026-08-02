import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request:Request) {
  const {priceId} = await request.json().catch(() => ({}));
  if (!env.siteUrl || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({error:"Payments are not configured."},{status:503});
  if (typeof priceId !== "string" || !priceId.startsWith("price_")) return NextResponse.json({error:"A valid Stripe price is required."},{status:400});
  const params = new URLSearchParams({mode:"payment",success_url:`${env.siteUrl}/?purchase=success`,cancel_url:`${env.siteUrl}/?purchase=cancelled`});
  params.append("line_items[0][price]",priceId); params.append("line_items[0][quantity]","1");
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,"Content-Type":"application/x-www-form-urlencoded"},body:params});
  const payload = await response.json();
  return NextResponse.json(payload,{status:response.status});
}
