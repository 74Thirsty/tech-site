import { env } from "./env";

// ─── Multi-Provider AI Client ────────────────────────────────────────────────
// Rotates across providers and models to avoid rate limits.
// Retries on 429 with exponential backoff.

interface Provider {
  name: string;
  url: string;
  key: string | undefined;
  models: string[];
}

const PROVIDERS: Provider[] = [
  {
    name: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: env.groqApiKey,
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3.6-27b"],
  },
  {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: env.openrouterApiKey,
    models: ["deepseek/deepseek-r1:free", "meta-llama/llama-3.3-70b-instruct:free"],
  },
  {
    name: "Puter",
    url: "https://api.puter.com/puterai/openai/v1/chat/completions",
    key: env.puterAuthToken,
    models: ["claude-sonnet-4-6"],
  },
  {
    name: "Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    key: env.geminiApiKey,
    models: ["gemini-2.0-flash"],
  },
];

let modelIndex = 0;
let providerIndex = 0;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateContent(prompt: string): Promise<string> {
  const errors: string[] = [];

  // Try each provider, rotating models within each
  for (let pIdx = 0; pIdx < PROVIDERS.length; pIdx++) {
    const p = PROVIDERS[(providerIndex + pIdx) % PROVIDERS.length];
    if (!p.key) {
      errors.push(`${p.name}: no API key`);
      continue;
    }

    const modelOffset = pIdx === 0 ? modelIndex : 0;

    for (let mIdx = 0; mIdx < p.models.length; mIdx++) {
      const model = p.models[(modelOffset + mIdx) % p.models.length];
      const MAX_RETRIES = 2;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = attempt * 3000;
            console.log(`  ${p.name}/${model} retry ${attempt} after ${delay}ms`);
            await sleep(delay);
          }

          console.log(`Trying ${p.name} (${model})...`);
          const response = await fetch(p.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${p.key}`,
              ...(p.name === "OpenRouter" ? { "HTTP-Referer": "https://stratagemconsulting.net" } : {}),
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (response.status === 429) {
            console.log(`  ${p.name}/${model} rate limited`);
            errors.push(`${p.name}/${model} 429`);
            break; // Try next model
          }

          if (!response.ok) {
            const body = await response.text().catch(() => "");
            errors.push(`${p.name}/${model} ${response.status}: ${body.slice(0, 80)}`);
            break; // Try next model
          }

          const data = await response.json();
          if (data?.choices?.[0]?.message?.content) {
            console.log(`✓ ${p.name}/${model} succeeded`);
            // Rotate model for next call
            modelIndex = (modelIndex + 1) % p.models.length;
            providerIndex = pIdx;
            return data.choices[0].message.content.trim();
          }

          errors.push(`${p.name}/${model}: bad response format`);
          break;
        } catch (error) {
          errors.push(`${p.name}/${model}: ${String(error)}`);
          break;
        }
      }
    }
  }

  throw new Error(`All AI providers failed:\n${errors.join("\n")}`);
}

/** Wait between pipeline steps to avoid hammering rate limits */
export async function pipelineDelay(): Promise<void> {
  await sleep(2000);
}

export function getProviderStatus(): Array<{ name: string; configured: boolean; models: string[] }> {
  return PROVIDERS.map(p => ({
    name: p.name,
    configured: Boolean(p.key),
    models: p.models,
  }));
}
