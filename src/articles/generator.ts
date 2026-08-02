import { runIntelligence } from "@/intelligence/pipeline";
import { githubCollector } from "@/intelligence/collectors/github";
import { hackerNewsCollector } from "@/intelligence/collectors/hackernews";
import { cveCollector } from "@/intelligence/collectors/cve";
import { cryptoCollector } from "@/intelligence/collectors/crypto";
import type { ScoredOpportunity } from "@/intelligence/types";
import { getImage } from "@/content/image-store";
import fs from "fs/promises";
import path from "path";

export type ArticlePlan = {
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  readTime: string;
  xp: number;
  excerpt: string;
  tags: string[];
  body?: string;
};

const ARTICLES: Record<string, {
  intro: string;
  deepDive: string;
  principles: string[];
  examples: { title: string; body: string }[];
  antiPatterns: string[];
  checklist: string[];
  move: string;
}> = {
  "graph-arbitrage": {
    intro: `<p>Graph-based arbitrage is not finance. It is a search problem. The question is not "which token is undervalued" — it is "which cycle in this weighted directed graph has a negative total weight after fees." That framing changes everything about how you build the system.</p>
<p>In traditional markets, arbitrage is about information asymmetry. In DeFi, it is about graph traversal speed. The AMM pools are nodes. The swap pairs are edges. The edge weights are the exchange rates including slippage, gas costs, and protocol fees. Finding profitable arbitrage means finding negative cycles in this graph — and doing it faster than everyone else.</p>`,
    deepDive: `<h3>The Graph Model</h3>
<p>Every AMM pool is a node. Every possible swap is a directed edge. The weight of an edge is the effective exchange rate after all fees and slippage. A path from token A back to token A with negative total weight is a profitable arbitrage cycle.</p>
<p>The Bellman-Ford algorithm finds negative cycles in O(V*E) time. For a graph with 500 tokens and 2000 pools, that is 500 * 2000 = 1,000,000 operations per scan. At modern clock speeds, that is sub-millisecond. The bottleneck is not computation — it is data freshness.</p>

<pre><code>// Simplified negative cycle detection
function findArbitrage(graph: TokenGraph): Cycle[] {
  const cycles: Cycle[] = [];
  const distances = new Map&lt;string, number&gt;();
  const predecessors = new Map&lt;string, string&gt;();

  // Initialize
  for (const node of graph.nodes) {
    distances.set(node, 0);
    predecessors.set(node, "");
  }

  // Bellman-Ford relaxation
  for (let i = 0; i < graph.nodes.length - 1; i++) {
    for (const edge of graph.edges) {
      const newDist = distances.get(edge.from)! + edge.weight;
      if (newDist < distances.get(edge.to)!) {
        distances.set(edge.to, newDist);
        predecessors.set(edge.to, edge.from);
      }
    }
  }

  // Detect negative cycles
  for (const edge of graph.edges) {
    const newDist = distances.get(edge.from)! + edge.weight;
    if (newDist < distances.get(edge.to)!) {
      cycles.push(reconstructCycle(edge, predecessors));
    }
  }

  return cycles;
}</code></pre>

<h3>The Freshness Problem</h3>
<p>The graph is stale the moment you read it. By the time your transaction lands in the mempool, the edge weights have changed. Other arbitrageurs have already executed, MEV searchers have front-run your signals, and the gas price has shifted. Your scan result is a fossil.</p>
<p>This is why the most profitable arbitrage systems do not just find negative cycles — they predict which cycles will still be negative when the transaction executes. That requires modeling the rate at which other searchers close arbitrage opportunities.</p>`,
    principles: [
      "The graph is always stale. Build for the graph you will have at execution time, not the one you read.",
      "Gas cost is an edge weight. A negative cycle that costs more in gas than it yields is not an arbitrage — it is a donation.",
      "MEV searchers compete on latency, not strategy. The same negative cycle found by ten searchers means the fastest nine lose money.",
      "Composite pools (triple-token, concentrated liquidity) create hyper-edges. Model them as multiple simple edges or your cycle detection will miss opportunities.",
      "The optimal strategy is not maximizing profit per cycle — it is maximizing profit per unit of gas spent."
    ],
    examples: [
      { title: "Stablecoin Triangle", body: "USDC -> DAI -> USDT -> USDC through three Curve pools. Each leg has 0.04% fee. If the cumulative exchange rate yields more than 0.12% profit after gas, the cycle is profitable. In practice, these close within milliseconds of appearing." },
      { title: "Concentrated Liquidity Arbitrage", body: "Uniswap V3 concentrated positions create micro-pools with extreme price sensitivity. A 0.5% price movement in a narrow range can create negative cycles that span only two pools. The gas cost is lower because the price impact is higher." }
    ],
    antiPatterns: [
      "Scanning the full graph on every block. Pre-filter to pools with recent volume.",
      "Ignoring gas price volatility. A profitable scan at 30 gwei is unprofitable at 100 gwei.",
      "Assuming linear price impact. AMM curves are non-linear — model them correctly.",
      "Running the scan sequentially. The graph is immutable during computation — parallelize."
    ],
    checklist: [
      "Graph model represents all active pools with correct fee structures",
      "Negative cycle detection handles multi-hop paths (3+ edges)",
      "Gas cost is included in edge weight calculations",
      "Execution transaction is atomic (all-or-nothing swap)",
      "Fallback: if cycle closes before execution, transaction reverts safely"
    ],
    move: "Map the top 20 pools by TVL on Uniswap. Build the adjacency list. Run Bellman-Ford. Count the negative cycles. That is your starting point."
  },

  "atomic-execution": {
    intro: `<p>Atomic execution is the difference between a DeFi system that works and one that steals from its users. If your protocol cannot settle every state transition in a single transaction — all-or-nothing — it is not a protocol. It is a liability with a UI.</p>
<p>The Ethereum Virtual Machine guarantees atomicity at the transaction level. Either every opcode succeeds, or every opcode reverts. This is not a feature. It is the foundation. Every DeFi protocol that tries to work around it — partial fills, multi-step settlements, cross-transaction dependencies — is building on sand.</p>`,
    deepDive: `<h3>Why Partial Fills Are Poison</h3>
<p>A partial fill means the system is in an intermediate state between two transactions. In that intermediate state, the system is vulnerable. Prices have moved. Other actors have reacted. The assumptions that made the first transaction profitable may no longer hold for the second.</p>

<pre><code>// The WRONG way: multi-step settlement
async function badSwap(user, tokenIn, tokenOut, amount) {
  await transferToPool(user, tokenIn, amount);    // Step 1
  // ... system is now in intermediate state ...
  await updateOracle(price);                       // Step 2
  // ... prices may have moved ...
  await transferFromPool(user, tokenOut, amount);  // Step 3
  // What if step 3 fails? User lost tokenIn.
}

// The RIGHT way: atomic swap
async function goodSwap(user, tokenIn, tokenOut, amount) {
  return atomic(async () => {
    const amountOut = getAmountOut(tokenIn, tokenOut, amount);
    transferToPool(user, tokenIn, amount);
    transferFromPool(user, tokenOut, amountOut);
    // Both succeed or both revert. No intermediate state.
  });
}</code></pre>

<h3>The Flash Loan Pattern</h3>
<p>Flash loans are the purest expression of atomic execution. Borrow, use, repay — all in one transaction. The constraint is not a limitation. It is the design. If you cannot repay the loan in the same block, the transaction reverts. This eliminates counterparty risk entirely.</p>
<p>The architectural insight is that flash loans make capital costless to move. The only cost is gas. This means the optimal strategy is to move as much capital as possible in a single atomic transaction, because the opportunity cost of capital is zero within that transaction.</p>`,
    principles: [
      "Every state transition must be reversible within a single transaction. If it is not, you have a window of vulnerability.",
      "Cross-contract calls within an atomic transaction share the same failure semantics. If one reverts, all revert.",
      "Oracle reads within an atomic transaction are consistent. Oracle reads across transactions are not. Design for the former.",
      "The atomic transaction is a unit of economic finality. Treat it as such.",
      "If your protocol requires two transactions to complete a user action, you have built a two-phase commit without the commit protocol."
    ],
    examples: [
      { title: "Atomic Multi-Hop Swap", body: "User wants to swap ETH -> USDC -> DAI -> stETH. Each hop changes the price of the next. In a single atomic transaction, all three swaps execute at committed prices. No slippage between hops. No front-running between legs." },
      { title: "Liquidation Bot", body: "A liquidation bot borrows USDC via flash loan, buys discounted collateral from an underwater position, sells the collateral for profit, repays the flash loan, and keeps the difference. All in one transaction. If the spread is not there, the whole thing reverts." }
    ],
    antiPatterns: [
      "Using events as state. Events are logs, not state. They cannot be read by contracts.",
      "Relying on transaction ordering. Your second transaction may land in a different block than your first.",
      "Storing intermediate results in storage for the next transaction. Storage is expensive and the state will be stale.",
      "Building 'cancel' mechanisms for partially-filled orders. If it can be cancelled, it was never atomic."
    ],
    checklist: [
      "Every user action completes in a single transaction",
      "No cross-transaction state dependencies",
      "Oracle reads are consistent within the transaction",
      "Failed transactions leave no partial state",
      "Gas estimation accounts for all possible revert paths"
    ],
    move: "Audit one DeFi protocol. Count the transactions required for a swap. If it is more than one, identify the intermediate state and its attack surface."
  },

  "private-transaction-submission": {
    intro: `<p>Your transactions are public. Every pending transaction in the mempool is visible to every node on the network. Your swap size, your target pool, your slippage tolerance — all public. The mempool is a transparency report you did not consent to.</p>
<p>Flashbots exists because default Ethereum is a spectator sport. MEV searchers watch the mempool, identify profitable transactions, and extract value from them. The victim pays the cost in worse execution. The searcher captures the spread. The validator collects the bribe. Everyone wins except the user.</p>`,
    deepDive: `<h3>The MEV Supply Chain</h3>
<p>The supply chain is simple: a user submits a transaction, a searcher sees it in the mempool, the searcher submits a modified transaction that captures the value, and the validator includes the searcher's transaction instead. The user gets worse execution or no execution at all.</p>

<pre><code>// Default submission (vulnerable)
eth_sendRawTransaction(signedTx)
// -> Broadcast to all peers
// -> Visible in mempool within milliseconds
// -> MEV searchers begin extraction

// Flashbots submission (protected)
eth_sendBundle({
  txs: [signedTx],
  blockNumber: targetBlock,
  minTimestamp: 0,
  maxTimestamp: 0
})
// -> Sent directly to miners/validators
// -> Not broadcast to the network
// -> Included or not, no intermediate state</code></pre>

<h3>MEV-Share and the New Protocol</h3>
<p>MEV-Share formalizes the relationship between users and searchers. Users submit intents (not transactions) to a matcher. The matcher connects users with searchers who can fulfill the intent while sharing the MEV. The user gets some of the value back. The searcher still profits. The validator still collects fees.</p>
<p>The architectural shift is from "submit a transaction and hope" to "submit an intent and negotiate." The intent is abstract: "I want to swap X for Y at rate Z." The searcher fills in the concrete transaction that satisfies the intent while extracting MEV.</p>`,
    principles: [
      "The mempool is not a suggestion box. It is a public auction where you are the item being sold.",
      "Private transaction submission is not about privacy — it is about controlling the information flow.",
      "Flashbots bundles are atomic: all transactions execute together or none execute. Use this to guarantee execution order.",
      "The block builder controls transaction ordering. The block proposer controls which builder wins. Both have incentives.",
      "Timing is a weapon. A transaction that arrives at the right block but the wrong position is still extracted."
    ],
    examples: [
      { title: "Sandwich Attack Prevention", body: "A user submits a large swap through Flashbots. The swap never appears in the public mempool. MEV searchers cannot see it to sandwich it. The user gets the price they expected, not the price the searcher would have set." },
      { title: "Backrun Protection", body: "A protocol submits a liquidation transaction via Flashbots bundle, paired with a follow-up swap. The bundle guarantees execution order: liquidate first, swap second. No searcher can insert a transaction between the two legs." }
    ],
    antiPatterns: [
      "Sending private transactions to a single relay. diversify across relays for better inclusion rates.",
      "Ignoring gas prices in Flashbots bundles. Validators still select bundles by profit.",
      "Assuming private submission guarantees inclusion. It does not — it guarantees privacy, not priority.",
      "Building MEV protection into the frontend but not the smart contract. A determined attacker bypasses the frontend."
    ],
    checklist: [
      "Large swaps use Flashbots or equivalent private submission",
      "Liquidations are submitted as atomic bundles",
      "The protocol does not leak intent through mempool analysis",
      "Gas price strategies account for MEV extraction costs",
      "Users are warned about front-running risks for unprotected transactions"
    ],
    move: "Install the Flashbots Protect RPC. Send a test swap through it. Watch the mempool on Etherscan. Confirm the transaction never appears."
  },

  "recon-from-syllabus": {
    intro: `<p>Recon frameworks should be boring. The flashy tools break. The complex pipelines need babysitting. The zero-dependency Python script that runs on any Linux box with a kernel — that is the one you want at 3 AM when the alert fires.</p>
<p>The best recon tools are the ones that work anywhere. They do not need Docker. They do not need a package manager. They need Python 3 and network access. That is it. Everything else is a liability.</p>`,
    deepDive: `<h3>The Zero-Dependency Principle</h3>
<p>Every dependency is a potential failure point. The library that stops maintaining compatibility. The package that gets compromised. The framework that requires a specific Node version. Zero dependencies means zero supply chain risk.</p>

<pre><code>#!/usr/bin/env python3
"""Minimal recon scanner. Zero dependencies."""
import socket
import ssl
import json
import sys
from datetime import datetime

def scan_host(host, ports):
    results = []
    for port in ports:
        try:
            sock = socket.create_connection((host, port), timeout=3)
            sock.close()
            results.append({"port": port, "status": "open"})
        except (socket.timeout, ConnectionRefusedError):
            results.append({"port": port, "status": "closed"})
    return results

def check_tls(host, port=443):
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=host) as s:
            s.connect((host, port))
            cert = s.getpeercert()
            return {
                "subject": dict(x[0] for x in cert["subject"]),
                "issuer": dict(x[0] for x in cert["issuer"]),
                "expires": cert["notAfter"],
                "version": cert["version"]
            }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    host = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    ports = [22, 80, 443, 8080, 8443, 3000, 5432]
    result = {
        "host": host,
        "timestamp": datetime.utcnow().isoformat(),
        "ports": scan_host(host, ports),
        "tls": check_tls(host)
    }
    print(json.dumps(result, indent=2))</code></pre>

<h3>The Pipeline Architecture</h3>
<p>A recon pipeline has four stages: discover, enumerate, enrich, report. Discover finds live hosts. Enumerate finds open services. Enrich adds context (version info, TLS certificates, DNS records). Report produces actionable output.</p>
<p>The pipeline should be composable. Each stage reads from stdin and writes to stdout. You can pipe them together, run them separately, or skip stages. The Unix philosophy applies: do one thing well, and let the shell handle composition.</p>`,
    principles: [
      "Zero dependencies is a design decision, not a constraint. It makes the tool deployable anywhere.",
      "Every scan should produce machine-readable output (JSON) and human-readable output (table).",
      "Timeouts are not optional. A scan that hangs is worse than a scan that fails.",
      "Rate limiting is respect. Do not DoS the thing you are trying to understand.",
      "The recon output should be diffable. Compare today's scan against yesterday's scan."
    ],
    examples: [
      { title: "TLS Certificate Audit", body: "Scan a list of hosts for TLS certificate expiry dates. Group by issuer. Flag certificates expiring within 30 days. Output as CSV for tracking. The entire script is 40 lines of Python with zero imports beyond the standard library." },
      { title: "Port Scan Diff", body: "Run the same port scan against the same target on Monday and Thursday. Diff the results. New open ports are a signal. Closed ports are a signal. Unchanged ports are noise. The diff is the intelligence." }
    ],
    antiPatterns: [
      "Using Nmap scripts without understanding what they do. The default Nmap scan is loud and detectable.",
      "Running recon without a scope document. Unauthorized scanning is illegal in most jurisdictions.",
      "Storing recon output in plaintext on the scanning machine. The scan results are intelligence — treat them as sensitive.",
      "Ignoring false positives. An open port that is actually a CDN endpoint is not a finding."
    ],
    checklist: [
      "Scope document is signed before any scanning begins",
      "All tools are zero-dependency or vendored",
      "Output is JSON for machine processing, table for human review",
      "Rate limiting is configured per-target",
      "Results are diffed against previous scan"
    ],
    move: "Write a 50-line Python script that scans 10 common ports on a host, checks the TLS certificate, and outputs JSON. No imports beyond the standard library."
  },

  "appimage-portability": {
    intro: `<p>AppImage solved Linux distribution in 2004. Most people still ship tarballs and pray. An AppImage is a single file that runs on any Linux distribution without installation, without root, without dependency conflicts. It is the .exe of Linux — and it has been here for twenty years.</p>
<p>The problem AppImage solves is simple: Linux has no standard binary format. Every distribution packages differently. A .deb is not an .rpm is not an .apk. An AppImage bypasses all of this. It is a self-contained filesystem image that mounts via FUSE and runs the application with all its dependencies.</p>`,
    deepDive: `<h3>How AppImage Works</h3>
<p>An AppImage is an ISO 9660 filesystem image with a special header. The runtime binary (embedded in the image) mounts the image via FUSE, sets up the environment, and executes the application. The application sees its own library tree, not the system's.</p>

<pre><code># Build an AppImage
# 1. Create the AppDir structure
mkdir -p AppDir/usr/bin
mkdir -p AppDir/usr/share/applications
cp my-app AppDir/usr/bin/
cp my-app.desktop AppDir/usr/share/applications/

# 2. Download the runtime
wget https://github.com/AppImage/AppImageKit/releases/download/continuous/AppRun-x86_64.AppImage -O runtime

# 3. Build
./runtime --appimage-extract-and-run AppDir my-app-x86_64.AppImage

# Result: a single file that runs everywhere
chmod +x my-app-x86_64.AppImage
./my-app-x86_64.AppImage</code></pre>

<h3>Update Intelligence</h3>
<p>The built-in update mechanism checks a URL for new versions. When a user runs the AppImage, it can check for updates, download the new version, and replace itself. No package manager. No repository. Just a file that updates itself.</p>
<p>This is the deployment model that mobile apps popularized. The application owns its update lifecycle. The user does not need to know which repository to add or which package manager to use. The application handles it.</p>`,
    principles: [
      "One file, one run. No installation, no root, no side effects.",
      "The application owns its dependency tree. The system provides the kernel and nothing else.",
      "Update intelligence should be opt-in, not forced. The user decides when to update.",
      "AppImage is not a package format. It is a distribution format. Package for development, AppImage for distribution.",
      "The desktop integration file is required. Without it, the AppImage is a orphaned binary."
    ],
    examples: [
      { title: "CLI Tool Distribution", body: "A security scanner written in Rust. The developer builds the AppImage on CI with all Rust dependencies statically linked. The user downloads one file, makes it executable, and runs it. No Rust toolchain needed. No system library conflicts." },
      { title: "GUI Application", body: "AQtation tool built with Qt6. The AppImage bundles Qt and all plugins. The user on Ubuntu 20.04 and the user on Fedora 40 both run the same file. Both see the same interface." }
    ],
    antiPatterns: [
      "Bundling the entire GTK theme. Bundle the toolkit, not the user's preferences.",
      "Shipping AppImages without desktop integration files. The file manager should show the app icon.",
      "Using AppImage for daemon processes. AppImages are for interactive applications, not background services.",
      "Ignoring the FUSE requirement. Some containerized environments do not have FUSE. Document this."
    ],
    checklist: [
      "AppDir structure follows the spec (usr/bin, usr/share/applications)",
      "Desktop file includes Name, Exec, Icon, and Type fields",
      "AppImage runs on at least 3 different distributions",
      "Update mechanism is implemented and tested",
      "File size is reasonable (bundle only what is needed)"
    ],
    move: "Take one CLI tool you use. Build it as an AppImage. Test it on a distribution you do not normally use. Document the build process."
  },

  "boring-infrastructure": {
    intro: `<p>The strongest systems are usually the ones nobody notices. Boring infrastructure is not a compromise — it is a strategy. The load balancer that has been running for seven years. The PostgreSQL instance that has never lost a byte. The cron job that runs every morning at 4 AM and has never missed a beat. These are the systems that matter.</p>
<p>Every flashy technology decision is a bet. Every boring technology decision is a dividend. The compound interest of "it just works" is the difference between a system that scales and a system that needs a rewrite every eighteen months.</p>`,
    deepDive: `<h3>The Boring Technology Rule</h3>
<p>The rule is simple: use the most boring technology that solves the problem. If a PostgreSQL database handles your workload, do not use DynamoDB. If a file system handles your storage, do not use S3. If a cron job handles your scheduling, do not use Kubernetes CronJobs.</p>

<pre><code># Boring: a cron job that backs up the database
# Runs at 3 AM, rotates backups, compresses old ones.
# Has been running for 4 years without intervention.

0 3 * * * /usr/local/bin/backup-db.sh >> /var/log/backup.log 2>&1

# Flashy: a Kubernetes CronJob that does the same thing
# Requires: a Kubernetes cluster, RBAC configuration,
# persistent volumes, container images, monitoring,
# alerting, and a team that understands all of it.
# Fails in ways that require debugging the cluster,
# not the backup.</code></pre>

<h3>The Maintenance Tax</h3>
<p>Every technology decision has a maintenance tax. The tax is paid in engineering time, debugging time, and operational overhead. Flashy technologies have high maintenance taxes. Boring technologies have low maintenance taxes. Over a multi-year system lifetime, the maintenance tax dominates the total cost of ownership.</p>
<p>The math is straightforward: if a technology saves 10% on performance but costs 50% more in maintenance, it is a net loss over any meaningful time horizon. The only exception is when the performance gain is the difference between working and not working.</p>`,
    principles: [
      "Choose boring technology. The boring technology has been debugged by thousands of engineers before you.",
      "The maintenance tax compounds. A technology that costs 2 hours per month costs 24 hours per year.",
      "If you cannot explain the failure mode to a new hire in 5 minutes, the technology is too complex.",
      "Documentation is a feature. Boring technologies have better documentation than flashy ones.",
      "The goal is not to be impressive at conferences. The goal is to sleep through the night."
    ],
    examples: [
      { title: "PostgreSQL Over Everything", body: "PostgreSQL handles relational data, JSON documents, full-text search, time-series data, and geospatial queries. Before adding another database to your stack, ask whether PostgreSQL already solves the problem. The answer is usually yes." },
      { title: "Cron Over Kubernetes", body: "A cron job that runs a shell script is simpler than a Kubernetes CronJob. The shell script has no container to build, no image to push, no RBAC to configure, no pod to debug. It just runs." }
    ],
    antiPatterns: [
      "Adopting a new technology because it is interesting, not because the problem requires it.",
      "Rewriting working systems in a new language for performance gains that do not matter.",
      "Adding a caching layer before measuring whether you need one.",
      "Using microservices for a system that fits on one server."
    ],
    checklist: [
      "Every technology choice has a written justification",
      "The maintenance tax is estimated for each technology",
      "There is a rollback plan for every infrastructure change",
      "The system can be understood by a new engineer in one week",
      "There is no technology in the stack that the team cannot debug"
    ],
    move: "Audit your infrastructure. Count the technologies. For each one, ask: would this still work if the maintainer quit tomorrow? If the answer is no, it is too complex."
  },

  "threat-modeling-routine": {
    intro: `<p>Threat modeling is not a workshop. It is a habit. The field guide to thinking like an attacker is not a framework — it is a routine. Every morning, before you open the terminal, ask: what am I protecting, who is trying to get it, and what are they willing to do?</p>
<p>The best security engineers do not think about security as a feature. They think about it as a lens. Every system, every process, every decision has a security dimension. The question is not "is this secure?" — it is "what does this make possible for an attacker?"</p>`,
    deepDive: `<h3>The STRIDE Model as a Daily Practice</h3>
<p>STRIDE is not a checklist. It is a way of thinking. For every component in your system, ask: what Spoofing is possible? What Tampering can occur? What Repudiation is possible? What Information can be leaked? What Denial of Service is possible? What Elevation of privilege is possible?</p>

<pre><code>// Threat model for a webhook endpoint
//
// Spoofing: Can an attacker impersonate the webhook source?
//   -> Check HMAC signature on incoming requests
//   -> Rotate signing keys regularly
//
// Tampering: Can an attacker modify the payload?
//   -> HMAC covers payload integrity
//   -> But what about replay attacks? Add timestamp + nonce
//
// Repudiation: Can the caller deny sending the webhook?
//   -> Log the full request with timestamp
//   -> Store the HMAC for audit
//
// Information Disclosure: Does the error message leak info?
//   -> Return generic 400 for all validation failures
//   -> Log detailed errors server-side only
//
// Denial of Service: Can an attacker flood the endpoint?
//   -> Rate limit by source IP
//   -> Queue payloads, process asynchronously
//
// Elevation of Privilege: Can the webhook trigger admin actions?
//   -> Webhook payloads have limited scope
//   -> Require separate auth for destructive actions</code></pre>`,
    principles: [
      "Every system has an attacker model. If you cannot name the attacker, you do not understand the system.",
      "The most dangerous vulnerabilities are the ones that are not in the threat model.",
      "Security is not a binary state. It is a cost-benefit analysis. The question is not 'is it secure?' but 'is it secure enough?'",
      "The threat model must be a living document. It changes when the system changes.",
      "The most effective security control is the one that fails safely. Design for failure."
    ],
    examples: [
      { title: "Webhook Threat Model", body: "A payment webhook endpoint. The attacker wants to fake a payment confirmation. The defense: HMAC signature verification, timestamp validation, nonce tracking, and rate limiting. Each layer catches a different attack vector." },
      { title: "API Threat Model", body: "A REST API with JWT authentication. The attacker wants to escalate privileges. The defense: token validation, scope checking, rate limiting, and audit logging. The token is signed but not encrypted — the payload is visible to anyone who intercepts it." }
    ],
    antiPatterns: [
      "Threat modeling once and never updating it. The threat landscape changes constantly.",
      "Focusing on external threats and ignoring insider threats. The most dangerous attacker has credentials.",
      "Implementing security controls without testing them. A security control that has not been tested is a security theater.",
      "Assuming that encryption solves everything. Encryption does not protect against authorized access."
    ],
    checklist: [
      "Every component has a threat model entry",
      "The threat model is updated when the component changes",
      "Each threat has a documented mitigation",
      "The mitigations are tested regularly",
      "The threat model is accessible to the entire team"
    ],
    move: "Pick one endpoint in your system. Write a STRIDE analysis for it. Document the threats and mitigations. Review it with a teammate."
  },

  "ssh-hardening": {
    intro: `<p>Most servers get breached through the front door. SSH is the front door. It is the most exposed service on most servers, the most targeted by attackers, and the most neglected by administrators. The default SSH configuration is a welcome mat for brute-force attacks.</p>
<p>Hardening SSH is not optional. It is the minimum viable security. If you have a server on the internet with SSH open and password authentication enabled, you are being scanned right now. The bots do not sleep. The attacks do not stop. The question is not if you will be targeted — it is when.</p>`,
    deepDive: `<h3>The Hardening Checklist</h3>

<pre><code># /etc/ssh/sshd_config — hardened configuration

# Authentication
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30

# Access control
AllowUsers deploy admin
AllowGroups ssh-users

# Protocol
Protocol 2
X11Forwarding no
PermitEmptyPasswords no

# Cryptography (modern only)
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
HostKeyAlgorithms ssh-ed25519

# Logging
LogLevel VERBOSE
SyslogFacility AUTH

# Connection
ClientAliveInterval 300
ClientAliveCountMax 2
MaxSessions 3
MaxStartups 10:30:60</code></pre>

<h3>Fail2ban as the First Line</h3>
<p>Fail2ban monitors SSH log files for failed authentication attempts. When it detects a brute-force attack, it bans the source IP address. The default configuration is too lenient — it allows 5 attempts in 10 minutes. That is 5 attempts too many.</p>
<p>Configure fail2ban to ban after 3 attempts in 1 minute. Set the ban time to 1 hour for first offenses, 24 hours for repeat offenders. Use the aggressive jail configuration for high-value servers.</p>`,
    principles: [
      "Password authentication is a liability. Use key-based authentication exclusively.",
      "Root login via SSH is never necessary. Use a regular user and sudo.",
      "The default SSH configuration is designed for compatibility, not security.",
      "SSH keys are credentials. Protect them like passwords. Use passphrases.",
      "Log everything. SSH logs are the first evidence in a breach investigation."
    ],
    examples: [
      { title: "Key-Based Auth Setup", body: "Generate an Ed25519 key pair. Copy the public key to the server. Disable password authentication. The private key never leaves your machine. The server never sees a password. Brute-force attacks become impossible." },
      { title: "SSH Certificate Authority", body: "For large infrastructure, use SSH certificates instead of authorized_keys. The CA signs short-lived certificates. Revocation is instant. No need to manage hundreds of public keys across servers." }
    ],
    antiPatterns: [
      "Using RSA keys smaller than 4096 bits. Ed25519 is faster and more secure.",
      "Sharing SSH keys between team members. Each person gets their own key.",
      "Disabling SSH logging to reduce disk usage. Logs are evidence.",
      "Using port 22 and hoping attackers will not find it. Change the port as a basic measure."
    ],
    checklist: [
      "Password authentication is disabled",
      "Root login is disabled",
      "Only specific users/groups are allowed to connect",
      "SSH keys use Ed25519 or RSA-4096",
      "Fail2ban or equivalent is configured",
      "SSH logs are monitored and alerting is configured"
    ],
    move: "Audit your SSH configuration right now. Run sshd -T | grep -E 'passwordauthentication|permitrootlogin|maxauthtries'. If any of these are not what you expect, fix them."
  },

  "dns-privacy": {
    intro: `<p>Every website you visit starts with a DNS query. Most of them are logged. Your ISP sees every domain you resolve. Your DNS resolver sees every IP you connect to. The infrastructure of internet surveillance is built on DNS — the phone book of the internet that never forgets.</p>
<p>DNS was designed in an era of trust. The protocol sends queries in plaintext. The resolver logs every request. The ISP captures everything. The default configuration on most systems sends your browsing history to whoever runs the DNS server — usually your ISP.</p>`,
    deepDive: `<h3>DNS Over HTTPS</h3>
<p>DoH encrypts DNS queries by sending them over HTTPS connections. The resolver cannot see the queries in plaintext. The ISP cannot distinguish DNS queries from normal HTTPS traffic. The network observer sees only that you connected to a DoH resolver — not which domains you resolved.</p>

<pre><code># Configure DoH on Linux
# /etc/systemd/resolved.conf
[Resolve]
DNS=1.1.1.1#cloudflare-dns.com
DNS=9.9.9.9#dns.quad9.net
DNSOverTLS=yes
DNSSEC=yes

# Or use dnscrypt-proxy for more control
# /etc/dnscrypt-proxy/dnscrypt-proxy.toml
listen_addresses = ['127.0.0.1:53']
server_names = ['cloudflare', 'quad9']
静cache_size = 1000
[static]
  [static.'cloudflare']
  stamps = ['sdns://AgcAAAAAAAAABzEuMS4xLjEAEmNsb3VkZmxhcmUtZG5zLmNvbQ']
  [static.'quad9']
  stamps = ['sdns://AgcAAAAAAAAACzkLjkuOS45OQtéZWFzc3VwY2FzdC5jb20']</code></pre>

<h3>DNS Leak Testing</h3>
<p>Switching to DoH does not guarantee privacy. Your system may still leak DNS queries through other channels: systemd-resolved may bypass DoH for certain queries, the libc resolver may send direct queries, and browser DNS prefetch may ignore system settings.</p>`,
    principles: [
      "DNS queries are metadata. Metadata is surveillance. Encrypt DNS or accept that you are being watched.",
      "DNSSEC is authentication, not privacy. It verifies the response is legitimate. It does not hide the query.",
      "DoH and DoT solve different problems. DoH hides DNS in HTTPS traffic. DoT encrypts DNS on a dedicated port.",
      "DNS caching is a privacy feature. A cached response means no network query. Maximize cache TTLs.",
      "Split-horizon DNS is common in enterprise environments. DoH may break internal name resolution."
    ],
    examples: [
      { title: "Browser-Level DoH", body: "Firefox and Chrome both support DoH natively. Enable it in settings. The browser sends DNS queries over HTTPS to a resolver of your choice. The ISP sees only the HTTPS connection to the resolver, not the individual domains." },
      { title: "Network-Wide DoH", body: "Run dnscrypt-proxy on your router. All devices on the network use DoH transparently. No client-side configuration needed. The ISP sees only HTTPS traffic to the resolver." }
    ],
    antiPatterns: [
      "Using your ISP's DNS resolver. They log everything.",
      "Trusting 'private' DNS resolvers without verifying their privacy policy.",
      "Ignoring DNS leak testing. Switching to DoH does not mean you are private.",
      "Using DNS for access control. DNS-based blocking is trivially bypassed."
    ],
    checklist: [
      "System DNS resolver uses DoH or DoT",
      "Browser DNS settings are configured for DoH",
      "DNS leak test shows no plaintext queries",
      "DNS cache TTLs are configured to maximize privacy",
      "Internal DNS resolution is not affected by DoH changes"
    ],
    move: "Go to dnsleaktest.com right now. Run the extended test. If your ISP's name appears in the results, you are being surveilled. Fix it."
  },

  "container-escape": {
    intro: `<p>Containers are not VMs. They share a kernel. They share namespaces. They share cgroups. The isolation boundary is a software construct maintained by the kernel — not a hardware boundary maintained by a hypervisor. Understanding what containers actually isolate is the difference between security and theater.</p>
<p>A container escape is not a theoretical attack. It happens regularly. The kernel is a massive attack surface. Every syscall is a potential vector. Every capability is a potential privilege escalation path. The container runtime is a thin wrapper around kernel features — and kernel features have bugs.</p>`,
    deepDive: `<h3>Namespace Isolation</h3>
<p>Linux namespaces isolate different aspects of the system: PID (processes), NET (network), MNT (filesystem), UTS (hostname), IPC (inter-process communication), USER (user IDs), and CGROUP (cgroup root). A container gets its own set of namespaces. The host sees all of them.</p>

<pre><code># The container sees:
PID 1 = nginx
NET = its own network stack
MNT = its own filesystem view

# The host sees:
PID 12345 = nginx (running in a namespace)
NET = veth pair connected to bridge
MNT = overlayfs mount

# The shared resource:
KERNEL = the same kernel for both</code></pre>

<h3>Common Escape Vectors</h3>
<p>The most common escape vectors exploit the shared kernel: CVE-2022-0185 (heap overflow in filesystem context), CVE-2022-0492 (cgroup escape), CVE-2021-3493 (overlayfs privilege escalation). Each of these exploits the gap between what the container thinks it has and what the kernel actually provides.</p>`,
    principles: [
      "Containers share a kernel. The kernel is the attack surface. Minimize kernel exposure.",
      "Root inside a container is root on the host if capabilities are not restricted.",
      "Seccomp profiles are not optional. They are the last line of defense between container and kernel.",
      "Read-only rootfs is not a performance optimization. It is a security boundary.",
      "The container runtime should be the most boring, most audited, most patched software in your stack."
    ],
    examples: [
      { title: "Capability Restriction", body: "Drop all capabilities except NET_BIND_SERVICE. The container can bind to port 80 and nothing else. No mount, no chown, no kill, no reboot. The attack surface is reduced to the syscalls allowed by the seccomp profile." },
      { title: "Seccomp Profile", body: "A custom seccomp profile that allows only 40 of the 300+ Linux syscalls. The container cannot mount filesystems, load kernel modules, or access hardware. The profile is generated from a trace of normal application behavior." }
    ],
    antiPatterns: [
      "Running containers as root without justification.",
      "Using the default Docker seccomp profile without customization.",
      "Mounting the Docker socket inside a container. This is equivalent to giving the container root on the host.",
      "Ignoring container image scanning. A vulnerable base image is a vulnerable container."
    ],
    checklist: [
      "Containers run as non-root users",
      "All capabilities are dropped except those explicitly needed",
      "Seccomp profile is applied and tested",
      "Root filesystem is read-only",
      "Docker socket is not mounted",
      "Container images are scanned for vulnerabilities"
    ],
    move: "Run docker inspect on your containers. Check the CapAdd and SecurityOpt fields. If CapAdd is not empty or SecurityOpt does not include seccomp, you have work to do."
  },

  "bellman-ford-defi": {
    intro: `<p>Negative cycle detection is arbitrage detection. The algorithm predates DeFi by forty years. Bellman-Ford was published in 1958. DeFi launched in 2020. The connection is direct: a negative cycle in a currency exchange graph is a guaranteed profit opportunity. The algorithm finds it. The smart contract executes it.</p>
<p>The insight is simple: if you can exchange A for B, B for C, and C for A, and end up with more A than you started with, you have found a negative cycle. The "negative" refers to the log of the exchange rates — a profitable cycle has a negative total log-weight.</p>`,
    deepDive: `<h3>The Currency Graph</h3>
<p>Each token is a node. Each exchange rate is a directed edge. The edge weight is -log(rate), so that the sum of weights around a profitable cycle is negative. The Bellman-Ford algorithm detects these negative cycles in O(V*E) time.</p>

<pre><code>// Build the currency graph from AMM pools
function buildGraph(pools: Pool[]): Edge[] {
  const edges: Edge[] = [];
  for (const pool of pools) {
    // Forward edge: tokenA -> tokenB
    edges.push({
      from: pool.tokenA,
      to: pool.tokenB,
      weight: -Math.log(pool.rateAtoB * (1 - pool.fee))
    });
    // Backward edge: tokenB -> tokenA
    edges.push({
      from: pool.tokenB,
      to: pool.tokenA,
      weight: -Math.log(pool.rateBtoA * (1 - pool.fee))
    });
  }
  return edges;
}

// Detect negative cycles
function detectArbitrage(nodes: string[], edges: Edge[]): Cycle[] {
  const dist = new Map(nodes.map(n => [n, 0]));
  const prev = new Map(nodes.map(n => [n, ""]));
  const cycles: Cycle[] = [];

  for (let i = 0; i < nodes.length - 1; i++) {
    for (const e of edges) {
      const newDist = dist.get(e.from)! + e.weight;
      if (newDist < dist.get(e.to)!) {
        dist.set(e.to, newDist);
        prev.set(e.to, e.from);
      }
    }
  }

  // Find negative cycles
  for (const e of edges) {
    if (dist.get(e.from)! + e.weight < dist.get(e.to)!) {
      cycles.push(traceCycle(e, prev));
    }
  }

  return cycles;
}</code></pre>`,
    principles: [
      "The graph is weighted by -log(rate). Positive exchange rates become additive weights. Profitable cycles have negative total weight.",
      "Fee structure matters. A cycle that is profitable without fees may be unprofitable with them. Include fees in the edge weights.",
      "The algorithm is O(V*E). For most DeFi graphs, that is sub-millisecond. The bottleneck is data freshness, not computation.",
      "Multi-hop arbitrage (3+ tokens) is common. The algorithm naturally handles any cycle length.",
      "The smart contract execution must be atomic. If the cycle closes between steps, the transaction must revert."
    ],
    examples: [
      { title: "Three-Token Arbitrage", body: "ETH -> USDC -> DAI -> ETH. The cycle has three edges. Bellman-Ford finds it by relaxing all edges V-1 times, then checking for further relaxation. If any edge can still be relaxed, a negative cycle exists." },
      { title: "Flash Loan Arbitrage", body: "Borrow ETH via flash loan, execute the three-token arbitrage, repay the loan, keep the profit. The entire sequence is atomic. If the profit is negative, the transaction reverts. Zero capital required, zero risk of loss." }
    ],
    antiPatterns: [
      "Ignoring gas costs. A cycle that yields 0.01% profit but costs 0.05% in gas is a loss.",
      "Using Bellman-Ford on the full token graph. Pre-filter to tokens with active pools.",
      "Not accounting for slippage. Large trades move the price along the cycle.",
      "Running the detection on-chain. The graph is too large for gas. Detect off-chain, execute on-chain."
    ],
    checklist: [
      "Graph includes all active pools with correct exchange rates",
      "Edge weights include protocol fees",
      "Gas cost is subtracted from cycle profit",
      "Execution is atomic (flash loan or smart contract)",
      "The cycle is verified on-chain before execution"
    ],
    move: "Export the top 100 Uniswap V3 pools. Build the adjacency list. Run Bellman-Ford. List every negative cycle with its profit after fees."
  },

  "flash-loan-architecture": {
    intro: `<p>Borrow and repay in one transaction. The constraint shapes everything above it. Flash loans are not just a DeFi primitive — they are an architectural constraint that eliminates counterparty risk entirely. If you cannot repay, the transaction reverts. No debt. No liquidation. No bad debt.</p>
<p>The design insight is that within a single atomic transaction, capital has zero opportunity cost. You can borrow a billion dollars, use it for three milliseconds, and repay it — all for the cost of gas. This changes the economics of every financial operation.</p>`,
    deepDive: `<h3>Flash Loan Mechanics</h3>

<pre><code>// Flash loan contract interface
interface IFlashLender {
  function flashLoan(
    address receiver,
    address token,
    uint256 amount,
    bytes calldata data
  ) external returns (bool);

  function onFlashLoan(
    address initiator,
    address token,
    uint256 amount,
    uint256 fee,
    bytes calldata data
  ) external returns (bytes32);
}

// Usage pattern:
// 1. Borrow via flash loan
// 2. Use the capital (arbitrage, liquidation, collateral swap)
// 3. Repay with fee
// 4. If step 3 fails, everything reverts</code></pre>

<h3>Architectural Patterns</h3>
<p>Flash loans enable three architectural patterns: atomic arbitrage (find price discrepancy, execute, profit), liquidation (borrow, buy collateral, sell, repay), and collateral swap (unwind position, move collateral, rewind position). Each pattern follows the same structure: borrow, act, repay.</p>`,
    principles: [
      "Flash loans are not free money. The fee is small, but it exists. Factor it into every calculation.",
      "The atomic constraint is a feature, not a limitation. It eliminates the need for trust.",
      "Flash loan recipients must implement onFlashLoan. The callback is the execution environment.",
      "The flash loan fee is paid in the borrowed token. Ensure you have enough to repay.",
      "Flash loans can be composed. Multiple flash loans in a single transaction enable complex multi-step strategies."
    ],
    examples: [
      { title: "Atomic Arbitrage", body: "Borrow 1000 ETH via flash loan. Swap ETH for USDC on Uniswap at $1800. Swap USDC for ETH on SushiSwap at $1810. Repay 1000 ETH + 0.09% fee. Profit: ~9 ETH minus gas. All in one transaction." },
      { title: "Collateral Swap", body: "Borrow USDC via flash loan. Withdraw ETH collateral from Aave. Deposit ETH collateral to Compound. Repay USDC flash loan. The user's DeFi position has moved from Aave to Compound in one transaction, with no capital at risk during the transition." }
    ],
    antiPatterns: [
      "Using flash loans for trading without a guaranteed exit. If the price moves against you during the transaction, you lose.",
      "Ignoring the flash loan fee. At scale, 0.09% on billions of dollars is significant.",
      "Building flash loan protection into the frontend. A determined attacker will call the contract directly.",
      "Assuming flash loans are the only way to get atomic capital. Atomic swap contracts provide similar guarantees."
    ],
    checklist: [
      "Flash loan amount includes the fee",
      "Execution logic handles the case where the profit is zero or negative",
      "The contract implements the flash loan callback correctly",
      "Gas estimation accounts for all operations in the atomic transaction",
      "The strategy is profitable after gas and fees"
    ],
    move: "Write a smart contract that executes a flash loan arbitrage between two Uniswap pools. Deploy to a testnet. Verify that the transaction reverts when the spread is negative."
  },

  "agent-architecture": {
    intro: `<p>An agent that cannot act is a chatbot. The difference is the action layer. AI agents are not large language models with ambition. They are workflow engines with an action layer, error recovery, and a state machine. The LLM is the brain. The action layer is the hands. Without the hands, the brain is just generating text.</p>
<p>The architectural question is not "how smart is the agent?" — it is "what can the agent do?" An agent that can read emails but not respond is a monitoring tool. An agent that can respond but not recover from failure is a demo. An agent that can do both is a system.</p>`,
    deepDive: `<h3>The Action Layer</h3>

<pre><code>// Agent architecture
interface Agent {
  // Perception: what does the agent see?
  perceive(context: Context): Observation[];

  // Decision: what should the agent do?
  decide(observation: Observation[]): Action[];

  // Execution: do it
  execute(action: Action): Result;

  // Recovery: what if it fails?
  recover(action: Action, error: Error): RecoveryAction;

  // Memory: what did it learn?
  remember(result: Result): void;
}

// The action loop
async function agentLoop(agent: Agent, context: Context) {
  while (true) {
    const observations = agent.perceive(context);
    const actions = agent.decide(observations);

    for (const action of actions) {
      try {
        const result = await agent.execute(action);
        agent.remember(result);
      } catch (error) {
        const recovery = agent.recover(action, error);
        await agent.execute(recovery);
      }
    }

    if (shouldStop(context)) break;
  }
}</code></pre>

<h3>Error Recovery</h3>
<p>The most important part of agent architecture is error recovery. Every action can fail. Every external API can be down. Every database can be locked. The agent that cannot recover from failure is a liability. The agent that logs the failure, retries with backoff, and falls back to a safe state is a system.</p>`,
    principles: [
      "The action layer is the agent's identity. An agent without actions is a chatbot.",
      "Error recovery is not optional. Every action must have a recovery path.",
      "The agent must be able to explain its decisions. An agent that cannot is a black box.",
      "State machines are the correct abstraction for agent behavior. Explicit states, explicit transitions.",
      "The agent must be killable. A runaway agent is worse than no agent."
    ],
    examples: [
      { title: "Email Triage Agent", body: "An agent that reads incoming emails, classifies them by urgency and category, drafts responses for routine emails, and escalates urgent ones. The action layer: read email, classify, draft, send, escalate. Error recovery: retry on API failure, queue for manual review on classification uncertainty." },
      { title: "Infrastructure Monitor", body: "An agent that monitors server metrics, detects anomalies, and takes corrective action. The action layer: query metrics, compare to thresholds, restart services, scale instances. Error recovery: if restart fails, page the on-call engineer. The agent never silently fails." }
    ],
    antiPatterns: [
      "Building an agent without a kill switch. Every agent must be stoppable.",
      "Using the LLM for decisions that should be deterministic. Use the LLM for language, not for math.",
      "Ignoring latency. An agent that takes 30 seconds to decide is too slow for real-time operations.",
      "Building a monolithic agent. Decompose into small, focused agents with clear responsibilities."
    ],
    checklist: [
      "Every action has a defined recovery path",
      "The agent can explain its decisions",
      "The agent can be stopped gracefully",
      "All actions are logged with timestamps",
      "The agent handles external API failures with retry and backoff"
    ],
    move: "Build an agent that does one thing: monitor a URL and alert if it goes down. Implement the full loop: perceive (HTTP check), decide (up or down), execute (alert), recover (retry on network error)."
  },

  "wallet-key-management": {
    intro: `<p>Key management is the whole game. A wallet without proper key management is just a text file with money attached. The private key is the money. Lose the key, lose the money. Leak the key, someone else has the money. The wallet is a UI for the key — nothing more.</p>
<p>The hierarchy of key management is simple: generate securely, store offline, derive for use, rotate regularly. Every deviation from this hierarchy is a risk. Every convenience shortcut is a potential loss.</p>`,
    deepDive: `<h3>Key Derivation</h3>

<pre><code>// HD wallet derivation path
// BIP-44: m/44'/coin'/account'/change/address
// Example Ethereum: m/44'/60'/0'/0/0

// Each level of the hierarchy is a different concern:
// Purpose (44') = BIP-44 standard
// Coin (60') = Ethereum
// Account (0') = which wallet
// Change (0) = receive (0) or change (1)
// Address (0) = which address in the account

// The master key derives ALL keys
// Compromise the master key = compromise everything</code></pre>

<h3>Storage Threat Model</h3>
<p>The key storage threat model has three vectors: online (malware, phishing, remote access), physical (theft, coercion, inspection), and supply chain (hardware wallet tampering, firmware backdoors). Each vector requires a different mitigation.</p>`,
    principles: [
      "The private key is the money. Protect the key, protect the money. Lose the key, lose the money.",
      "Never store private keys in plaintext. Encrypt at rest, encrypt in transit.",
      "Hardware wallets are not invulnerable. They are a defense against online attacks, not physical attacks.",
      "Seed phrases are private keys in a different form. Protect them with the same rigor.",
      "Key rotation is not optional. Compromised keys must be replaceable without losing access."
    ],
    examples: [
      { title: "Multi-Sig Wallet", body: "A 2-of-3 multi-sig wallet with keys stored in three different physical locations. No single compromise can drain the wallet. No single loss can lock the user out. The tradeoff is convenience — every transaction requires two signatures." },
      { title: "Key Sharding", body: "Split the seed phrase using Shamir's Secret Sharing into 3 shares, with 2 required for reconstruction. Store each share in a different geographic location. A single share reveals nothing about the seed phrase." }
    ],
    antiPatterns: [
      "Storing seed phrases in cloud storage. Cloud providers can access your data.",
      "Using the same wallet for high-value and low-value holdings. Separate by purpose.",
      "Sharing private keys with anyone. No one needs your private key for any legitimate purpose.",
      "Ignoring key rotation. If you suspect compromise, rotate immediately."
    ],
    checklist: [
      "Private keys are stored offline or in a hardware wallet",
      "Seed phrases are backed up in multiple physical locations",
      "Multi-sig is used for high-value holdings",
      "Key rotation policy is defined and followed",
      "Recovery procedure is tested regularly"
    ],
    move: "Check your wallet setup right now. Where is your seed phrase? If it is in a digital format (photo, text file, cloud), you are one breach away from losing everything. Move it offline."
  },

  "rf-replay-security": {
    intro: `<p>Replay attacks work because wireless protocols assumed a trusted physical layer. They were wrong. Your key fob, your garage door opener, your car's keyless entry — they all broadcast a signal that can be captured and replayed. The signal does not authenticate itself. The receiver does not verify freshness.</p>
<p>The fundamental problem is that RF signals are one-way broadcasts with no challenge-response mechanism. The transmitter sends a code. The receiver accepts it. There is no proof that the code was generated recently, that it was generated by the legitimate transmitter, or that it was not copied from a previous transmission.</p>`,
    deepDive: `<h3>Rolling Codes</h3>
<p>Rolling codes are the most common defense against replay attacks. The transmitter and receiver share a secret and a counter. Each transmission includes the counter value encrypted with the secret. The receiver decrypts the counter, checks that it is within the expected window, and accepts or rejects.</p>

<pre><code>// Rolling code protocol
//
// Transmitter:
// counter++
// encrypted = AES(secret, counter)
// send(encrypted)
//
// Receiver:
// for i in expected_window:
//   if AES_decrypt(secret, received) == i:
//     accept()
//     expected_window = (i+1, i+window)
//     return
// reject()

// Vulnerability: the "window"
// The receiver accepts codes within a window (e.g., 256 codes ahead)
// If an attacker captures a code and blocks the legitimate transmission,
// the attacker's captured code is still valid within the window</code></pre>

<h3>The Relay Attack</h3>
<p>The relay attack extends replay to proximity. An attacker places a relay device near the victim's key fob and another near the car. The car's challenge is relayed to the key fob, the key fob's response is relayed back. The car thinks the key fob is present. It is not — it is in the victim's pocket, fifty meters away.</p>`,
    principles: [
      "RF signals do not authenticate themselves. Every wireless protocol must implement authentication at the application layer.",
      "Replay defense requires freshness. A challenge-response mechanism or a rolling code prevents replay.",
      "Rolling code windows are a security-convenience tradeoff. Wider windows are more convenient but more vulnerable.",
      "Relay attacks defeat proximity assumptions. If your security depends on 'the key is nearby,' it is not secure.",
      "Signal strength is not authentication. A relay can amplify signals in both directions."
    ],
    examples: [
      { title: "Garage Door Replay", body: "Capture the RF signal from a garage door remote using a SDR. Replay the signal. The garage opens. The fix: rolling codes with a challenge-response mechanism. The fix is available in modern openers but rarely implemented in older systems." },
      { title: "Keyless Entry Relay", body: "Two attackers, two relay devices. One stands near the victim's house, the other near the victim's car. The car's challenge is relayed to the key fob inside the house. The key fob's response is relayed back. The car unlocks. The victim never knew." }
    ],
    antiPatterns: [
      "Assuming that encrypted signals are authenticated signals. Encryption does not prevent replay.",
      "Using fixed codes for wireless authentication. Every code must be used at most once.",
      "Relying on signal strength as a proximity check. Relays defeat this.",
      "Ignoring the physical layer. RF security starts at the antenna."
    ],
    checklist: [
      "All wireless protocols use challenge-response or rolling codes",
      "Rolling code windows are as small as usability allows",
      "Relay attacks are considered in the threat model",
      "Signal strength is not relied upon for security decisions",
      "Legacy systems with fixed codes are replaced or disabled"
    ],
    move: "Identify every wireless device in your environment. Check if it uses rolling codes or fixed codes. If it uses fixed codes, it is vulnerable to replay attacks right now."
  },

  "monitoring-philosophy": {
    intro: `<p>If your dashboard shows the same green every day, it is not monitoring. It is decoration. Monitoring should tell you something new. It should surface anomalies, highlight trends, and alert on conditions that matter. A dashboard that never changes is a dashboard that is never looked at.</p>
<p>The philosophy of monitoring is simple: measure what matters, alert on what is actionable, and ignore everything else. Most monitoring systems fail not because they measure too little, but because they measure too much. The signal is buried in noise. The alert that fires every day is the alert that gets ignored.</p>`,
    deepDive: `<h3>The Four Signals</h3>
<p>There are only four signals that matter: latency (how long does it take?), traffic (how much work is there?), errors (what is failing?), and saturation (how full is the system?). These are the Google SRE four golden signals. Every metric you collect should map to one of these four.</p>

<pre><code># The four golden signals
#
# Latency: time to service a request
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
#
# Traffic: requests per second
rate(http_requests_total[5m])
#
# Errors: error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
#
# Saturation: how full is the resource
1 - (node_memory_available_bytes / node_memory_total_bytes)</code></pre>

<h3>Alert Fatigue</h3>
<p>Alert fatigue is the condition where engineers ignore alerts because there are too many. The fix is not "fewer alerts" — it is "better alerts." Every alert must be actionable. If the alert fires and the engineer cannot do anything about it, the alert should not exist.</p>`,
    principles: [
      "Measure what matters. If you cannot explain why a metric is collected, stop collecting it.",
      "Alert on conditions, not symptoms. A CPU spike is a symptom. A latency increase is a condition.",
      "Every alert must be actionable. If the engineer cannot do anything, the alert is noise.",
      "Dashboards should tell a story. If the story is 'everything is green,' the dashboard is useless.",
      "Monitoring is not observability. Monitoring tells you what is broken. Observability tells you why."
    ],
    examples: [
      { title: "Useful Alert", body: "P99 latency exceeds 500ms for 5 minutes. The engineer can investigate: is it a database slow query? A network issue? A capacity problem? The alert is actionable and specific." },
      { title: "Useless Alert", body: "CPU usage exceeds 80% for 5 minutes. The engineer cannot do anything about this. CPU usage is a symptom, not a cause. The alert fires, the engineer ignores it, and the real problem goes undetected." }
    ],
    antiPatterns: [
      "Alerting on every metric that exceeds a threshold. Most thresholds are arbitrary.",
      "Using the same alert for all services. Each service has different failure modes.",
      "Ignoring the alert history. An alert that fires every day is not an alert — it is a log entry.",
      "Building dashboards that nobody looks at. If the dashboard is not used, delete it."
    ],
    checklist: [
      "All metrics map to one of the four golden signals",
      "Every alert is actionable",
      "Alert fatigue is measured (alert acknowledgment rate)",
      "Dashboards are reviewed monthly",
      "Monitoring covers the full stack (infrastructure, application, business)"
    ],
    move: "Audit your alerts. Count how many fire per week. For each one, ask: what did the engineer do when it fired? If the answer is 'nothing' or 'acknowledged and moved on,' delete the alert."
  }
};

