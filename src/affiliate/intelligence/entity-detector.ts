import type { ArticlePlan } from "@/research/types";

// ─── Entity Detector ─────────────────────────────────────────────────────────
// Analyzes article topic, tags, category, and research facts to detect
// product-relevant entities. Deterministic pattern matching — no AI call.
// Classifies intent: DIRECT (reader needs this), SUPPORTING (improves workflow),
// INCIDENTAL (no purchase opportunity — filtered out).

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DetectedEntity {
  term: string;
  intent: "DIRECT" | "SUPPORTING";
  productType: string;
  searchTemplates: string[];
  confidence: number;
}

// ─── Product Category Map ────────────────────────────────────────────────────
// Structured mapping, not a flat list. Each entry maps a recognizable term
// to its product intent, type, and Amazon search templates.

interface CategoryMapping {
  intent: "DIRECT" | "SUPPORTING";
  productType: string;
  searchTemplates: string[];
}

const PRODUCT_CATEGORY_MAP: Record<string, CategoryMapping> = {
  // ── Connectivity & Cables ─────────────────────────────────────
  displayport: { intent: "DIRECT", productType: "adapter/cable", searchTemplates: ["DisplayPort HDMI adapter", "DisplayPort cable"] },
  hdmi: { intent: "DIRECT", productType: "cable/adapter", searchTemplates: ["HDMI cable", "HDMI adapter"] },
  "displayport to hdmi": { intent: "DIRECT", productType: "adapter", searchTemplates: ["DisplayPort to HDMI adapter"] },
  usbc: { intent: "SUPPORTING", productType: "cable/adapter", searchTemplates: ["USB-C hub adapter"] },
  "usb-c": { intent: "SUPPORTING", productType: "cable/adapter", searchTemplates: ["USB-C hub adapter"] },
  "usb type-c": { intent: "SUPPORTING", productType: "cable/adapter", searchTemplates: ["USB-C hub adapter"] },
  thunderbolt: { intent: "SUPPORTING", productType: "cable/adapter", searchTemplates: ["Thunderbolt cable"] },
  ethernet: { intent: "DIRECT", productType: "cable/adapter", searchTemplates: ["Ethernet cable Cat6", "USB ethernet adapter"] },
  "network cable": { intent: "DIRECT", productType: "cable", searchTemplates: ["Ethernet cable Cat6"] },
  fiber: { intent: "SUPPORTING", productType: "cable", searchTemplates: ["fiber optic cable"] },
  "patch cable": { intent: "DIRECT", productType: "cable", searchTemplates: ["Ethernet patch cable"] },

  // ── Networking ────────────────────────────────────────────────
  router: { intent: "DIRECT", productType: "networking", searchTemplates: ["WiFi router", "gaming router"] },
  "wifi router": { intent: "DIRECT", productType: "networking", searchTemplates: ["WiFi 6 router"] },
  switch: { intent: "DIRECT", productType: "networking", searchTemplates: ["network switch gigabit"] },
  "network switch": { intent: "DIRECT", productType: "networking", searchTemplates: ["managed network switch"] },
  "access point": { intent: "DIRECT", productType: "networking", searchTemplates: ["WiFi access point"] },
  wifi: { intent: "SUPPORTING", productType: "adapter", searchTemplates: ["WiFi USB adapter"] },
  "wifi adapter": { intent: "DIRECT", productType: "network adapter", searchTemplates: ["WiFi adapter monitor mode"] },
  bluetooth: { intent: "SUPPORTING", productType: "adapter", searchTemplates: ["Bluetooth USB adapter"] },
  vpn: { intent: "SUPPORTING", productType: "router/firewall", searchTemplates: ["VPN router"] },
  wireguard: { intent: "SUPPORTING", productType: "router", searchTemplates: ["WireGuard compatible router"] },
  "network tap": { intent: "DIRECT", productType: "network tool", searchTemplates: ["network tap"] },
  "packet capture": { intent: "SUPPORTING", productType: "network adapter", searchTemplates: ["USB network adapter monitor mode"] },
  promiscuous: { intent: "SUPPORTING", productType: "network adapter", searchTemplates: ["USB network adapter promiscuous mode"] },

  // ── Storage ───────────────────────────────────────────────────
  ssd: { intent: "DIRECT", productType: "storage", searchTemplates: ["SSD internal 1TB", "USB SSD enclosure"] },
  "nvme": { intent: "DIRECT", productType: "storage", searchTemplates: ["NVMe SSD 1TB"] },
  "nvme ssd": { intent: "DIRECT", productType: "storage", searchTemplates: ["NVMe SSD 1TB"] },
  "hard drive": { intent: "DIRECT", productType: "storage", searchTemplates: ["external hard drive"] },
  hdd: { intent: "DIRECT", productType: "storage", searchTemplates: ["external hard drive"] },
  "usb flash drive": { intent: "DIRECT", productType: "storage", searchTemplates: ["USB flash drive 32GB"] },
  "flash drive": { intent: "DIRECT", productType: "storage", searchTemplates: ["USB flash drive"] },
  "bootable media": { intent: "DIRECT", productType: "storage", searchTemplates: ["USB flash drive 32GB"] },
  "bootable usb": { intent: "DIRECT", productType: "storage", searchTemplates: ["USB flash drive 32GB"] },
  "usb drive": { intent: "DIRECT", productType: "storage", searchTemplates: ["USB flash drive"] },
  microsd: { intent: "DIRECT", productType: "storage", searchTemplates: ["microSD card 128GB"] },
  "sd card": { intent: "DIRECT", productType: "storage", searchTemplates: ["SD card 128GB"] },
  "sd card reader": { intent: "DIRECT", productType: "accessory", searchTemplates: ["USB SD card reader"] },

  // ── Hardware / SBC ────────────────────────────────────────────
  "raspberry pi": { intent: "DIRECT", productType: "single-board computer", searchTemplates: ["Raspberry Pi 5"] },
  arduino: { intent: "DIRECT", productType: "microcontroller", searchTemplates: ["Arduino Uno starter kit"] },
  esp32: { intent: "DIRECT", productType: "microcontroller", searchTemplates: ["ESP32 development board"] },
  "beaglebone": { intent: "DIRECT", productType: "single-board computer", searchTemplates: ["BeagleBone Black"] },
  fpga: { intent: "DIRECT", productType: "development board", searchTemplates: ["FPGA development board"] },

  // ── Security Tools ────────────────────────────────────────────
  "penetration testing": { intent: "SUPPORTING", productType: "book", searchTemplates: ["penetration testing book"] },
  "pen test": { intent: "SUPPORTING", productType: "book", searchTemplates: ["penetration testing book"] },
  "ethical hacking": { intent: "SUPPORTING", productType: "book", searchTemplates: ["ethical hacking book"] },
  "security audit": { intent: "SUPPORTING", productType: "book", searchTemplates: ["cybersecurity book"] },
  forensics: { intent: "SUPPORTING", productType: "book", searchTemplates: ["digital forensics book"] },
  "digital forensics": { intent: "SUPPORTING", productType: "book", searchTemplates: ["digital forensics book"] },
  "malware analysis": { intent: "SUPPORTING", productType: "book", searchTemplates: ["malware analysis book"] },
  "reverse engineering": { intent: "SUPPORTING", productType: "book", searchTemplates: ["reverse engineering book"] },
  "usb rubber ducky": { intent: "DIRECT", productType: "security tool", searchTemplates: ["USB Rubber Ducky"] },
  "hack rf": { intent: "DIRECT", productType: "SDR tool", searchTemplates: ["HackRF One SDR"] },
  "wifi pineapple": { intent: "DIRECT", productType: "security tool", searchTemplates: ["WiFi Pineapple"] },
  sdr: { intent: "DIRECT", productType: "SDR tool", searchTemplates: ["RTL-SDR USB dongle"] },
  "software defined radio": { intent: "DIRECT", productType: "SDR tool", searchTemplates: ["RTL-SDR USB dongle"] },
  yubikey: { intent: "DIRECT", productType: "security key", searchTemplates: ["YubiKey 5"] },
  "hardware token": { intent: "DIRECT", productType: "security key", searchTemplates: ["YubiKey security key"] },
  "2fa key": { intent: "DIRECT", productType: "security key", searchTemplates: ["YubiKey security key"] },

  // ── Peripherals ───────────────────────────────────────────────
  keyboard: { intent: "SUPPORTING", productType: "peripheral", searchTemplates: ["mechanical keyboard"] },
  mouse: { intent: "SUPPORTING", productType: "peripheral", searchTemplates: ["ergonomic mouse"] },
  monitor: { intent: "DIRECT", productType: "display", searchTemplates: ["computer monitor 27 inch"] },
  "external monitor": { intent: "DIRECT", productType: "display", searchTemplates: ["portable USB monitor"] },
  "usb hub": { intent: "SUPPORTING", productType: "accessory", searchTemplates: ["USB hub powered"] },
  "docking station": { intent: "DIRECT", productType: "accessory", searchTemplates: ["USB-C docking station"] },
  webcam: { intent: "SUPPORTING", productType: "peripheral", searchTemplates: ["1080p webcam"] },
  microphone: { intent: "SUPPORTING", productType: "peripheral", searchTemplates: ["USB microphone"] },
  headphones: { intent: "SUPPORTING", productType: "peripheral", searchTemplates: ["noise canceling headphones"] },
  speakers: { intent: "SUPPORTING", productType: "peripheral", searchTemplates: ["computer speakers"] },

  // ── Power & Protection ────────────────────────────────────────
  ups: { intent: "DIRECT", productType: "power protection", searchTemplates: ["UPS battery backup"] },
  "battery backup": { intent: "DIRECT", productType: "power protection", searchTemplates: ["UPS battery backup"] },
  surge: { intent: "SUPPORTING", productType: "power protection", searchTemplates: ["surge protector"] },
  "power supply": { intent: "DIRECT", productType: "component", searchTemplates: ["modular power supply"] },
  psu: { intent: "DIRECT", productType: "component", searchTemplates: ["modular power supply"] },

  // ── Books (by topic) ──────────────────────────────────────────
  "smart contracts": { intent: "SUPPORTING", productType: "book", searchTemplates: ["Solidity programming book"] },
  solidity: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Solidity programming book"] },
  ethereum: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Ethereum development book"] },
  bitcoin: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Bitcoin technology book"] },
  cryptocurrency: { intent: "SUPPORTING", productType: "book", searchTemplates: ["cryptocurrency investing book"] },
  blockchain: { intent: "SUPPORTING", productType: "book", searchTemplates: ["blockchain technology book"] },
  defi: { intent: "SUPPORTING", productType: "book", searchTemplates: ["DeFi book"] },
  cryptography: { intent: "SUPPORTING", productType: "book", searchTemplates: ["cryptography book"] },
  "zero knowledge": { intent: "SUPPORTING", productType: "book", searchTemplates: ["zero knowledge proofs book"] },
  linux: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Linux administration book"] },
  networking: { intent: "SUPPORTING", productType: "book", searchTemplates: ["computer networking book"] },
  docker: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Docker Kubernetes book"] },
  kubernetes: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Kubernetes book"] },
  terraform: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Terraform book"] },
  ansible: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Ansible book"] },
  python: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Python programming book"] },
  rust: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Rust programming book"] },
  golang: { intent: "SUPPORTING", productType: "book", searchTemplates: ["Go programming book"] },
  "machine learning": { intent: "SUPPORTING", productType: "book", searchTemplates: ["machine learning book"] },
  "deep learning": { intent: "SUPPORTING", productType: "book", searchTemplates: ["deep learning book"] },
  ai: { intent: "SUPPORTING", productType: "book", searchTemplates: ["artificial intelligence book"] },

  // ── Computing Hardware ────────────────────────────────────────
  laptop: { intent: "DIRECT", productType: "computer", searchTemplates: ["laptop"] },
  "mini pc": { intent: "DIRECT", productType: "computer", searchTemplates: ["mini PC"] },
  "nuc": { intent: "DIRECT", productType: "computer", searchTemplates: ["Intel NUC mini PC"] },
  server: { intent: "DIRECT", productType: "computer", searchTemplates: ["home server rack"] },
  "home lab": { intent: "DIRECT", productType: "computing", searchTemplates: ["home lab server"] },
  homelab: { intent: "DIRECT", productType: "computing", searchTemplates: ["home lab server rack"] },
  rack: { intent: "DIRECT", productType: "furniture", searchTemplates: ["server rack 12U"] },
  "server rack": { intent: "DIRECT", productType: "furniture", searchTemplates: ["server rack"] },

  // ── Cooling & Environment ─────────────────────────────────────
  "fan controller": { intent: "DIRECT", productType: "cooling", searchTemplates: ["fan controller"] },
  cooling: { intent: "SUPPORTING", productType: "cooling", searchTemplates: ["PC cooling fan"] },
  "thermal paste": { intent: "DIRECT", productType: "thermal compound", searchTemplates: ["thermal paste"] },

  // ── Misc Tools ────────────────────────────────────────────────
  multimeter: { intent: "DIRECT", productType: "tool", searchTemplates: ["digital multimeter"] },
  soldering: { intent: "DIRECT", productType: "tool", searchTemplates: ["soldering iron kit"] },
  "soldering iron": { intent: "DIRECT", productType: "tool", searchTemplates: ["soldering iron kit"] },
  "oscilloscope": { intent: "DIRECT", productType: "tool", searchTemplates: ["USB oscilloscope"] },
  "logic analyzer": { intent: "DIRECT", productType: "tool", searchTemplates: ["USB logic analyzer"] },
  "cable tester": { intent: "DIRECT", productType: "tool", searchTemplates: ["Ethernet cable tester"] },
  "crimping tool": { intent: "DIRECT", productType: "tool", searchTemplates: ["Ethernet crimping tool kit"] },
  "label maker": { intent: "SUPPORTING", productType: "tool", searchTemplates: ["cable label maker"] },
};

