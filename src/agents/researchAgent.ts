import type { ContentAgent } from "./types";
export const researchAgent: ContentAgent = { name:"RESEARCH AGENT", async run(context) { return {status:"queued",message:`Research queue opened for ${context.topic ?? "new signals"}.`}; } };
