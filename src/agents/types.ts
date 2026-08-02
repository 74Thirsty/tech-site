export type AgentContext = { topic?: string; sourceUrls?: string[]; draft?: string };
export type AgentResult = { status: "queued" | "complete" | "needs_review"; message: string; payload?: unknown };
export interface ContentAgent { name: string; run(context: AgentContext): Promise<AgentResult>; }
