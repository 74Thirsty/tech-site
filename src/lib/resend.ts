import { env } from "./env";

export async function sendSubscriberConfirmation(email:string) {
  if (!env.resendApiKey) return {sent:false,reason:"RESEND_API_KEY is not configured"};
  const response = await fetch("https://api.resend.com/emails", {method:"POST",headers:{Authorization:`Bearer ${env.resendApiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from:env.newsletterFrom,to:[email],subject:"Welcome to The Signal",html:`<p>Transmission received.</p><p>Welcome to Neon//Forge. Your first signal is on its way.</p>`})});
  if (!response.ok) throw new Error(`Resend request failed: ${response.status}`);
  return {sent:true};
}
