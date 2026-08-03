import type { ScoredOpportunity } from "@/intelligence/types";
import { runIntelligence } from "@/intelligence/pipeline";
import { githubCollector } from "@/intelligence/collectors/github";
import { hackerNewsCollector } from "@/intelligence/collectors/hackernews";
import { cveCollector } from "@/intelligence/collectors/cve";
import { cryptoCollector } from "@/intelligence/collectors/crypto";
import { supabaseRequest } from "@/lib/supabase";

export type NewsletterGuide = {
  id: string;
  subject: string;
  subtitle: string;
  issueNumber: number;
  publishDate: string;
  estimatedReadTime: string;
  difficulty: string;
  learningObjectives: string[];
  tableOfContents: string[];
  prerequisites: string[];
  requiredTools: string[];
  mainGuide: string;
  summary: string;
  furtherReading: string[];
  status: "DRAFT" | "NEEDS_REVIEW" | "APPROVED" | "SENT";
  topics: string[];
  generatedAt: string;
};

const GUIDE_TEMPLATES: Array<{
  title: string;
  subtitle: string;
  difficulty: string;
  readTime: string;
  learningObjectives: string[];
  prerequisites: string[];
  requiredTools: string[];
  topics: string[];
  buildGuide: (research: ScoredOpportunity[]) => string;
}> = [
  {
    title: "Building a Network Intrusion Detection System from Scratch",
    subtitle: "Monitor, detect, and respond to threats on your network",
    difficulty: "INTERMEDIATE",
    readTime: "45 MIN",
    learningObjectives: [
      "Understand network intrusion detection architectures",
      "Deploy and configure Suricata or Snort for traffic analysis",
      "Write custom detection rules for your environment",
      "Build automated alert pipelines",
      "Tune rules to reduce false positives"
    ],
    prerequisites: [
      "Linux command line proficiency",
      "Basic networking concepts (TCP/IP, DNS, HTTP)",
      "Familiarity with packet analysis"
    ],
    requiredTools: [
      "Linux server or VM (Ubuntu 22.04+)",
      "Suricata or Snort",
      "EveBox or similar alert viewer",
      "Wireshark for validation"
    ],
    topics: ["SECURITY", "NETWORKING", "LINUX"],
    buildGuide: (research) => {
      const signals = research.filter(i => i.topics.some(t => ["SECURITY", "NETWORKING"].includes(t)));
      return `<h2>OVERVIEW</h2>
<p>A network intrusion detection system (NIDS) monitors network traffic for malicious activity. Unlike a firewall that blocks traffic, a NIDS observes and alerts. It is the security camera of your network — it does not prevent the break-in, but it records who entered, when, and what they did.</p>
<p>This guide walks through deploying Suricata, an open-source NIDS, on a Linux system. By the end, you will have a functioning detection system that analyzes traffic, matches against rules, and generates alerts you can investigate.</p>

<h2>ARCHITECTURE</h2>
<p>The architecture has three components: the packet capture layer (AF_PACKET or pcap), the detection engine (Suricata rules), and the output pipeline (EVE JSON logs). Traffic enters through a network interface, Suricata processes it against loaded rules, and matching events are written to structured logs.</p>
<pre><code># Traffic flow
NIC -> AF_PACKET -> Suricata -> Rule Matching -> EVE JSON -> Alert Pipeline

# Deployment options
1. Inline mode: Suricata sits on the network path (requires two interfaces)
2. Passive mode: Suricata reads a copy of traffic (SPAN port or tap)
3. Host-based: Suricata monitors traffic on the local machine</code></pre>

<h2>STEP-BY-STEP WALKTHROUGH</h2>

<h3>Step 1: Installation</h3>
<pre><code># Ubuntu/Debian
sudo apt update && sudo apt install -y suricata suricata-update

# Verify installation
suricata --build-info | head -20</code></pre>

<h3>Step 2: Configure the Interface</h3>
<pre><code># /etc/suricata/suricata.yaml
# Set the interface to monitor
af-packet:
  - interface: eth0
    threads: auto
    defrag: yes
    use-mmap: yes
    ring-size: 2048</code></pre>

<h3>Step 3: Update Rules</h3>
<pre><code># Pull latest rules
sudo suricata-update

# List available rule sources
sudo suricata-update list-sources

# Enable additional sources
sudo suricata-update enable-source et/open
sudo suricata-update</code></pre>

<h3>Step 4: Run Suricata</h3>
<pre><code># Test configuration
sudo suricata -T -c /etc/suricata/suricata.yaml -i eth0

# Run in background
sudo suricata -c /etc/suricata/suricata.yaml -i eth0 -D

# Check logs
sudo tail -f /var/log/suricata/eve.json</code></pre>

<h3>Step 5: Write Custom Rules</h3>
<pre><code># /etc/suricata/rules/local.rules

# Detect SSH brute force (5+ attempts in 60 seconds)
alert tcp any any -> $HOME_NET 22 (msg:"SSH Brute Force Detected"; \
  flow:to_server,established; \
  detection_filter:track by_src, count 5, seconds 60; \
  sid:1000001; rev:1;)

# Detect DNS tunneling (unusually long subdomains)
alert dns any any -> any any (msg:"Possible DNS Tunneling"; \
  dns.query; content:"|09|"; depth:1; \
  pcre:"/^[a-z0-9]{30,}\./i"; \
  sid:1000002; rev:1;)

# Detect port scanning
alert tcp any any -> $HOME_NET any (msg:"Port Scan Detected"; \
  flags:S; \
  detection_filter:track by_src, count 20, seconds 60; \
  sid:1000003; rev:1;)</code></pre>

<h2>COMMON MISTAKES</h2>
<ul>
<li>Running Suricata without tuning: the default rules generate hundreds of false positives. Start with a minimal rule set and add rules as you understand your traffic.</li>
<li>Ignoring hardware requirements: Suricata is CPU-intensive at high throughput. Monitor CPU usage and packet drops.</li>
<li>Not rotating logs: EVE JSON files grow quickly. Configure log rotation.</li>
<li>Running as root without dropping privileges: Suricata supports privilege dropping. Use it.</li>
</ul>

<h2>TROUBLESHOOTING</h2>
<pre><code># Check if Suricata is running
sudo pgrep -a suricata

# Check for packet drops
sudo grep -i "drop" /var/log/suricata/stats.log

# Validate rules
sudo suricata -T -c /etc/suricata/suricata.yaml

# Check interface is in promiscuous mode
ip link show eth0 | grep -i promisc</code></pre>

<h2>ADVANCED TIPS</h2>
<ul>
<li>Use AF_PACKET instead of pcap for better performance on multi-core systems.</li>
<li>Deploy in passive mode using a network tap for production monitoring.</li>
<li>Forward EVE JSON to Elastic SIEM or Wazuh for centralized alert management.</li>
<li>Write protocol-specific rules for your environment (internal app traffic, IoT devices).</li>
</ul>

<h2>FURTHER READING</h2>
<ul>
<li>Suricata documentation: https://suricata.io/documentation/</li>
<li>ET Open ruleset: https://rules.emergingthreats.net/</li>
<li>NSM (Network Security Monitoring) by Richard Bejtlich</li>
<li>The Practice of Network Security Monitoring by Richard Bejtlich</li>
</ul>

<h2>SUMMARY</h2>
<p>You now have a functioning NIDS that monitors network traffic, matches against detection rules, and generates structured alerts. The next step is tuning: reduce false positives, add custom rules for your environment, and integrate alerts into your incident response workflow.</p>

${signals.length > 0 ? `<h2>RESEARCH SIGNALS</h2>
<p>These items from the intelligence pipeline are relevant to this guide:</p>
<ul>
${signals.map(s => `<li><a href="${s.url}" target="_blank">${s.title}</a> — ${s.summary}</li>`).join("\n")}
</ul>` : ""}`;
    },
  },
  {
    title: "Deploying a Private Ethereum Node with Geth",
    subtitle: "Run your own node, verify your own state, trust no one",
    difficulty: "ADVANCED",
    readTime: "50 MIN",
    learningObjectives: [
      "Understand Ethereum node architecture and sync modes",
      "Install and configure Geth for mainnet or testnet",
      "Set up a sentry node architecture for security",
      "Configure monitoring and alerting",
      "Perform maintenance and upgrades"
    ],
    prerequisites: [
      "Linux server administration",
      "Understanding of Ethereum basics",
      "Familiarity with systemd services"
    ],
    requiredTools: [
      "Ubuntu 22.04+ server (8GB+ RAM, 2TB+ NVMe SSD)",
      "Geth (latest stable)",
      "Prometheus and Grafana for monitoring"
    ],
    topics: ["BLOCKCHAIN", "LINUX", "INFRASTRUCTURE"],
    buildGuide: (research) => {
      const signals = research.filter(i => i.topics.some(t => ["BLOCKCHAIN", "LINUX"].includes(t)));
      return `<h2>OVERVIEW</h2>
<p>Running your own Ethereum node means you verify every block, every transaction, every state transition yourself. You do not trust Infura, Alchemy, or any third-party RPC provider. You validate the chain from genesis. This is what "don't trust, verify" means in practice.</p>
<p>This guide covers deploying Geth (Go Ethereum) in a sentry node architecture: an internal node that connects to the public network, and a sentry node that serves RPC requests. The sentry never connects to the internal node directly — it connects through the sentry, which acts as a shield.</p>

<h2>ARCHITECTURE</h2>
<pre><code># Sentry node architecture
                    Internet
                       |
                   [Sentry Node]  <-- serves RPC (metamask, dApps)
                       |
                   [Firewall]     <-- only sentry IP allowed
                       |
                  [Internal Node] <-- full sync, validator
                       |
                  [Backup]         <-- encrypted keystore backup</code></pre>

<h2>STEP-BY-STEP WALKTHROUGH</h2>

<h3>Step 1: Server Preparation</h3>
<pre><code># System requirements
# RAM: 8GB minimum, 16GB recommended
# Storage: 2TB NVMe SSD (chain data grows ~1TB/year)
# Network: 25Mbps+ sustained

# Create dedicated user
sudo useradd -m -s /bin/bash geth
sudo su - geth

# Install Geth
wget https://gethstore.blob.core.windows.net/builds/geth-linux-amd64-1.14.0-abc1234.tar.gz
tar xzf geth-linux-amd64-1.14.0-abc1234.tar.gz
sudo cp geth-*/geth /usr/local/bin/

# Verify
geth version</code></pre>

<h3>Step 2: Initial Sync</h3>
<pre><code># Start Geth with snap sync (fastest initial sync)
geth --mainnet \
  --datadir /data/geth \
  --syncmode snap \
  --gcmode archive \
  --http \
  --http.addr 127.0.0.1 \
  --http.port 8545 \
  --metrics \
  --metrics.addr 127.0.0.1 \
  --metrics.port 6060

# Monitor sync progress
geth attach /data/geth/geth.ipc --exec "eth.syncing"</code></pre>

<h3>Step 3: systemd Service</h3>
<pre><code># /etc/systemd/system/geth.service
[Unit]
Description=Geth Ethereum Client
After=network.target

[Service]
Type=simple
User=geth
ExecStart=/usr/local/bin/geth \\
  --mainnet \\
  --datadir /data/geth \\
  --syncmode snap \\
  --gcmode archive \\
  --http \\
  --http.addr 127.0.0.1 \\
  --http.port 8545 \\
  --metrics \\
  --metrics.addr 127.0.0.1 \\
  --metrics.port 6060
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target</code></pre>

<h2>COMMON MISTAKES</h2>
<ul>
<li>Using HDD instead of SSD: the random I/O requirements of a full node make HDDs unusable.</li>
<li>Insufficient storage: the chain grows continuously. Monitor disk usage and expand before you run out.</li>
<li>Exposing RPC to the internet: always bind to 127.0.0.1 and use a reverse proxy or VPN for access.</li>
<li>Not backing up the keystore: if you lose the keystore and password, you lose access to your validator keys.</li>
</ul>

<h2>TROUBLESHOOTING</h2>
<pre><code># Check node status
geth attach /data/geth/geth.ipc --exec "eth.blockNumber"
geth attach /data/geth/geth.ipc --exec "net.peerCount"

# Check disk usage
du -sh /data/geth

# Check logs
journalctl -u geth -f

# Check sync status
geth attach /data/geth/geth.ipc --exec "eth.syncing"</code></pre>

<h2>ADVANCED TIPS</h2>
<ul>
<li>Use a hardware wallet (Ledger/Trezor) for validator keys instead of software keystores.</li>
<li>Deploy a Prometheus exporter for Geth metrics and set up Grafana dashboards.</li>
<li>Configure automatic security updates for the host OS.</li>
<li>Test disaster recovery: restore from backup on a fresh server.</li>
</ul>

<h2>SUMMARY</h2>
<p>You now have a private Ethereum node running in a sentry architecture. You verify the chain yourself. You serve RPC requests through a shielded sentry. You monitor health and performance. The next step: run a second sentry for load balancing, and implement automated backup of the keystore.</p>

${signals.length > 0 ? `<h2>RESEARCH SIGNALS</h2>
<ul>
${signals.map(s => `<li><a href="${s.url}" target="_blank">${s.title}</a> — ${s.summary}</li>`).join("\n")}
</ul>` : ""}`;
    },
  },
  {
    title: "Building a Secure CI/CD Pipeline with GitHub Actions",
    subtitle: "Automate testing, scanning, and deployment without compromising security",
    difficulty: "INTERMEDIATE",
    readTime: "35 MIN",
    learningObjectives: [
      "Design a secure CI/CD pipeline architecture",
      "Implement automated security scanning (SAST, dependency audit)",
      "Manage secrets and credentials safely",
      "Configure deployment with least-privilege principles",
      "Set up monitoring and alerting for pipeline failures"
    ],
    prerequisites: [
      "GitHub account with repository access",
      "Basic understanding of YAML and GitHub Actions",
      "Familiarity with Docker basics"
    ],
    requiredTools: [
      "GitHub repository",
      "GitHub Actions (free for public repos)",
      "Docker Hub or container registry"
    ],
    topics: ["DEVOPS", "SECURITY", "PROGRAMMING"],
    buildGuide: (research) => {
      const signals = research.filter(i => i.topics.some(t => ["SECURITY", "PROGRAMMING"].includes(t)));
      return `<h2>OVERVIEW</h2>
<p>A CI/CD pipeline that skips security is a pipeline that ships vulnerabilities. Every commit triggers a build. Every build should trigger security checks. Every deployment should be authorized, logged, and reversible.</p>
<p>This guide builds a GitHub Actions pipeline that: runs tests, scans for vulnerabilities, builds Docker images, and deploys — all with security baked in at every step.</p>

<h2>ARCHITECTURE</h2>
<pre><code># Pipeline flow
Push -> Lint -> Test -> SAST Scan -> Dependency Audit -> Build -> Deploy

# Security gates
- CodeQL for static analysis (SAST)
- Trivy for container image scanning
- Dependabot for dependency updates
- OIDC for cloud deployment (no stored credentials)</code></pre>

<h2>STEP-BY-STEP WALKTHROUGH</h2>

<h3>Step 1: Basic Pipeline</h3>
<pre><code># .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run lint</code></pre>

<h3>Step 2: Add Security Scanning</h3>
<pre><code># Add to the same workflow file
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Static Application Security Testing (SAST)
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript
      
      - uses: github/codeql-action/analyze@v3

      # Dependency audit
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high</code></pre>

<h3>Step 3: Container Image Build and Scan</h3>
<pre><code># Add container job
  container:
    runs-on: ubuntu-latest
    needs: [test, security]
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker image
        run: docker build -t myapp:\${{ github.sha }} .
      
      - name: Scan container image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:\${{ github.sha }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
      
      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif</code></pre>

<h3>Step 4: Secure Deployment with OIDC</h3>
<pre><code># Deploy job (uses OIDC, no stored secrets)
  deploy:
    runs-on: ubuntu-latest
    needs: [container]
    if: github.ref == 'refs/heads/main'
    environment: production
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to cloud
        run: |
          # Use OIDC token for cloud authentication
          # No AWS_ACCESS_KEY_ID or GCP_SERVICE_ACCOUNT_KEY needed
          echo "Deploying \${{ github.sha }} to production"</code></pre>

<h2>COMMON MISTAKES</h2>
<ul>
<li>Storing secrets as repository secrets and using them in plaintext: use OIDC where possible, encrypted secrets where not.</li>
<li>Running security scans after deployment: scan before build, fail the pipeline on critical findings.</li>
<li>Ignoring supply chain attacks: pin action versions to specific SHA commits, not tags.</li>
<li>Not setting permissions: every workflow should have minimal permissions defined.</li>
</ul>

<h2>TROUBLESHOOTING</h2>
<pre><code># Check workflow runs
gh run list --limit 10

# View specific run logs
gh run view <run-id> --log-failed

# Re-run failed jobs
gh run rerun <run-id> --failed</code></pre>

<h2>ADVANCED TIPS</h2>
<ul>
<li>Use reusable workflows for common patterns across repositories.</li>
<li>Implement branch protection rules that require status checks to pass.</li>
<li>Use environment protection rules for production deployments.</li>
<li>Archive workflow artifacts for audit trails.</li>
</ul>

<h2>SUMMARY</h2>
<p>You now have a CI/CD pipeline that tests code, scans for vulnerabilities, audits dependencies, builds containers, and deploys — all with security gates at every step. The pipeline fails automatically on critical findings. No credentials are stored. Every action is logged.</p>

${signals.length > 0 ? `<h2>RESEARCH SIGNALS</h2>
<ul>
${signals.map(s => `<li><a href="${s.url}" target="_blank">${s.title}</a> — ${s.summary}</li>`).join("\n")}
</ul>` : ""}`;
    },
  },
  {
    title: "Setting Up a Complete Home Automation System with Home Assistant",
    subtitle: "Smart home control that you own, not Google or Amazon",
    difficulty: "BEGINNER",
    readTime: "40 MIN",
    learningObjectives: [
      "Install and configure Home Assistant OS",
      "Connect smart home devices securely",
      "Create automations and scenes",
      "Set up remote access without cloud dependencies",
      "Implement network segmentation for IoT devices"
    ],
    prerequisites: [
      "Basic networking knowledge",
      "A Raspberry Pi 4 or dedicated mini PC",
      "Familiarity with web interfaces"
    ],
    requiredTools: [
      "Raspberry Pi 4 (4GB+ RAM) or x86 mini PC",
      "MicroSD card (32GB+)",
      "Zigbee or Z-Wave USB coordinator (optional)",
      "Ethernet cable (recommended over WiFi)"
    ],
    topics: ["LINUX", "HARDWARE", "NETWORKING"],
    buildGuide: (research) => {
      const signals = research.filter(i => i.topics.some(t => ["LINUX", "HARDWARE"].includes(t)));
      return `<h2>OVERVIEW</h2>
<p>Home Assistant is an open-source home automation platform that runs locally. Your data stays on your network. Your automations run without cloud connectivity. You control your home, not a subscription service.</p>
<p>This guide covers installation, device pairing, automation creation, and network security for a complete smart home setup.</p>

<h2>ARCHITECTURE</h2>
<pre><code># Network topology
Internet <-> Router <-> VLAN 10 (Trusted)
                   <-> VLAN 20 (IoT - isolated)
                         |
                    [Home Assistant] (VLAN 10)
                    [Smart Plugs]    (VLAN 20)
                    [Sensors]        (VLAN 20)
                    [Cameras]        (VLAN 20 - isolated)</code></pre>

<h2>STEP-BY-STEP WALKTHROUGH</h2>

<h3>Step 1: Installation</h3>
<pre><code># Download Home Assistant OS
# https://www.home-assistant.io/installation/

# Flash to SD card
sudo dd bs=4M if=haos_rpi4-12.0.img of=/dev/sdX status=progress

# Insert SD card, connect ethernet, power on
# Access at http://homeassistant.local:8123</code></pre>

<h3>Step 2: Initial Configuration</h3>
<pre><code># In the web interface:
# 1. Create admin account
# 2. Set location and timezone
# 3. Discover devices (auto-detection)
# 4. Add integrations for your devices</code></pre>

<h3>Step 3: Create Your First Automation</h3>
<pre><code># Example: Turn on lights at sunset
automation:
  - alias: "Lights at Sunset"
    trigger:
      - platform: sun
        event: sunset
    action:
      - service: light.turn_on
        target:
          entity_id: light.living_room
        data:
          brightness_pct: 80
          color_temp_kelvin: 2700</code></pre>

<h2>COMMON MISTAKES</h2>
<ul>
<li>Connecting IoT devices to the same network as your computers: use VLAN segmentation.</li>
<li>Using WiFi for Home Assistant: use Ethernet for reliability.</li>
<li>Skipping backups: configure automated backups to external storage.</li>
<li>Not using a UPS: power fluctuations cause SD card corruption.</li>
</ul>

<h2>TROUBLESHOOTING</h2>
<pre><code># Check Home Assistant logs
# Settings -> System -> Logs

# SSH access (enable in Configuration -> Add-ons)
ssh root@homeassistant.local

# Check system health
ha core info
ha supervisor info</code></pre>

<h2>SUMMARY</h2>
<p>You now have a locally-controlled home automation system. Your data stays on your network. Your automations run without cloud connectivity. The next step: add Zigbee devices, create complex automations, and integrate with MQTT for advanced device control.</p>

${signals.length > 0 ? `<h2>RESEARCH SIGNALS</h2>
<ul>
${signals.map(s => `<li><a href="${s.url}" target="_blank">${s.title}</a> — ${s.summary}</li>`).join("\n")}
</ul>` : ""}`;
    },
  },
  {
    title: "Mastering Git: From Basics to Advanced Workflows",
    subtitle: "Version control that scales from solo projects to enterprise teams",
    difficulty: "BEGINNER",
    readTime: "30 MIN",
    learningObjectives: [
      "Understand Git internals (commits, trees, blobs)",
      "Master branching strategies (Git Flow, trunk-based)",
      "Use interactive rebase for clean history",
      "Resolve complex merge conflicts",
      "Set up Git hooks for automation"
    ],
    prerequisites: [
      "Command line basics",
      "A text editor",
      "A GitHub or GitLab account"
    ],
    requiredTools: [
      "Git 2.40+",
      "Terminal",
      "GitHub account"
    ],
    topics: ["PROGRAMMING", "DEVOPS", "LINUX"],
    buildGuide: (research) => {
      const signals = research.filter(i => i.topics.some(t => ["PROGRAMMING", "LINUX"].includes(t)));
      return `<h2>OVERVIEW</h2>
<p>Git is not a version control system. It is a content-addressable filesystem with a version control interface. Understanding the internals changes how you use it. Every commit is a snapshot, not a diff. Every branch is a pointer. Every merge is a graph operation.</p>

<h2>STEP-BY-STEP WALKTHROUGH</h2>

<h3>Step 1: Git Internals</h3>
<pre><code># Every commit is a tree of blobs
git cat-file -p HEAD        # Show commit object
git cat-file -p HEAD^{tree} # Show tree object

# SHA-1 hash = content address
echo "hello" | git hash-object --stdin
# Returns the SHA-1 of the content</code></pre>

<h3>Step 2: Interactive Rebase</h3>
<pre><code># Clean up last 5 commits
git rebase -i HEAD~5

# In the editor:
pick abc1234 Add feature
squash def5678 Fix typo in feature
pick ghi9012 Add tests

# Result: 2 clean commits instead of 3</code></pre>

<h3>Step 3: Advanced Merging</h3>
<pre><code># Merge with strategy
git merge --strategy-option=ours feature-branch

# Resolve conflict with a tool
git mergetool

# Cherry-pick specific commits
git cherry-pick abc1234 def5678</code></pre>

<h3>Step 4: Git Hooks</h3>
<pre><code># .git/hooks/pre-commit
#!/bin/bash
# Run linter before every commit
npm run lint
if [ $? -ne 0 ]; then
  echo "Lint failed. Commit aborted."
  exit 1
fi</code></pre>

<h2>COMMON MISTAKES</h2>
<ul>
<li>Using git add . without checking what is staged: always use git add -p for partial staging.</li>
<li>Merging main into feature branches: rebase instead for clean history.</li>
<li>Committing generated files: use .gitignore for build artifacts.</li>
<li>Force pushing to shared branches: never force push to main.</li>
</ul>

<h2>SUMMARY</h2>
<p>You now understand Git internals, interactive rebase, advanced merging, and hooks. The next step: set up a branching strategy for your team, configure CI hooks, and explore Git LFS for large files.</p>

${signals.length > 0 ? `<h2>RESEARCH SIGNALS</h2>
<ul>
${signals.map(s => `<li><a href="${s.url}" target="_blank">${s.title}</a> — ${s.summary}</li>`).join("\n")}
</ul>` : ""}`;
    },
  },
  {
    title: "Kubernetes Security Hardening: A Practical Guide",
    subtitle: "Lock down your cluster before someone else does",
    difficulty: "ADVANCED",
    readTime: "45 MIN",
    learningObjectives: [
      "Harden Kubernetes RBAC configurations",
      "Implement network policies for pod isolation",
      "Configure Pod Security Standards",
      "Set up runtime security monitoring with Falco",
      "Secure the container supply chain with image signing"
    ],
    prerequisites: [
      "Kubernetes cluster running (v1.28+)",
      "kubectl access with cluster-admin",
      "Docker or containerd experience"
    ],
    requiredTools: [
      "Kubernetes cluster",
      "kubectl",
      "Falco",
      "Cosign for image signing"
    ],
    topics: ["SECURITY", "DEVOPS", "LINUX"],
    buildGuide: (research) => {
      const signals = research.filter(i => i.topics.some(t => ["SECURITY", "LINUX"].includes(t)));
      return `<h2>OVERVIEW</h2>
<p>A default Kubernetes cluster is wide open. Every pod can talk to every other pod. Every service account has more permissions than it needs. The API server is accessible from anywhere. This guide locks it down.</p>

<h2>STEP-BY-STEP WALKTHROUGH</h2>

<h3>Step 1: RBAC Hardening</h3>
<pre><code># Check for excessive permissions
kubectl auth can-i --list --as=system:serviceaccount:default:default

# Create restrictive Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: app-reader
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]</code></pre>

<h3>Step 2: Network Policies</h3>
<pre><code># Default deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress

# Allow only specific communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - port: 8080</code></pre>

<h3>Step 3: Pod Security Standards</h3>
<pre><code># Enforce restricted profile
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted</code></pre>

<h2>COMMON MISTAKES</h2>
<ul>
<li>Running containers as root: always set runAsNonRoot: true.</li>
<li>Mounting the host filesystem: never mount hostPath unless absolutely necessary.</li>
<li>Using latest tag for images: pin to specific digests.</li>
<li>Not enabling audit logging: the API server audit log is your forensic evidence.</li>
</ul>

<h2>SUMMARY</h2>
<p>Your Kubernetes cluster is now hardened: RBAC restricts access, network policies isolate pods, Pod Security Standards enforce baselines, and Falco monitors runtime behavior. The next step: set up OPA Gatekeeper for policy-as-code and implement image signing with Cosign.</p>

${signals.length > 0 ? `<h2>RESEARCH SIGNALS</h2>
<ul>
${signals.map(s => `<li><a href="${s.url}" target="_blank">${s.title}</a> — ${s.summary}</li>`).join("\n")}
</ul>` : ""}`;
    },
  },
];

