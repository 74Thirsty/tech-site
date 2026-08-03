import type { ScoredOpportunity } from "@/intelligence/types";

export type ArticleTopic = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  difficulty: string;
  readTime: string;
  xp: number;
  excerpt: string;
  tags: string[];
  keywords: string[];
};

const TOPIC_POOL: ArticleTopic[] = [
  {
    slug: "zero-trust-network-architecture",
    title: "Zero Trust is not a product",
    subtitle: "Building network architecture that never trusts, always verifies",
    category: "SECURITY",
    difficulty: "ADVANCED",
    readTime: "16 MIN",
    xp: 340,
    excerpt: "Zero trust architecture assumes every connection is compromised. The network is the enemy. Your own infrastructure is hostile. Verify everything, trust nothing.",
    tags: ["SECURITY", "NETWORKING", "INFRASTRUCTURE"],
    keywords: ["zero trust", "network security", "microsegmentation", "identity verification", "least privilege"]
  },
  {
    slug: "building-home-lab",
    title: "Your home lab is your training ground",
    subtitle: "Infrastructure you control, mistakes you own",
    category: "LINUX",
    difficulty: "INTERMEDIATE",
    readTime: "12 MIN",
    xp: 260,
    excerpt: "A home lab is not a hobby. It is a training environment where you break things safely, test hypotheses, and build muscle memory for production systems.",
    tags: ["LINUX", "INFRASTRUCTURE", "DEVOPS"],
    keywords: ["home lab", "self-hosting", "virtualization", "proxmox", "docker"]
  },
  {
    slug: "smart-contract-auditing",
    title: "Reading Solidity like an attacker",
    subtitle: "The audit mindset for smart contract developers",
    category: "BLOCKCHAIN",
    difficulty: "ADVANCED",
    readTime: "18 MIN",
    xp: 380,
    excerpt: "Every line of Solidity is a potential exploit. The auditor reads code differently: not to understand what it does, but to understand what it makes possible.",
    tags: ["BLOCKCHAIN", "SECURITY", "PROGRAMMING"],
    keywords: ["smart contract", "audit", "solidity", "reentrancy", "overflow"]
  },
  {
    slug: "linux-filesystem-forensics",
    title: "The filesystem remembers everything",
    subtitle: "Digital forensics on Linux systems",
    category: "SECURITY",
    difficulty: "ADVANCED",
    readTime: "14 MIN",
    xp: 320,
    excerpt: "Every file creation, modification, and deletion leaves traces. The filesystem is a timeline. Forensics is reading that timeline backward.",
    tags: ["SECURITY", "LINUX", "DIGITAL FORENSICS"],
    keywords: ["forensics", "filesystem", "timeline analysis", "metadata", "evidence"]
  },
  {
    slug: "container-security-hardening",
    title: "Containers are not sandboxed",
    subtitle: "Security hardening for containerized workloads",
    category: "SECURITY",
    difficulty: "INTERMEDIATE",
    readTime: "13 MIN",
    xp: 290,
    excerpt: "Containers share a kernel. They share namespaces. They share cgroups. The isolation boundary is software, not hardware. Treat every container as potentially compromised.",
    tags: ["SECURITY", "LINUX", "DEVOPS"],
    keywords: ["container", "docker", "security", "seccomp", "capabilities"]
  },
  {
    slug: "privacy-focused-linux-desktop",
    title: "Your desktop is a surveillance platform",
    subtitle: "Building a privacy-focused Linux workstation",
    category: "PRIVACY",
    difficulty: "INTERMEDIATE",
    readTime: "15 MIN",
    xp: 300,
    excerpt: "Every operating system phones home. Every browser leaks data. Every extension reports back. Building a private workstation means understanding and blocking every leak.",
    tags: ["PRIVACY", "LINUX", "HARDWARE"],
    keywords: ["privacy", "linux", "desktop", "surveillance", "hardening"]
  },
  {
    slug: "defi-liquidation-mechanics",
    title: "Liquidation is not punishment",
    subtitle: "How DeFi protocols enforce solvency",
    category: "BLOCKCHAIN",
    difficulty: "ADVANCED",
    readTime: "14 MIN",
    xp: 330,
    excerpt: "Liquidation mechanisms are the immune system of DeFi. They keep protocols solvent by incentivizing external actors to close underwater positions.",
    tags: ["BLOCKCHAIN", "DEFI", "SYSTEMS"],
    keywords: ["liquidation", "defi", "collateral", "oracle", "solvency"]
  },
  {
    slug: "network-traffic-analysis",
    title: "Every packet tells a story",
    subtitle: "Network traffic analysis with Wireshark and tcpdump",
    category: "NETWORKING",
    difficulty: "INTERMEDIATE",
    readTime: "13 MIN",
    xp: 270,
    excerpt: "Network traffic is the heartbeat of your infrastructure. Every connection, every request, every response is visible. The challenge is knowing what to look for.",
    tags: ["NETWORKING", "SECURITY", "LINUX"],
    keywords: ["wireshark", "tcpdump", "packet analysis", "network", "traffic"]
  },
  {
    slug: "api-security-hardening",
    title: "APIs are the new perimeter",
    subtitle: "Security patterns for modern API architectures",
    category: "SECURITY",
    difficulty: "INTERMEDIATE",
    readTime: "12 MIN",
    xp: 260,
    excerpt: "The API is the front door. Authentication, authorization, rate limiting, input validation — every layer matters. A single missed check opens the entire system.",
    tags: ["SECURITY", "PROGRAMMING", "SYSTEMS"],
    keywords: ["api", "security", "authentication", "rate limiting", "input validation"]
  },
  {
    slug: "cryptography-fundamentals",
    title: "Math does not negotiate",
    subtitle: "Practical cryptography for engineers",
    category: "SECURITY",
    difficulty: "ADVANCED",
    readTime: "16 MIN",
    xp: 350,
    excerpt: "Cryptography is not magic. It is math with specific properties. Understanding the math is the difference between using crypto correctly and using it as a security placebo.",
    tags: ["SECURITY", "CRYPTOGRAPHY", "PROGRAMMING"],
    keywords: ["cryptography", "encryption", "hashing", "key exchange", "digital signatures"]
  },
  {
    slug: "git-advanced-techniques",
    title: "Git is a content-addressable filesystem",
    subtitle: "Advanced Git internals and workflows",
    category: "PROGRAMMING",
    difficulty: "INTERMEDIATE",
    readTime: "11 MIN",
    xp: 240,
    excerpt: "Git is not a version control system. It is a content-addressable filesystem with a version control interface. Understanding the internals changes how you use it.",
    tags: ["PROGRAMMING", "DEVOPS", "LINUX"],
    keywords: ["git", "version control", "rebase", "cherry-pick", "bisect"]
  },
  {
    slug: "wireless-security-auditing",
    title: "Wi-Fi is broadcast by definition",
    subtitle: "Wireless network security assessment",
    category: "SECURITY",
    difficulty: "ADVANCED",
    readTime: "14 MIN",
    xp: 310,
    excerpt: "Wireless networks broadcast through walls. Encryption is the only barrier. WPA3 is minimum. Anything less is an open invitation.",
    tags: ["SECURITY", "NETWORKING", "HARDWARE"],
    keywords: ["wireless", "wifi", "security", "auditing", "wpa3"]
  },
  {
    slug: "distributed-systems-patterns",
    title: "Consistency is a spectrum",
    subtitle: "Patterns for building reliable distributed systems",
    category: "SYSTEMS",
    difficulty: "ADVANCED",
    readTime: "17 MIN",
    xp: 360,
    excerpt: "Distributed systems fail in ways that centralized systems never do. Network partitions, clock skew, split brains — the CAP theorem is not theoretical.",
    tags: ["SYSTEMS", "PROGRAMMING", "INFRASTRUCTURE"],
    keywords: ["distributed systems", "consensus", "cap theorem", "raft", "paxos"]
  },
  {
    slug: "osint-reconnaissance",
    title: "The internet remembers everything",
    subtitle: "Open source intelligence gathering techniques",
    category: "SECURITY",
    difficulty: "INTERMEDIATE",
    readTime: "13 MIN",
    xp: 280,
    excerpt: "Every social media post, every DNS record, every WHOIS entry, every Wayback Machine snapshot — the internet is the world's largest intelligence database.",
    tags: ["SECURITY", "OSINT", "PRIVACY"],
    keywords: ["osint", "reconnaissance", "intelligence", "social engineering", "footprinting"]
  },
  {
    slug: "dns-deep-dive",
    title: "DNS is the phone book that never sleeps",
    subtitle: "Understanding and securing the Domain Name System",
    category: "NETWORKING",
    difficulty: "INTERMEDIATE",
    readTime: "12 MIN",
    xp: 250,
    excerpt: "Every internet connection starts with DNS. The system that translates names to numbers is also the system that logs every request, every destination, every intent.",
    tags: ["NETWORKING", "SECURITY", "LINUX"],
    keywords: ["dns", "domain name system", "dnssec", "doh", "resolver"]
  },
  {
    slug: "automation-with-ansible",
    title: "Automate everything you do twice",
    subtitle: "Infrastructure automation with Ansible",
    category: "DEVOPS",
    difficulty: "INTERMEDIATE",
    readTime: "11 MIN",
    xp: 230,
    excerpt: "If you do it twice, automate it. If you do it once but will do it again, automate it. Manual processes are bugs in your infrastructure.",
    tags: ["DEVOPS", "LINUX", "INFRASTRUCTURE"],
    keywords: ["ansible", "automation", "playbook", "infrastructure", "configuration management"]
  },
  {
    slug: "reverse-engineering-basics",
    title: "Binary is the ground truth",
    subtitle: "Introduction to reverse engineering and disassembly",
    category: "SECURITY",
    difficulty: "ADVANCED",
    readTime: "15 MIN",
    xp: 330,
    excerpt: "Source code is a luxury. Reverse engineering is reading the binary directly. When you cannot see the source, the assembly is all you have.",
    tags: ["SECURITY", "REVERSE ENGINEERING", "HARDWARE"],
    keywords: ["reverse engineering", "disassembly", "ida pro", "gdb", "binary analysis"]
  },
  {
    slug: "blockchain-layer2-scaling",
    title: "Layer 2 is not a compromise",
    subtitle: "Scaling Ethereum without sacrificing security",
    category: "BLOCKCHAIN",
    difficulty: "ADVANCED",
    readTime: "14 MIN",
    xp: 310,
    excerpt: "Layer 2 solutions inherit Ethereum's security while moving execution off-chain. The tradeoff is complexity, not security. Understanding the architecture is understanding the future.",
    tags: ["BLOCKCHAIN", "SYSTEMS", "CRYPTOGRAPHY"],
    keywords: ["layer 2", "rollup", "optimistic", "zk-rollup", "scaling"]
  },
  {
    slug: "incident-response-playbook",
    title: "The first hour determines the outcome",
    subtitle: "Building and executing incident response plans",
    category: "SECURITY",
    difficulty: "INTERMEDIATE",
    readTime: "13 MIN",
    xp: 280,
    excerpt: "Incidents are not a matter of if, but when. The difference between a minor event and a catastrophe is the quality of your response in the first hour.",
    tags: ["SECURITY", "INFRASTRUCTURE", "DEVOPS"],
    keywords: ["incident response", "playbook", "forensics", "recovery", "communication"]
  },
  {
    slug: "python-automation-scripts",
    title: "Python is the duct tape of security",
    subtitle: "Automation scripts for security engineers",
    category: "PROGRAMMING",
    difficulty: "BEGINNER",
    readTime: "10 MIN",
    xp: 200,
    excerpt: "Python is not the fastest language. It is the fastest to write. For security automation, speed of development beats speed of execution.",
    tags: ["PROGRAMMING", "SECURITY", "LINUX"],
    keywords: ["python", "automation", "scripting", "security", "tooling"]
  },
];

