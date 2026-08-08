import type { DetectedEntity } from "./entity-detector";

// ─── Query Generator ─────────────────────────────────────────────────────────
// Converts detected entities into commercially meaningful Amazon search queries.
// Does NOT blindly search article titles — generates short, targeted queries.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductQuery {
  query: string;
  entity: string;
  intent: string;
  priority: number; // Higher = more likely to produce relevant results
}

// ─── Category Refinements ────────────────────────────────────────────────────
// Adds context-specific terms to queries based on article category.

const CATEGORY_REFINEMENTS: Record<string, string[]> = {
  SECURITY: ["professional", "penetration testing", "cybersecurity"],
  LINUX: ["professional", "enterprise"],
  BLOCKCHAIN: ["hardware wallet", "cold storage"],
  NETWORKING: ["professional", "enterprise grade"],
  DEVOPS: ["home lab", "server"],
  SYSTEMS: ["professional", "engineering"],
  PROGRAMMING: ["reference", "professional"],
  PRIVACY: ["privacy", "encrypted"],
};

// ─── Query Generation ────────────────────────────────────────────────────────

export function generateQueries(
  entities: DetectedEntity[],
  articleCategory: string,
  articleTags: string[]
): ProductQuery[] {
  const queries: ProductQuery[] = [];
  const seen = new Set<string>();

  const refinements = CATEGORY_REFINEMENTS[articleCategory] ?? [];

  for (const entity of entities) {
    // Use entity's search templates as base queries
    for (const template of entity.searchTemplates) {
      if (seen.has(template)) continue;
      seen.add(template);

      queries.push({
        query: template,
        entity: entity.term,
        intent: entity.intent,
        priority: entity.intent === "DIRECT" ? 3 : 1,
      });

      // Add refined versions using category context
      if (refinements.length > 0) {
        const refined = `${template} ${refinements[0]}`;
        if (!seen.has(refined)) {
          seen.add(refined);
          queries.push({
            query: refined,
            entity: entity.term,
            intent: entity.intent,
            priority: entity.intent === "DIRECT" ? 2 : 0,
          });
        }
      }
    }

    // Generate compound queries from entity + product type
    if (entity.productType.includes("/")) {
      const parts = entity.productType.split("/");
      for (const part of parts) {
        const compound = `${entity.term} ${part}`;
        if (!seen.has(compound)) {
          seen.add(compound);
          queries.push({
            query: compound,
            entity: entity.term,
            intent: entity.intent,
            priority: entity.intent === "DIRECT" ? 2 : 1,
          });
        }
      }
    }
  }

  // Add tag-based queries as supplementary
  for (const tag of articleTags.slice(0, 2)) {
    const tagLower = tag.toLowerCase();
    // Only add if it maps to a known product category
    for (const key of Object.keys(PRODUCT_CATEGORY_MAP)) {
      if (tagLower.includes(key) || key.includes(tagLower)) {
        const tagQuery = tag;
        if (!seen.has(tagQuery)) {
          seen.add(tagQuery);
          queries.push({
            query: tagQuery,
            entity: key,
            intent: "SUPPORTING",
            priority: 0,
          });
        }
        break;
      }
    }
  }

  // Sort by priority descending, return top 5
  return queries.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

// ─── Lazy import of PRODUCT_CATEGORY_MAP ──────────────────────────────────────
// Avoid circular dependency — re-export the key list inline
const PRODUCT_CATEGORY_MAP_KEYS = [
  "displayport", "hdmi", "ethernet", "router", "ssd", "nvme", "usb flash drive",
  "raspberry pi", "arduino", "esp32", "keyboard", "monitor", "usb hub",
  "smart contracts", "solidity", "ethereum", "bitcoin", "linux", "docker",
  "kubernetes", "python", "rust", "penetration testing", "cryptography",
  "laptop", "server", "home lab", "homelab", "ups", "soldering iron",
  "multimeter", "oscilloscope", "wifi adapter", "yubikey", "sdr",
];

const PRODUCT_CATEGORY_MAP: Record<string, unknown> = {};
for (const key of PRODUCT_CATEGORY_MAP_KEYS) {
  PRODUCT_CATEGORY_MAP[key] = true;
}