let issueCounter = 0;

export async function generatePremiumGuide(): Promise<NewsletterGuide> {
  const guideIndex = issueCounter % GUIDE_TEMPLATES.length;
  issueCounter++;

  const template = GUIDE_TEMPLATES[guideIndex];

  let research: ScoredOpportunity[] = [];
  try {
    const result = await runIntelligence([githubCollector, hackerNewsCollector, cveCollector, cryptoCollector]);
    research = result.items;
  } catch {
    // Research is optional — guide generates without it
  }

  const mainGuide = template.buildGuide(research);

  const toc = template.learningObjectives.map((_, i) => {
    const headings = ["Overview", "Architecture", "Step-by-Step Walkthrough", "Common Mistakes", "Troubleshooting", "Advanced Tips", "Further Reading", "Summary"];
    return headings[i % headings.length] || `Section ${i + 1}`;
  });

  const guide: NewsletterGuide = {
    id: `signal-${Date.now()}`,
    subject: `THE SIGNAL / ${template.title}`,
    subtitle: template.subtitle,
    issueNumber: issueCounter,
    publishDate: new Date().toISOString().slice(0, 10),
    estimatedReadTime: template.readTime,
    difficulty: template.difficulty,
    learningObjectives: template.learningObjectives,
    tableOfContents: toc,
    prerequisites: template.prerequisites,
    requiredTools: template.requiredTools,
    mainGuide,
    summary: `In this issue: ${template.title}. ${template.subtitle}. Estimated completion time: ${template.readTime}.`,
    furtherReading: [
      "Official documentation for all tools mentioned",
      "Security best practices from OWASP",
      "Linux Foundation training resources",
      "Community forums and discussion boards",
    ],
    status: "NEEDS_REVIEW",
    topics: template.topics,
    generatedAt: new Date().toISOString(),
  };

  if (hasSupabase()) {
    try {
      await supabaseRequest("newsletter_issues", {
        method: "POST",
        body: JSON.stringify({
          subject: guide.subject,
          status: "NEEDS_REVIEW",
          content: guide,
        }),
      });
    } catch {
      // Supabase persistence is best-effort
    }
  }

  return guide;
}

function hasSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
