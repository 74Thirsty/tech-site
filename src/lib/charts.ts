const charts: Record<string, { title: string; diagram: string }> = {
  BLOCKCHAIN: {
    title: "Token Arbitrage Flow",
    diagram: `graph LR
    A[Token A] -->|Swap +0.5%| B[Pool USDC/A]
    B -->|Swap +0.3%| C[Pool ETH/USDC]
    C -->|Swap -0.1%| D[Token A]
    A -->|Direct| E[Pool A/B]
    E -->|Swap| F[Token B]
    style A fill:#d4f34a,stroke:#30302b,color:#11110f
    style D fill:#d4f34a,stroke:#30302b,color:#11110f
    style B fill:#1a1a14,stroke:#ff6a2a,color:#e9e8e2
    style C fill:#1a1a14,stroke:#ff6a2a,color:#e9e8e2`,
  },
  SECURITY: {
    title: "Attack Vector Model",
    diagram: `flowchart TD
    A[Attacker] -->|Recon| B{Target}
    B -->|Public| C[GitHub Repos]
    B -->|Network| D[Port Scan]
    B -->|Social| E[Phishing]
    C -->|Secrets| F[API Keys]
    D -->|Vulns| G[Services]
    E -->|Credentials| H[Accounts]
    F -->|Exploit| I[Access]
    G -->|Exploit| I
    H -->|Login| I
    I -->|Pivot| J[Data]
    style A fill:#ff6a2a,stroke:#30302b,color:#e9e8e2
    style I fill:#d4f34a,stroke:#30302b,color:#11110f
    style J fill:#ff6a2a,stroke:#30302b,color:#e9e8e2`,
  },
  AI: {
    title: "Agent Interaction Sequence",
    diagram: `sequenceDiagram
    participant U as User
    participant R as Research Agent
    participant E as Editorial Agent
    participant S as SEO Agent
    participant D as Distribution Agent
    U->>R: Submit Topic
    R->>R: Collect Sources
    R->>E: Research Brief
    E->>E: Generate Draft
    E->>S: Article Draft
    S->>S: Optimize Keywords
    S->>D: SEO Report
    D->>D: Multi-Channel Output
    D->>U: Published Content`,
  },
  LINUX: {
    title: "System Architecture",
    diagram: `graph TD
    A[User Space] -->|syscall| B[Kernel]
    B -->|调度| C[Process Manager]
    B -->|VFS| D[File System]
    B -->|netfilter| E[Network Stack]
    C -->|fork/exec| F[Applications]
    D -->|ext4/btrfs| G[Storage]
    E -->|TCP/IP| H[Network]
    B -->|ioctl| I[Device Drivers]
    I --> J[Hardware]
    style A fill:#d4f34a,stroke:#30302b,color:#11110f
    style B fill:#ff6a2a,stroke:#30302b,color:#e9e8e2
    style J fill:#6be0dc,stroke:#30302b,color:#11110f`,
  },
  SYSTEMS: {
    title: "Data Pipeline Flow",
    diagram: `flowchart LR
    A[Ingest] -->|Stream| B[Process]
    B -->|Batch| C[Transform]
    C -->|Load| D[Store]
    D -->|Query| E[Serve]
    E -->|Cache| F[Response]
    A -->|Validate| G[Dead Letter]
    B -->|Retry| H[Error Queue]
    H -->|Reprocess| B
    style A fill:#6be0dc,stroke:#30302b,color:#11110f
    style F fill:#d4f34a,stroke:#30302b,color:#11110f
    style G fill:#ff6a2a,stroke:#30302b,color:#e9e8e2`,
  },
  PRIVACY: {
    title: "Encrypted Handshake",
    diagram: `sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: ClientHello + random
    S->>C: ServerHello + cert + random
    C->>C: Verify cert chain
    C->>S: Key exchange
    S->>S: Derive session keys
    C->>S: Finished (encrypted)
    S->>C: Finished (encrypted)
    Note over C,S: TLS 1.3 Handshake`,
  },
};

export function getChartForCategory(category: string): { title: string; diagram: string } | null {
  return charts[category] || null;
}

export function getChartForArticle(category: string, slug: string): { title: string; diagram: string } {
  const base = charts[category] || charts.SYSTEMS;
  return {
    title: base.title,
    diagram: base.diagram,
  };
}