export function selectTopics(
  researchItems: ScoredOpportunity[],
  count: number = 4
): ArticleTopic[] {
  const existingSlugs = new Set<string>();
  const usedCategories = new Map<string, number>();
  const selected: ArticleTopic[] = [];

  const scored = TOPIC_POOL.map(topic => {
    let score = 0;

    for (const item of researchItems) {
      const itemTopics = item.topics.map(t => t.toLowerCase());
      for (const tag of topic.tags) {
        if (itemTopics.includes(tag.toLowerCase())) {
          score += item.priority / 10;
        }
      }
      for (const kw of topic.keywords) {
        if (item.title.toLowerCase().includes(kw) || item.summary.toLowerCase().includes(kw)) {
          score += 15;
        }
      }
    }

    const catCount = usedCategories.get(topic.category) ?? 0;
    if (catCount >= 2) score -= 50;

    return { topic, score };
  })
  .filter(s => s.score > 0 || researchItems.length === 0)
  .sort((a, b) => b.score - a.score);

  for (const { topic } of scored) {
    if (selected.length >= count) break;
    if (existingSlugs.has(topic.slug)) continue;

    const catCount = usedCategories.get(topic.category) ?? 0;
    if (catCount >= 2 && selected.length < count - 1) continue;

    selected.push(topic);
    existingSlugs.add(topic.slug);
    usedCategories.set(topic.category, catCount + 1);
  }

  while (selected.length < count) {
    for (const { topic } of scored) {
      if (selected.length >= count) break;
      if (existingSlugs.has(topic.slug)) continue;
      selected.push(topic);
      existingSlugs.add(topic.slug);
    }
    break;
  }

  return selected;
}

export function getTopicBySlug(slug: string): ArticleTopic | undefined {
  return TOPIC_POOL.find(t => t.slug === slug);
}

export { TOPIC_POOL };
