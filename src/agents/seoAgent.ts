import type { ContentAgent } from "./types";
export const seoAgent: ContentAgent = { name:"SEO AGENT", async run() { return {status:"queued",message:"Metadata audit queued."}; } };