function findRelevantItems(article: ArticlePlan, items: ScoredOpportunity[]): ScoredOpportunity[] {
  return items
    .map(item => ({
      ...item,
      matchScore: article.tags.filter(t => item.topics.some(it => it.toLowerCase() === t.toLowerCase())).length + (item.priority / 100)
    }))
    .filter(item => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}

function renderArticleBody(article: ArticlePlan, items: ScoredOpportunity[], _allItems: ScoredOpportunity[]): string {
  const content = ARTICLES[article.slug];
  if (!content) return fallbackBody(article, items);

  const sections: string[] = [];

  const image = getImage(article.slug);
  if (image) {
    sections.push(`<figure class="article-hero"><img src="${image.url}" alt="${image.alt}" width="1200" height="675" loading="eager" /><figcaption>Photo by <a href="${image.photographerUrl}" target="_blank" rel="noopener">${image.photographer}</a> on <a href="${image.sourceUrl}" target="_blank" rel="noopener">Pexels</a></figcaption></figure>`);
  }

  sections.push(content.intro);

  sections.push(`<h2>THE DEEP DIVE</h2>`);
  sections.push(content.deepDive);

  sections.push(`<h2>PRINCIPLES</h2>`);
  sections.push(`<ol>`);
  for (const p of content.principles) {
    sections.push(`<li><strong>${p}</strong></li>`);
  }
  sections.push(`</ol>`);

  if (content.examples.length > 0) {
    sections.push(`<h2>IN PRACTICE</h2>`);
    for (const ex of content.examples) {
      sections.push(`<h3>${ex.title}</h3>`);
      sections.push(`<p>${ex.body}</p>`);
    }
  }

  if (items.length > 0) {
    sections.push(`<h2>LIVE SIGNALS</h2>`);
    sections.push(`<p>These items surfaced from the intelligence pipeline at generation time.</p>`);
    sections.push(`<ul>`);
    for (const item of items) {
      sections.push(`<li><a href="${item.url}" target="_blank">${item.title}</a> — ${item.summary} <em>(${item.source})</em></li>`);
    }
    sections.push(`</ul>`);
  }

  sections.push(`<h2>ANTIPATTERNS</h2>`);
  sections.push(`<ul>`);
  for (const ap of content.antiPatterns) {
    sections.push(`<li>${ap}</li>`);
  }
  sections.push(`</ul>`);

  sections.push(`<h2>CHECKLIST</h2>`);
  sections.push(`<ul>`);
  for (const c of content.checklist) {
    sections.push(`<li>${c}</li>`);
  }
  sections.push(`</ul>`);

  sections.push(`<h2>YOUR MOVE</h2>`);
  sections.push(`<p>${content.move}</p>`);

  return sections.join("\n");
}

function fallbackBody(article: ArticlePlan, items: ScoredOpportunity[]): string {
  return `<h2>WHY IT MATTERS</h2>
<p>${article.excerpt}</p>
${items.length > 0 ? `<h2>LIVE SIGNALS</h2><ul>${items.map(i => `<li><a href="${i.url}">${i.title}</a> — ${i.summary}</li>`).join("")}</ul>` : ""}
<h2>YOUR MOVE</h2>
<p>Open a terminal, test one idea, and return with a sharper question.</p>`;
}

export async function generateArticleContent(article: ArticlePlan, allItems: ScoredOpportunity[]): Promise<string> {
  const relevant = findRelevantItems(article, allItems);
  return renderArticleBody(article, relevant, allItems);
}

export async function generateAllArticles(): Promise<{ slug: string; success: boolean; error?: string }[]> {
  const results: { slug: string; success: boolean; error?: string }[] = [];
  const articlesPath = path.join(process.cwd(), "src/content/articles.json");
  const articlesData = JSON.parse(await fs.readFile(articlesPath, "utf8")) as ArticlePlan[];

  console.log("Running research pipeline...");
  const research = await runIntelligence([githubCollector, hackerNewsCollector, cveCollector, cryptoCollector]);
  console.log(`Collected ${research.items.length} intelligence items (${research.errors.length} errors)`);

  for (const article of articlesData) {
    try {
      console.log(`Generating: ${article.title}`);
      const body = await generateArticleContent(article, research.items);

      const index = articlesData.findIndex(a => a.slug === article.slug);
      if (index !== -1) {
        articlesData[index] = { ...articlesData[index], body };
      }

      results.push({ slug: article.slug, success: true });
    } catch (error) {
      results.push({ slug: article.slug, success: false, error: String(error) });
    }
  }

  await fs.writeFile(articlesPath, JSON.stringify(articlesData, null, 2));
  return results;
}

export async function generateArticleBySlug(slug: string): Promise<{ success: boolean; error?: string }> {
  const articlesPath = path.join(process.cwd(), "src/content/articles.json");
  const articlesData = JSON.parse(await fs.readFile(articlesPath, "utf8")) as ArticlePlan[];

  const article = articlesData.find(a => a.slug === slug);
  if (!article) {
    return { success: false, error: `Article with slug "${slug}" not found` };
  }

  try {
    console.log("Running research pipeline...");
    const research = await runIntelligence([githubCollector, hackerNewsCollector, cveCollector, cryptoCollector]);
    console.log(`Collected ${research.items.length} intelligence items`);

    const body = await generateArticleContent(article, research.items);
    const index = articlesData.findIndex(a => a.slug === slug);
    if (index !== -1) {
      articlesData[index] = { ...articlesData[index], body };
    }
    await fs.writeFile(articlesPath, JSON.stringify(articlesData, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
