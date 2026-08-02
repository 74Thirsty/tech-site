import type { ContentAgent } from "./types";
export const newsletterAgent: ContentAgent = { name:"NEWSLETTER AGENT", async run() { return {status:"needs_review",message:"Newsletter draft requires human approval."}; } };