// ─── Detection Logic ─────────────────────────────────────────────────────────

function extractTermsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const terms: string[] = [];

  // Check all known product categories
  for (const key of Object.keys(PRODUCT_CATEGORY_MAP)) {
    if (lower.includes(key)) {
      terms.push(key);
    }
  }

  return [...new Set(terms)];
}

function extractTermsFromTags(tags: string[]): string[] {
  const terms: string[] = [];
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const key of Object.keys(PRODUCT_CATEGORY_MAP)) {
      if (lower.includes(key) || key.includes(lower)) {
        terms.push(key);
      }
    }
  }
  return [...new Set(terms)];
}

export function detectEntities(plan: ArticlePlan): DetectedEntity[] {
  // Combine all text sources
  const textSources = [
    plan.title,
    plan.subtitle,
    plan.excerpt,
    plan.tags.join(" "),
    plan.keywords.join(" "),
    plan.researchPackage.facts.join(" "),
    plan.researchPackage.analysis
      .map(a => `${a.analysis.whatHappened} ${a.analysis.technicalSignificance}`)
      .join(" "),
  ].join(" ");

  // Extract from text + tags
  const textTerms = extractTermsFromText(textSources);
  const tagTerms = extractTermsFromTags(plan.tags);
  const allTerms = [...new Set([...textTerms, ...tagTerms])];

  // Map to entities
  const entities: DetectedEntity[] = [];
  const seen = new Set<string>();

  for (const term of allTerms) {
    if (seen.has(term)) continue;
    seen.add(term);

    const mapping = PRODUCT_CATEGORY_MAP[term];
    if (!mapping) continue;

    // Skip INCIDENTAL intent — never worth displaying
    if (mapping.intent === ("INCIDENTAL" as "DIRECT")) continue;

    // Calculate confidence based on how many times the term appears
    const occurrences = (textSources.match(new RegExp(term, "gi")) ?? []).length;
    const confidence = Math.min(0.5 + occurrences * 0.1, 1.0);

    entities.push({
      term,
      intent: mapping.intent,
      productType: mapping.productType,
      searchTemplates: mapping.searchTemplates,
      confidence,
    });
  }

  // Sort by confidence descending
  return entities.sort((a, b) => b.confidence - a.confidence);
}
