import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY as string);
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e: any) {
    console.error("Webhook signature verification failed:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Checkout completed:", session.id, session.customer_email);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("Invoice paid:", invoice.id);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("Invoice payment failed:", invoice.id);
      break;
    }
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      console.log("Subscription created:", sub.id);
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      console.log("Subscription updated:", sub.id, sub.status);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      console.log("Subscription cancelled:", sub.id);
      break;
    }
    default:
      console.log("Unhandled event type:", event.type);
  }

  return NextResponse.json({ received: true });
}
