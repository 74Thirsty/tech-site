export type TopicContent = {
  intro: string;
  deepDive: string;
  principles: string[];
  examples: Array<{ title: string; body: string }>;
  antiPatterns: string[];
  checklist: string[];
  move: string;
};

export const TOPIC_CONTENT: Record<string, TopicContent> = {

  "smart-contract-auditing": {
    intro: `<p>Every line of Solidity is a potential exploit. The auditor reads code differently: not to understand what it does, but to understand what it makes possible. The question is not "is this correct?" — it is "what happens when this is called by someone who wants to steal everything?"</p>
<p>Smart contract auditing is adversarial reading. The auditor assumes the contract is hostile. Every external call is a potential reentrancy vector. Every unchecked return value is a potential silent failure. Every assumption about transaction ordering is a potential front-running opportunity.</p>`,
    deepDive: `<h3>Reentrancy: The Classic Kill Shot</h3>
<p>Reentrancy is the most well-known Solidity vulnerability and still the most costly. An external call transfers control to an untrusted contract before updating state. The untrusted contract calls back into the original function, draining funds before the state is updated.</p>

<pre><code>// VULNERABLE: state update after external call
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok);
    balances[msg.sender] -= amount;  // Too late. Already drained.
}

// SECURE: checks-effects-interactions + reentrancy guard
uint256 private _locked;
modifier nonReentrant() {
    require(_locked == 0);
    _locked = 1;
    _;
    _locked = 0;
}

function withdraw(uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok);
}</code></pre>

<h3>Integer Arithmetic and Overflow</h3>
<p>Solidity 0.8.0 introduced built-in overflow checking. Before that, unsigned integers wrapped around on overflow. A balance of 0 minus 1 became 2^256 - 1.</p>

<pre><code>// Pre-0.8.0: overflow was silent
uint8 balance = 255;
balance += 1;  // balance is now 0, not 256

// Post-0.8.0: overflow reverts
uint8 balance = 255;
balance += 1;  // REVERT: arithmetic overflow

// Unchecked block: explicit opt-in (gas optimization)
unchecked {
    balance += 1;  // Wraps around, no revert
}

// Real-world exploit pattern (pre-0.8.0):
// 1. Attacker has 0 tokens
// 2. Transfer -1 tokens (underflow to 2^256-1)
// 3. Attacker now has max uint256 tokens
// 4. Drain all pools</code></pre>

<h3>Access Control Failures</h3>
<p>The most common vulnerability after reentrancy is missing or incorrect access control. Functions that should be restricted to the owner are publicly callable.</p>

<pre><code>// Common access control patterns
// 1. Owner-only (basic but insufficient)
address public owner;
modifier onlyOwner() {
    require(msg.sender == owner);
    _;
}

// 2. Multi-sig (better) — Gnosis Safe is the standard
// Requires M-of-N signatures for critical operations

// 3. Timelock (best for governance)
// Actions execute after a delay, allowing users to exit

// 4. Role-based (OpenZeppelin AccessControl)
// Granular permissions: ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE</code></pre>

<h3>Oracle Manipulation</h3>
<p>DeFi protocols that rely on price oracles are vulnerable to manipulation. The attacker moves the spot price on a DEX, the oracle reads the manipulated price, and the protocol acts on corrupted data.</p>

<pre><code>// Defense: use multiple oracle sources with deviation checks
function getPrice(address token) internal view returns (uint256) {
    uint256 uniswapPrice = uniswapOracle.getPrice(token);
    uint256 chainlinkPrice = chainlinkOracle.getPrice(token);
    uint256 bandwidth = chainlinkPrice * 5 / 100;  // 5% deviation

    require(
        uniswapPrice > chainlinkPrice - bandwidth &&
        uniswapPrice < chainlinkPrice + bandwidth,
        "Oracle deviation too large"
    );

    return (uniswapPrice + chainlinkPrice) / 2;
}</code></pre>`,
    principles: [
      "Checks-Effects-Interactions is not a suggestion. It is the law. State updates before external calls, every time.",
      "Assume every external contract call is hostile. The contract on the other end will try to exploit you.",
      "Oracle data is only as fresh as the last block. Design for staleness, not freshness.",
      "Access control is not a feature — it is the skeleton of the contract. Missing it means the contract has no skeleton.",
      "The reentrancy guard is a mutex. It costs gas. Use it anyway. The cost of not using it is measured in millions."
    ],
    examples: [
      { title: "The DAO Hack (2016)", body: "A recursive reentrancy drained 3.6 million ETH. The withdraw function updated balances after the external call. The attacker's fallback function called withdraw repeatedly before balances decremented. The fix was simple: update state before the call. The lesson cost $60 million." },
      { title: "Parity Multisig Freeze (2017)", body: "A library contract was initialized with delegatecall. Any user could call initWallet to become the owner. The attacker 'fixed' the library by calling kill, which self-destructed it. Every wallet using it lost access to funds permanently." }
    ],
    antiPatterns: [
      "Using delegatecall to untrusted contracts. The called contract executes in the caller's storage context.",
      "Relying on msg.sender for authorization in a proxy pattern. The delegatecaller controls msg.sender.",
      "Forgetting to handle ERC777 hooks. The tokensReceived callback enables reentrancy in token transfers.",
      "Assuming balanceOf is accurate. Flash loans make balanceOf meaningless as a security measure."
    ],
    checklist: [
      "All external calls follow checks-effects-interactions pattern",
      "Reentrancy guard on every function that transfers ETH or tokens",
      "Oracle prices validated against multiple sources with deviation checks",
      "Access control on every state-changing function",
      "Integer arithmetic is safe (Solidity 0.8+ or SafeMath)",
      "Events emitted for every state change"
    ],
    move: "Open the Ethernaut challenges. Complete the first ten. Each one teaches a different exploit pattern. By the end, you will read Solidity like a vulnerability, not a language."
  },

  "zero-trust-network-architecture": {
    intro: `<p>Zero trust architecture assumes every connection is compromised. The network is the enemy. Your own infrastructure is hostile. Verify everything, trust nothing. This is not a product you buy — it is an architecture you build.</p>
<p>The traditional perimeter model ("inside is safe, outside is dangerous") is dead. Lateral movement is trivial once an attacker breaches the perimeter. Zero trust eliminates the concept of a trusted network entirely.</p>`,
    deepDive: `<h3>Identity as the Perimeter</h3>
<p>In zero trust, the perimeter is identity, not the network. Every device, every user, every service has a cryptographic identity. Access decisions are based on who you are, what device you are on, and what the risk level is.</p>

<pre><code># mTLS: every connection is mutual authentication
# Server verifies client certificate, client verifies server certificate

# Generate CA
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 \
  -keyout ca-key.pem -out ca-cert.pem -nodes \
  -subj "/CN=Internal CA"

# Generate server cert signed by CA
openssl req -newkey rsa:4096 -nodes -keyout server-key.pem \
  -out server.csr -subj "/CN=api.internal"
openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -days 365

# Server config: require client cert
ssl_certificate /etc/ssl/server-cert.pem;
ssl_certificate_key /etc/ssl/server-key.pem;
ssl_client_certificate /etc/ssl/ca-cert.pem;
ssl_verify_client on;</code></pre>

<h3>Microsegmentation</h3>
<p>Microsegmentation divides the network into tiny zones. Each zone has its own access policy. A breach in one zone does not grant access to another.</p>

<pre><code># Cilium network policy: restrict pod-to-pod communication
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-server-policy
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8443"
  egress:
    - toEndpoints:
        - matchLabels:
            app: database
      toPorts:
        - ports:
            - port: "5432"</code></pre>

<h3>Continuous Verification</h3>
<p>Zero trust is not "verify once at login." It is "verify continuously." Every request is evaluated against current risk signals: device health, user behavior, time of access, network location.</p>

<pre><code># Device health check before granting access
{
  "policy": {
    "conditions": [
      {"device": {"os_version": {"gte": "14.0"}}},
      {"device": {"disk_encryption": true}},
      {"device": {"antivirus_running": true}},
      {"user": {"mfa_verified": true}},
      {"risk_score": {"lte": 30}}
    ],
    "effect": "allow",
    "duration": "1h"
  }
}
# Re-evaluate every hour. If device falls out of compliance,
# revoke access immediately.</code></pre>`,
    principles: [
      "Never trust, always verify. Every connection is authenticated, every request is authorized.",
      "Assume breach. Design for lateral movement being trivial, then make it impossible.",
      "Least privilege access. Every identity gets exactly the permissions it needs, nothing more.",
      "Verify continuously, not just at login. Device posture and risk scores change.",
      "Encrypt everything. Data in transit and data at rest. No exceptions."
    ],
    examples: [
      { title: "Google BeyondCorp", body: "Google eliminated VPN entirely. Every employee accesses internal applications through the public internet. Identity verification happens at the application layer, not the network layer. No VPN bottlenecks, no privileged network position, no lateral movement." },
      { title: "Cloudflare Access", body: "Cloudflare runs mTLS between all its data centers. No internal service trusts another without mutual authentication. A compromised server cannot impersonate another service." }
    ],
    antiPatterns: [
      "Buying a 'zero trust product' and calling it done. Zero trust is an architecture, not a vendor.",
      "Keeping the VPN but adding zero trust on top. The VPN is the perimeter model. Replace it.",
      "Trusting the internal network. Microsegment every service, every pod, every container.",
      "Using IP allowlists. IPs are not identities. Devices and users are."
    ],
    checklist: [
      "mTLS between all internal services",
      "Microsegmentation policies enforced at the network layer",
      "Identity-based access (not network-based)",
      "Continuous device health verification",
      "All data encrypted in transit and at rest",
      "Access decisions logged and auditable"
    ],
    move: "Pick one internal service. Add mTLS to it. Measure the effort. That effort is your zero trust tax — and it is worth every dollar."
  },

  "building-home-lab": {
    intro: `<p>A home lab is not a hobby. It is a training environment where you break things safely, test hypotheses, and build muscle memory for production systems. The engineer who runs a home lab makes different decisions in production — better decisions — because they have already made the mistakes in a controlled environment.</p>
<p>The home lab is where theory meets reality. The Kubernetes tutorial works on a single node. The home lab runs three nodes with different kernel versions, a flaky network, and a disk that is 90% full. That is where the real learning happens.</p>`,
    deepDive: `<h3>Hardware: Start Minimal</h3>
<p>The best home lab is the one you already have. An old laptop, a Raspberry Pi, or a mini PC is enough to start. Do not buy enterprise hardware until you have outgrown the small form factor.</p>

<pre><code># Proxmox VE: the home lab hypervisor
# Install on a dedicated machine (16GB RAM minimum)

# After install, access web UI at https://proxmox-ip:8006

# Create a VM for your first server
qm create 100 \
  --name ubuntu-server \
  --memory 4096 \
  --cores 2 \
  --net0 virtio,bridge=vmbr0 \
  --scsihw virtio-scsi-single \
  --scsi0 local-lvm:32 \
  --ide2 local:iso/ubuntu-24.04-server.iso,media=cdrom \
  --boot order=scsi0;ide2

qm start 100</code></pre>

<h3>The Three-Tier Lab</h3>
<p>A useful home lab has three tiers: infrastructure (DNS, DHCP, monitoring), services (applications you use), and experiments (things you are testing). The infrastructure tier runs 24/7.</p>

<pre><code># Infrastructure tier: Pi-hole + Unbound
# DNS filtering + recursive resolution = no ads + privacy

docker run -d \
  --name pihole \
  -p 53:53/tcp -p 53:53/udp \
  -p 80:80 \
  -e TZ=UTC \
  -v ./pihole:/etc/pihole \
  -v ./dnsmasq:/etc/dnsmasq.d \
  --restart=unless-stopped \
  pihole/pihole:latest

# Unbound: recursive DNS resolver
# Pi-hole forwards to Unbound instead of upstream DNS
# No third-party sees your DNS queries

docker run -d \
  --name unbound \
  -p 5353:53/udp \
  -v ./unbound:/etc/unbound \
  --restart=unless-stopped \
  mvance/unbound:latest</code></pre>

<h3>Automation from Day One</h3>
<p>If you install something manually twice, automate it. Ansible is the right tool for home lab automation — agentless, idempotent, and readable.</p>

<pre><code># Ansible playbook: provision a web server
---
- hosts: webservers
  become: yes
  tasks:
    - name: Install packages
      apt:
        name: [nginx, certbot, python3-certbot-nginx]
        state: present
        update_cache: yes

    - name: Deploy nginx config
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/sites-available/default
      notify: Reload nginx

    - name: Enable firewall
      ufw:
        rule: allow
        port: "{{ item }}"
      loop: ['22', '80', '443']

  handlers:
    - name: Reload nginx
      service:
        name: nginx
        state: reloaded</code></pre>`,
    principles: [
      "Start with what you have. A Raspberry Pi is enough to learn Kubernetes, Docker, networking, and security.",
      "Automate everything you do twice. The home lab is where you build automation muscle memory.",
      "Run your services in production-like configurations. The lab should mirror reality.",
      "Break things on purpose. The lab exists for failure. Failure in the lab prevents failure in production.",
      "Document your lab. The network diagram, the VM list, the IP allocations."
    ],
    examples: [
      { title: "Self-Hosted CI/CD", body: "Run Gitea (lightweight Git) + Woodpecker CI on a single mini PC. Push code, run tests, deploy — all on hardware you control. The pipeline runs in 30 seconds because there is no cloud latency. The cost is $0 after the hardware purchase." },
      { title: "Network Monitoring Stack", body: "Prometheus + Grafana on a Raspberry Pi. Monitor every device on your network: bandwidth, latency, uptime. Set up alerts for when the ISP drops connection or a server goes down." }
    ],
    antiPatterns: [
      "Buying enterprise hardware before you need it. A $200 mini PC runs everything a $2000 server runs.",
      "Running everything on one VM. Isolate experiments so they cannot break your infrastructure.",
      "Skipping networking. The home lab is a networking lab. Understand VLANs, firewall rules, and DNS.",
      "Not backing up. The lab is disposable, but your configuration is not."
    ],
    checklist: [
      "DNS resolution works (Pi-hole or similar)",
      "At least two VMs/containers on different subnets",
      "Automated provisioning (Ansible or similar)",
      "Monitoring for at least one service (Prometheus/Grafana)",
      "Firewall rules tested and documented"
    ],
    move: "Install Proxmox on an old machine. Create two VMs on different subnets. Connect them. Ping. That is your home lab."
  },

  "linux-filesystem-forensics": {
    intro: `<p>Every file creation, modification, and deletion leaves traces. The filesystem is a timeline. Forensics is reading that timeline backward. When an incident happens, the filesystem is the witness — it remembers everything, even what you tried to delete.</p>
<p>The Linux filesystem stores more metadata than most engineers realize. Timestamps (mtime, atime, ctime), extended attributes, file system journals, deleted inodes — every one of these tells part of the story.</p>`,
    deepDive: `<h3>Timestamps: The Four Clocks</h3>
<p>Every inode has three timestamps: mtime (last modification), atime (last access), ctime (last metadata change). The filesystem journal is a fourth clock. Together, they create a timeline of every file operation.</p>

<pre><code># Examine timestamps on a suspicious file
stat /tmp/suspicious_binary

# Output:
# Access: 2025-03-15 14:22:01.000000000 -0400  (mtime)
# Modify: 2025-03-15 14:22:01.000000000 -0400
# Change: 2025-03-15 14:22:01.000000000 -0400  (ctime)
#  Birth: 2025-03-15 14:22:01.000000000 -0400

# Find all files modified in the last 24 hours
find / -mtime -1 -type f 2>/dev/null

# Sleuthkit: detailed inode analysis
fls -r -m "/" /dev/sda1
# Lists all files with their inode numbers
# Deleted files still have inodes until overwritten</code></pre>

<h3>Deleted File Recovery</h3>
<p>When a file is deleted (rm), the directory entry is removed but the inode and data blocks remain on disk until overwritten. Recovery is possible until the blocks are reused.</p>

<pre><code># Recover deleted files from ext4
# 1. Unmount the filesystem (or remount read-only)
mount -o remount,ro /dev/sda1

# 2. Use photorec for file carving
photorec /dev/sda1
# Recovers files by scanning for known headers/footers
# JPEG starts with FF D8 FF, ends with FF D9
# PDF starts with %PDF, ends with %%EOF

# 3. Use extundelete for inode-based recovery
extundelete /dev/sda1 --restore-file path/to/deleted/file
extundelete /dev/sda1 --restore-all

# 4. Inspect unallocated space
strings /dev/sda1 | grep -i "password\|secret\|key"
# Deleted files leave strings in unallocated blocks</code></pre>

<h3>Timeline Reconstruction</h3>
<p>The filesystem journal records every metadata operation. Replaying the journal reconstructs the sequence of events.</p>

<pre><code># Build timeline with mactime (Sleuthkit)
fls -r -m "/" /dev/sda1 > bodyfile.txt
mactime -b bodyfile.txt -d > timeline.csv

# Look for anomalies
# - Files created in /tmp during off-hours
# - Setuid binaries modified after installation
# - Hidden files in home directories
# - Cron jobs modified recently

# Correlate with logs
# /var/log/auth.log: who logged in
# /var/log/syslog: what happened
# Timeline + logs = complete picture</code></pre>`,
    principles: [
      "Never investigate on the original system. Image the disk first, then analyze the image.",
      "Timestamps can be manipulated (timestomp). Cross-reference multiple timestamp sources.",
      "Deleted does not mean gone. Data persists until the blocks are overwritten.",
      "The filesystem journal is the ground truth. It records metadata operations the filesystem cannot undo.",
      "Chain of custody matters. If this goes to court, every step must be documented and reproducible."
    ],
    examples: [
      { title: "Incident Timeline", body: "A server was compromised. The attacker created /tmp/.backdoor (mtime: 02:14), modified /etc/passwd (ctime: 02:16), downloaded a binary from a C2 server (atime: 02:17), executed it (ctime: 02:18), and deleted the binary (ctime: 02:19). The deleted binary was recovered from unallocated space." },
      { title: "Insider Threat Detection", body: "An employee copied sensitive files to a USB drive. The filesystem showed: multiple files accessed in rapid succession, a tar archive created, and the archive deleted. The archive was recovered from unallocated space. The employee's SSH login matched the timestamps." }
    ],
    antiPatterns: [
      "Running forensic tools on the live system. Every tool execution modifies the filesystem.",
      "Relying on a single timestamp. mtimes can be set with touch.",
      "Ignoring extended attributes. xattr can contain security labels, capabilities, and ACLs.",
      "Forgetting to check /dev/shm and /run. Temporary filesystems are RAM-backed and volatile."
    ],
    checklist: [
      "Disk image created (dd or dcfldd) with hash verification",
      "Filesystem unmounted or remounted read-only before imaging",
      "Timeline reconstructed from journal + timestamps",
      "Deleted files recovered from unallocated space",
      "Extended attributes checked for each suspicious file",
      "Chain of custody documented for every evidence item"
    ],
    move: "Create a test filesystem. Delete some files. Recover them with photorec. That is the foundation of filesystem forensics."
  },

  "container-security-hardening": {
    intro: `<p>Containers share a kernel. They share namespaces. They share cgroups. The isolation boundary is software, not hardware. Treat every container as potentially compromised and build defenses accordingly.</p>
<p>A container escape is not theoretical — it happens regularly. CVE-2022-0185, CVE-2022-0492, CVE-2021-3493 — each one exploited the gap between what the container thinks it has and what the kernel actually provides.</p>`,
    deepDive: `<h3>Least Privilege Containers</h3>
<p>The default container runs as root with full capabilities. Drop all capabilities, then add back only what the application needs.</p>

<pre><code># Kubernetes Pod Security Policy
apiVersion: v1
kind: Pod
metadata:
  name: hardened-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: myapp:latest
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir: {}</code></pre>

<h3>Seccomp Profiles</h3>
<p>Seccomp filters which system calls a container can make. The default Docker profile blocks about 44 of ~300 syscalls. A custom profile reduces this to the exact syscalls the application needs.</p>

<pre><code># Custom seccomp profile for a web server
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "syscalls": [
    {
      "names": [
        "accept", "bind", "brk", "clone", "close",
        "connect", "epoll_create1", "epoll_ctl", "epoll_wait",
        "execve", "exit", "exit_group", "fstat", "futex",
        "ioctl", "listen", "lseek", "mmap", "mprotect",
        "munmap", "nanosleep", "openat", "pipe2", "read",
        "recvfrom", "rt_sigaction", "rt_sigprocmask", "sendto",
        "setsockopt", "socket", "stat", "statfs", "write"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}</code></pre>

<h3>Image Scanning</h3>
<p>Every container image is a supply chain. Scan images before deployment, scan running containers continuously.</p>

<pre><code># Scan image for vulnerabilities with Trivy
trivy image --severity HIGH,CRITICAL myapp:latest

# CI/CD integration: fail the build on critical vulnerabilities
trivy image --exit-code 1 --severity CRITICAL myapp:latest

# Scan Kubernetes manifests for misconfigurations
trivy config --severity HIGH,CRITICAL ./k8s/</code></pre>`,
    principles: [
      "Containers share a kernel. The kernel is the attack surface. Minimize kernel exposure.",
      "Root inside a container is root on the host if capabilities are not restricted.",
      "Seccomp profiles are the last line of defense between container and kernel.",
      "Scan images before deployment. A vulnerable image is a guaranteed exploit.",
      "Read-only filesystems eliminate write-based attacks."
    ],
    examples: [
      { title: "CVE-2022-0185", body: "Heap overflow in filesystem context handling. A container with CAP_SYS_ADMIN could escape to the host. The fix: drop CAP_SYS_ADMIN from all containers." },
      { title: "Supply Chain Attack", body: "A popular base image contained a backdoor in its entrypoint script. Every image built from it was compromised. The fix: pin base images by digest, not tag." }
    ],
    antiPatterns: [
      "Running containers as root. Always run as a non-root user.",
      "Using the :latest tag. Pin images by digest for reproducibility.",
      "Ignoring Dockerfile best practices. Multi-stage builds reduce attack surface.",
      "Trusting the registry. Use private registries and image signing."
    ],
    checklist: [
      "Containers run as non-root user",
      "All capabilities dropped except those required",
      "Read-only root filesystem",
      "Seccomp profile applied",
      "Images scanned for vulnerabilities in CI/CD",
      "No secrets in images"
    ],
    move: "Run docker inspect on your running containers. Check the User field. If it says root, fix it now."
  },

  "privacy-focused-linux-desktop": {
    intro: `<p>Every operating system phones home. Every browser leaks data. Every extension reports back. Building a private workstation means understanding and blocking every leak — from DNS queries to hardware identifiers.</p>
<p>Privacy is not a setting. It is a system architecture. The default configuration of every mainstream OS and browser is designed to maximize data collection. Privacy requires active resistance.</p>`,
    deepDive: `<h3>Browser Fingerprinting Resistance</h3>
<p>Browser fingerprinting identifies you without cookies. Canvas rendering, WebGL, fonts, screen resolution, timezone — each one is a signal. Together, they create a unique fingerprint.</p>

<pre><code># Firefox hardening (user.js in profile directory)

// Disable telemetry
user_pref("toolkit.telemetry.enabled", false);
user_pref("toolkit.telemetry.unified", false);
user_pref("datareporting.healthreport.uploadEnabled", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);

// Resist fingerprinting
user_pref("privacy.resistFingerprinting", true);

// Disable WebRTC IP leak
user_pref("media.peerconnection.enabled", false);

// Container tabs: isolate browsing contexts
user_pref("privacy.userContext.enabled", true);

// DNS over HTTPS
user_pref("network.trr.mode", 3);
user_pref("network.trr.uri", "https://dns.quad9.net/dns-query");

// Disable prefetching
user_pref("network.prefetch-next", false);
user_pref("network.dns.disablePrefetch", true);</code></pre>

<h3>Network-Level Privacy</h3>
<p>The network is the surveillance layer. Your ISP sees every connection. DNS queries reveal every domain you visit. Mitigating network surveillance requires multiple layers.</p>

<pre><code># WireGuard VPN: encrypt all traffic
# /etc/wireguard/wg0.conf

[Interface]
PrivateKey = &lt;client-private-key&gt;
Address = 10.0.0.2/32
DNS = 1.1.1.1, 9.9.9.9

[Peer]
PublicKey = &lt;server-public-key&gt;
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25

# Kill switch: block all traffic if VPN drops
iptables -A OUTPUT -o wg0 -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -d 127.0.0.0/8 -j ACCEPT
iptables -A OUTPUT -j DROP</code></pre>

<h3>Metadata Minimization</h3>
<p>Even encrypted communications leak metadata. Email headers reveal sender, recipient, subject, and timing. File metadata reveals author, software, GPS coordinates. Strip everything.</p>

<pre><code># Strip metadata from files before sharing
# ExifTool: the Swiss Army knife of metadata

exiftool -all= photo.jpg        # Remove all metadata from JPEG
exiftool -all= -r ./photos/     # Remove metadata recursively
exiftool -all= document.pdf     # PDF metadata
exiftool -all= document.docx    # Office documents

# Verify metadata is removed
exiftool photo.jpg</code></pre>`,
    principles: [
      "Privacy is a system property, not a feature. Design for privacy at every layer.",
      "Metadata is surveillance. Even encrypted content leaks timing, size, and relationships.",
      "Threat model your privacy needs. Journalists need different protections than casual users.",
      "Defense in depth: VPN + DNS encryption + browser hardening + metadata stripping.",
      "Convenience is the enemy of privacy. Every privacy measure adds friction."
    ],
    examples: [
      { title: "Tails OS", body: "A live operating system that routes all traffic through Tor. No trace on the host machine. No persistent storage by default. The entire OS is a privacy tool." },
      { title: "Mullvad VPN", body: "No email required to create an account. Pay with cash or cryptocurrency. No logging policy verified by independent audit. The VPN provider literally cannot identify you." }
    ],
    antiPatterns: [
      "Using Chrome without extensions. Chrome sends telemetry by default.",
      "Trusting VPN providers that require email. They can identify you.",
      "Ignoring file metadata. A photo from your phone contains GPS coordinates.",
      "Using the same browser profile for everything. Container tabs isolate browsing contexts."
    ],
    checklist: [
      "Browser fingerprinting resistance enabled (Firefox: privacy.resistFingerprinting)",
      "DNS over HTTPS configured",
      "VPN with kill switch active",
      "Telemetry and data collection disabled",
      "File metadata stripped before sharing",
      "Email encryption for sensitive communications"
    ],
    move: "Visit browserleaks.com. Check your fingerprint. If you are uniquely identifiable, harden your browser until you are not."
  },

  "defi-liquidation-mechanics": {
    intro: `<p>Liquidation mechanisms are the immune system of DeFi. They keep protocols solvent by incentivizing external actors to close underwater positions. Without liquidations, a single bad debt cascades into protocol insolvency.</p>
<p>Liquidation is not punishment — it is a market mechanism. When a borrower's collateral value falls below the required ratio, the position becomes profitable to close. Liquidators repay the debt, receive the collateral at a discount, and the protocol remains solvent.</p>`,
    deepDive: `<h3>The Liquidation Threshold</h3>
<p>Every lending protocol defines a collateral ratio (e.g., 150%) and a liquidation threshold (e.g., 110%). When collateral value / debt value falls below the threshold, the position is liquidatable.</p>

<pre><code>// Liquidation incentive calculation
// Collateral: 10 ETH ($20,000 at $2,000/ETH)
// Debt: 12,000 USDC
// Collateral ratio: 167% (safe)
// Liquidation threshold: 110%
// Liquidation bonus: 5%

// Price drops to $1,200/ETH
// Collateral value: 10 * $1,200 = $12,000
// Collateral ratio: $12,000 / $12,000 = 100% (LIQUIDATABLE)

// Liquidator repays 12,000 USDC
// Receives 10 ETH + 5% bonus = 10.5 ETH
// At $1,200/ETH, that is $12,600 for a $12,000 repayment
// Profit: $600 (minus gas)</code></pre>

<h3>Liquidation Mechanisms</h3>
<p>Protocols use different liquidation mechanisms: auction-based (Aave v2), fixed-price (Compound), Dutch auction (Aave v3), or keeper-based (MakerDAO).</p>

<pre><code>// Aave v3: efficient liquidation
function liquidationCall(
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover,
    address receiveAToken
) external;

// MakerDAO: surplus auction
// If collateral value > debt + penalty, surplus is auctioned
// MKR tokens are auctioned to cover bad debt</code></pre>

<h3>Flash Loan Liquidations</h3>
<p>Flash loans make liquidations capital-efficient. The liquidator borrows the repayment amount, executes the liquidation, sells the collateral, repays the flash loan, and keeps the profit — all in one atomic transaction.</p>

<pre><code>// Flash loan liquidation pattern
async function liquidateWithFlashLoan(
    aavePool: IPool,
    collateral: address,
    debt: address,
    user: address,
    amount: uint256
) {
    aavePool.flashLoan(
        address(this),
        debt,
        amount,
        ""
    );
    // Inside the callback:
    // 1. Repay the user's debt on Aave
    // 2. Receive the collateral at a discount
    // 3. Swap collateral back to debt token
    // 4. Repay the flash loan
    // 5. Keep the profit
}</code></pre>`,
    principles: [
      "Liquidations are market mechanisms, not punishments. They keep the protocol solvent.",
      "The liquidation bonus must be large enough to incentivize liquidators, small enough to protect borrowers.",
      "Oracle accuracy is critical. A stale oracle can trigger false liquidations or miss real ones.",
      "Flash loan liquidations are capital-efficient but create MEV competition.",
      "Cascading liquidations are the real risk. One liquidation triggers price drops that trigger more."
    ],
    examples: [
      { title: "Black Thursday (MakerDAO, 2020)", body: "ETH price crashed 50% in one day. Gas prices spiked to 500 gwei. Liquidation bots could not execute because gas costs exceeded liquidation profits. MakerDAO accumulated $4.5M in bad debt. The lesson: liquidation mechanisms must work under stress conditions." },
      { title: "Aave v3 Efficiency Mode", body: "Aave v3 introduced efficiency mode (eMode) for correlated assets. Stablecoins are grouped together with higher LTV and lower liquidation thresholds. This reduces liquidation risk for stablecoin pairs by 40%." }
    ],
    antiPatterns: [
      "Using a single oracle for liquidation triggers. Oracle manipulation can cause false liquidations.",
      "Ignoring gas costs in liquidation calculations. A profitable liquidation at 30 gwei is unprofitable at 300 gwei.",
      "Not accounting for cascading liquidations. Model the impact of your liquidation on the market.",
      "Running liquidation bots on a single node. Geographic distribution reduces latency."
    ],
    checklist: [
      "Liquidation threshold is set conservatively",
      "Oracle uses multiple sources with deviation checks",
      "Liquidation bonus is competitive with other protocols",
      "Flash loan integration tested under high gas conditions",
      "Cascading liquidation scenarios modeled"
    ],
    move: "Monitor Aave and Compound liquidation events on Etherscan. Watch the liquidators compete. That is DeFi's immune system in action."
  },

  "network-traffic-analysis": {
    intro: `<p>Network traffic is the heartbeat of your infrastructure. Every connection, every request, every response is visible. The challenge is knowing what to look for — and more importantly, knowing what looks wrong.</p>
<p>Network traffic analysis is not packet capture. It is pattern recognition. The analyst sees the same flows every day. When something changes — a new destination, an unusual protocol, a spike in volume — that change is the signal.</p>`,
    deepDive: `<h3>Capture and Filter</h3>
<p>Raw packet capture produces gigabytes of data per minute. The skill is filtering: capturing only what matters and ignoring everything else.</p>

<pre><code># Capture traffic on specific interface
tcpdump -i eth0 -w capture.pcap

# Filter: only HTTP traffic to a specific host
tcpdump -i eth0 host 10.0.1.50 and port 80 -w http-filtered.pcap

# Filter: only DNS queries
tcpdump -i eth0 port 53 -w dns-queries.pcap

# Filter: only SYN packets (new connections)
tcpdump -i eth0 'tcp[tcpflags] & tcp-syn != 0' -w new-connections.pcap

# Capture with full packet content
tcpdump -i eth0 -s 0 -X host 10.0.1.50</code></pre>

<h3>Wireshark Display Filters</h3>
<p>Wireshark display filters let you drill into captured data without re-capturing.</p>

<pre><code># Wireshark display filter cheat sheet

# HTTP analysis
http.request.method == "POST"
http.response.code >= 400
http.host == "api.example.com"

# DNS analysis
dns.qry.name contains "suspicious"
dns.resp.rcode != 0
dns.qry.type == 28  # AAAA records only

# TLS analysis
tls.handshake.type == 1  # Client Hello
tls.handshake.extensions_server_name == "evil.com"

# Anomaly detection
tcp.analysis.retransmission
tcp.flags.syn == 1 && tcp.flags.ack == 0  # SYN scan

# Data exfiltration detection
tcp.len > 1000
dns.qry.name.len > 50  # Long DNS names (tunneling)</code></pre>

<h3>Traffic Pattern Analysis</h3>
<p>The most valuable analysis is flow-level: who is talking to whom, how much data, how often, and when.</p>

<pre><code># zeek (formerly Bro) flow analysis
# Analyze connection logs
cat conn.log | zeek-cut id.orig_h id.resp_p service duration | \
  sort | uniq -c | sort -rn | head -20

# Find unusual DNS queries
cat dns.log | zeek-cut query | sort | uniq -c | sort -rn | head -50

# Find long-lived connections (possible tunnels)
cat conn.log | zeek-cut duration | awk '$1 > 3600' | wc -l</code></pre>`,
    principles: [
      "Capture first, filter later. You cannot analyze what you did not capture.",
      "Baseline your network. You cannot detect anomalies without knowing what is normal.",
      "DNS is the most revealing protocol. Monitor it closely — it reveals intent.",
      "Encrypted traffic is not invisible. Metadata reveals patterns.",
      "Alert on behavior, not signatures. Signatures expire. Behavior persists."
    ],
    examples: [
      { title: "DNS Tunneling Detection", body: "A host was sending DNS queries with unusually long names (60+ characters) to a single domain. The queries were encoding data in subdomain labels. The host was exfiltrating data through DNS." },
      { title: "Lateral Movement Detection", body: "A workstation that normally connects to 5 internal hosts suddenly connected to 50. The connections were to SMB ports during off-hours. The host was compromised and scanning for lateral movement targets." }
    ],
    antiPatterns: [
      "Capturing everything without a filter. Raw captures fill disks in minutes.",
      "Relying on signatures alone. Zero-day attacks have no signatures.",
      "Ignoring encrypted traffic metadata. Timing and size patterns are visible.",
      "Not monitoring DNS. DNS is the most attacked protocol and the most revealing."
    ],
    checklist: [
      "Baseline established for normal traffic patterns",
      "DNS monitoring in place (all queries logged)",
      "Alerts for anomalous connection counts",
      "TLS certificate inspection",
      "Retention policy for capture files (7-30 days)"
    ],
    move: "Run tcpdump on your network for 10 minutes. Filter for DNS. Look at the queries. You will be surprised what your devices are doing."
  },

  "api-security-hardening": {
    intro: `<p>The API is the front door. Authentication, authorization, rate limiting, input validation — every layer matters. A single missed check opens the entire system. APIs are the #1 attack vector for web applications.</p>
<p>API security is not about preventing attacks. It is about making attacks uneconomical. Every defense increases the attacker's cost.</p>`,
    deepDive: `<h3>Authentication and Authorization</h3>
<p>Authentication proves identity. Authorization proves permission. They are different problems. A common mistake is implementing authentication and treating it as authorization.</p>

<pre><code>// JWT with scope-based authorization
interface JWTPayload {
  sub: string;
  scope: string[];
  exp: number;
  iat: number;
}

function authorize(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    const payload = verifyToken(token) as JWTPayload;
    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    if (!payload.scope.includes(requiredScope)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredScope,
        granted: payload.scope
      });
    }

    req.user = payload;
    next();
  };
}

app.get('/api/users', authorize('users:read'), listUsers);
app.post('/api/users', authorize('users:write'), createUser);
app.delete('/api/users/:id', authorize('users:delete'), deleteUser);</code></pre>

<h3>Rate Limiting</h3>
<p>Rate limiting is not a suggestion — it is a defense. Without it, every endpoint is vulnerable to brute force and denial of service.</p>

<pre><code>// Sliding window rate limiter (Redis-backed)
class SlidingWindowRateLimiter {
  private redis: Redis;

  async isAllowed(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    const pipe = this.redis.pipeline();
    pipe.zremrangebyscore(key, 0, windowStart);
    pipe.zadd(key, now, String(now));
    pipe.zcard(key);
    pipe.pexpire(key, windowMs);

    const results = await pipe.exec();
    const count = results[2][1] as number;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count)
    };
  }
}</code></pre>

<h3>Input Validation</h3>
<p>Every input is an attack vector. SQL injection, XSS, command injection — all start with unvalidated input. Validate on the server.</p>

<pre><code>// Schema-based input validation with Zod
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s'-]+$/),
  role: z.enum(['user', 'admin']).default('user'),
  age: z.number().int().min(13).max(150).optional()
});

app.post('/api/users', async (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message
      }))
    });
  }
  const user = await createUser(result.data);
  res.json(user);
});</code></pre>`,
    principles: [
      "Authentication proves identity. Authorization proves permission. Never confuse them.",
      "Rate limit everything. Every endpoint is a brute force target.",
      "Validate input on the server. The client is an unreliable narrator.",
      "Use parameterized queries. String concatenation is SQL injection.",
      "Log every authentication and authorization decision."
    ],
    examples: [
      { title: "REST API Authorization Bypass", body: "An API checked authorization on GET /users/:id but not on PATCH /users/:id. An attacker could modify any user by sending a PATCH with a different user ID." },
      { title: "Mass Assignment", body: "A registration endpoint accepted all fields from the request body. An attacker added 'role: admin' to the payload. The fix: whitelist the fields the API accepts." }
    ],
    antiPatterns: [
      "Checking authorization in the frontend only. The API is the security boundary.",
      "Using session IDs in URLs. They leak in logs, referrer headers, and browser history.",
      "Returning detailed error messages in production.",
      "Rate limiting by IP only. Use IP + user ID + endpoint for accurate limiting."
    ],
    checklist: [
      "All endpoints have authentication middleware",
      "Authorization checked on every endpoint",
      "Rate limiting on authentication endpoints",
      "Input validation with schema (Zod, Joi, or similar)",
      "SQL queries use parameterized statements",
      "Error messages do not leak internal details"
    ],
    move: "Run OWASP ZAP against your API. The automated scan finds the low-hanging fruit. The manual scan finds the real issues."
  },

  "cryptography-fundamentals": {
    intro: `<p>Cryptography is not magic. It is math with specific properties. Understanding the math is the difference between using crypto correctly and using it as a security placebo.</p>
<p>Every cryptographic primitive has a purpose. Symmetric encryption for confidentiality. Hashing for integrity. Asymmetric encryption for key exchange and signatures. Using the wrong primitive for the job is like using a hammer to turn a screw.</p>`,
    deepDive: `<h3>Symmetric Encryption: AES-GCM</h3>
<p>AES is the standard for symmetric encryption. GCM provides authenticated encryption — it encrypts and authenticates in one operation.</p>

<pre><code>// AES-256-GCM: authenticated encryption
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function encrypt(plaintext: Buffer, key: Buffer): {
  ciphertext: Buffer; iv: Buffer; tag: Buffer;
} {
  const iv = randomBytes(12);  // 12 bytes recommended for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Key derivation: never use raw keys
// Use PBKDF2, scrypt, or Argon2 to derive keys from passwords
// crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512')</code></pre>

<h3>Hashing: SHA-256 and Password Hashing</h3>
<p>SHA-256 is for data integrity, not password storage. Passwords must be hashed with a slow, memory-hard algorithm.</p>

<pre><code>// Password hashing with scrypt
import { scryptSync, randomBytes } from 'crypto';

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 65536, 64, 1);
  return salt.toString('hex') + ':' + key.toString('hex');
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const key = Buffer.from(keyHex, 'hex');
  const derivedKey = scryptSync(password, salt, 65536, 64, 1);
  return key.equals(derivedKey);
}</code></pre>

<h3>Asymmetric Encryption: Ed25519</h3>
<p>Asymmetric encryption is for key exchange and signatures, not for encrypting data. RSA is slower than symmetric encryption by 1000x.</p>

<pre><code>// Ed25519 digital signatures
import { generateKeyPairSync, sign, verify } from 'crypto';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

const message = Buffer.from('Important data');
const signature = sign(null, message, privateKey);

const isValid = verify(null, message, publicKey, signature);
// isValid === true</code></pre>`,
    principles: [
      "Never roll your own crypto. Use established libraries (OpenSSL, libsodium, WebCrypto).",
      "AES-256-GCM for encryption. SHA-256 for hashing. Ed25519 for signatures.",
      "Key derivation is mandatory. Never use raw keys from passwords or entropy sources.",
      "IVs/nonces must be unique. Reusing an IV with the same key breaks encryption.",
      "Passwords are hashed with slow algorithms (bcrypt/scrypt/Argon2)."
    ],
    examples: [
      { title: "Heartbleed (CVE-2014-0160)", body: "A buffer over-read in OpenSSL's heartbeat extension leaked private keys, session tokens, and passwords. The vulnerability existed for two years. The fix was a bounds check." },
      { title: "WPA2 KRACK Attack", body: "The KRACK attack exploited the WPA2 four-way handshake by reinstalling an already-in-use key. This reset the nonce counter, allowing packet decryption." }
    ],
    antiPatterns: [
      "Using MD5 or SHA-1 for password hashing. They are too fast.",
      "Encrypting data with RSA directly. Use RSA for key exchange, AES for data.",
      "Hardcoding keys in source code.",
      "Ignoring certificate validation. 'verify: false' disables security entirely."
    ],
    checklist: [
      "Data encrypted at rest (AES-256-GCM)",
      "Data encrypted in transit (TLS 1.3)",
      "Passwords hashed with bcrypt/scrypt/Argon2",
      "Keys derived from passwords (never raw)",
      "No hardcoded secrets in source code",
      "Certificate validation enabled on all connections"
    ],
    move: "Write a function that encrypts a file with AES-256-GCM and decrypts it. If you cannot do this correctly, you do not understand symmetric encryption."
  },

  "git-advanced-techniques": {
    intro: `<p>Git is not a version control system. It is a content-addressable filesystem with a version control interface. Understanding the internals changes how you use it — and how you recover from disasters.</p>
<p>Every Git object is identified by its SHA-1 hash. A commit, a tree, a blob — each one is a file in the .git/objects directory.</p>`,
    deepDive: `<h3>Interactive Rebase: History Surgery</h3>
<p>Interactive rebase lets you reorder, edit, squash, split, and delete commits. This is how you clean up messy development history before merging.</p>

<pre><code># Interactive rebase: last 3 commits
git rebase -i HEAD~3

# The editor shows:
pick abc1234 feat: add user authentication
pick def5678 fix: typo in auth handler
pick ghi9012 refactor: clean up auth module

# Squash the fix into the feat commit:
pick abc1234 feat: add user authentication
squash def5678 fix: typo in auth handler
squash ghi9012 refactor: clean up auth module

# Result: one clean commit with a combined message</code></pre>

<h3>Bisect: Find the Bug</h3>
<p>Git bisect uses binary search to find the commit that introduced a bug.</p>

<pre><code># Start bisect
git bisect start
git bisect bad          # Current commit is bad
git bisect good v1.0.0  # This tag was good

# Git checks out a middle commit
# Test your application, then:
git bisect good   # If the bug is not present
git bisect bad    # If the bug is present

# Automate with a script
git bisect start HEAD v1.0.0
git bisect run npm test</code></pre>

<h3>Stash and Worktree</h3>
<p>Stash saves uncommitted changes. Worktree lets you check out multiple branches simultaneously.</p>

<pre><code># Stash: save current work
git stash push -m "WIP: auth refactor"

# Restore stash
git stash pop          # Apply and remove

# Worktree: parallel checkouts
git worktree add ../hotfix-branch hotfix/1.0
git worktree add ../feature-branch feature/new-api

# Work on hotfix without switching branches
cd ../hotfix-branch

# Clean up
git worktree remove ../hotfix-branch</code></pre>`,
    principles: [
      "Git is a content-addressable filesystem. Nothing is truly deleted.",
      "Interactive rebase is for cleaning up history before merge.",
      "Bisect finds bugs by binary search. Write tests that bisect can automate.",
      "Worktree solves multi-branch development.",
      "Git hooks enforce policy. Pre-commit prevents bad commits."
    ],
    examples: [
      { title: "Bisect in Production", body: "A production bug appeared between v2.3.0 and v2.4.0. Running bisect found the exact commit in 7 steps (out of 120 commits). The commit was a database query change that worked in development but failed under production load." },
      { title: "Cherry-Pick Hotfix", body: "A critical fix was committed to main but needed in the release branch immediately. Cherry-picking created a clean, isolated fix without merging the entire main branch." }
    ],
    antiPatterns: [
      "Force-pushing shared branches. Rewriting history that others depend on breaks their work.",
      "Ignoring git hooks. They exist for a reason.",
      "Using git add . without checking what is staged.",
      "Committing secrets. Use .env files and .gitignore."
    ],
    checklist: [
      "Interactive rebase used before merge to clean up history",
      "Bisect runbook documented for critical components",
      "Git hooks configured (pre-commit, pre-push)",
      ".gitignore covers all sensitive files",
      "Branch naming convention followed"
    ],
    move: "Run git bisect on your last 50 commits with a failing test. Watch it find the culprit in 6 steps."
  },

  "wireless-security-auditing": {
    intro: `<p>Wireless networks broadcast through walls. Encryption is the only barrier. WPA3 is minimum. Anything less is an open invitation. The wireless network is the most exposed part of your infrastructure — it is literally in the air.</p>
<p>Wireless security auditing is not about breaking encryption. It is about verifying that your encryption is actually working and that your clients are not connecting to rogue networks.</p>`,
    deepDive: `<h3>WPA3 and SAE</h3>
<p>WPA3 replaces WPA2's PSK with SAE (Simultaneous Authentication of Equals). SAE is resistant to offline dictionary attacks.</p>

<pre><code># WPA3 configuration on hostapd
interface=wlan0
driver=nl80211
ssid=SecureNetwork
hw_mode=g
channel=6

# WPA3-SAE configuration
wpa=2
wpa_key_mgmt=SAE
wpa_passphrase=LongPasswordHere
rsn_pairwise=CCMP
sae_pwe=hash-to-element

# PMF (Protected Management Frames) - mandatory for WPA3
ieee80211w=2</code></pre>

<h3>WPA2 Attack Surface</h3>
<p>WPA2 is vulnerable to offline dictionary attacks if the attacker captures the four-way handshake.</p>

<pre><code># Capturing WPA2 handshake
airmon-ng start wlan0       # Monitor mode
airodump-ng wlan0mon         # Find target AP

# Capture handshake
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w handshake wlan0mon

# Deauth client to force handshake
aireplay-ng --deauth 5 -a AA:BB:CC:DD:EE:FF wlan0mon

# Crack with wordlist
aircrack-ng -w /usr/share/wordlists/rockyou.txt handshake-01.cap

# Defense: use a long, random passphrase (20+ characters)
# A 10-character password takes minutes to crack
# A 20-character password takes centuries</code></pre>

<h3>Rogue AP Detection</h3>
<p>A rogue access point is an unauthorized AP on your network. It can be an attacker's evil twin or an employee's personal hotspot.</p>

<pre><code># Detect rogue APs with Kismet
kismet -c wlan0mon

# Or scan for known APs
iwlist wlan0 scanning | grep -E "(ESSID|Address)"

# Compare against authorized AP list
# Any AP not on the list is a candidate rogue</code></pre>`,
    principles: [
      "WPA3 is minimum for new deployments.",
      "A 20-character random passphrase is crack-proof.",
      "Monitor for rogue APs continuously.",
      "Separate guest and production networks on different VLANs.",
      "Wireless audit quarterly."
    ],
    examples: [
      { title: "Evil Twin Attack", body: "Attacker sets up an AP with the same SSID as the corporate network. Employees connect automatically. All traffic flows through the attacker's AP. Defense: 802.1X certificate-based authentication." },
      { title: "KRACK Exploit", body: "The KRACK attack forced clients to reinstall an already-in-use key, resetting the nonce counter. This allowed attackers to decrypt packets. The fix: patch the client." }
    ],
    antiPatterns: [
      "Using WPA2 with a short password.",
      "Running an open Wi-Fi network.",
      "Ignoring management frame protection.",
      "Not monitoring for rogue APs."
    ],
    checklist: [
      "WPA3 or WPA2-Enterprise deployed",
      "Passphrase is 20+ characters, random",
      "802.1X certificate-based authentication for production",
      "Rogue AP monitoring active",
      "Guest network isolated on separate VLAN",
      "PMF (802.11w) enabled"
    ],
    move: "Run airodump-ng on your network. List every AP you see. Are they all yours? If not, you have a rogue AP problem."
  },

  "distributed-systems-patterns": {
    intro: `<p>Distributed systems fail in ways that centralized systems never do. Network partitions, clock skew, split brains — the CAP theorem is not theoretical. It is the daily reality of every system that spans more than one machine.</p>
<p>The fundamental challenge is partial failure. A component can be partially working — responding to some requests, timing out on others, and silently corrupting data on a third.</p>`,
    deepDive: `<h3>Consensus: Raft</h3>
<p>Raft powers etcd, CockroachDB, and Consul. A leader replicates a log to followers. If the leader fails, a new leader is elected.</p>

<pre><code>// Raft simplified
// 1. Leader election:
//    - Nodes start as followers
//    - If no heartbeat from leader, node becomes candidate
//    - Candidate requests votes from peers
//    - Majority wins -> new leader
//
// 2. Log replication:
//    - Client sends command to leader
//    - Leader appends to its log
//    - Leader sends AppendEntries to followers
//    - Majority acknowledge -> entry is committed
//
// 3. Safety:
//    - Only committed entries are applied
//    - Leader replacement does not lose committed entries</code></pre>

<h3>Eventual Consistency and CRDTs</h3>
<p>CRDTs are conflict-free replicated data types. They converge without coordination.</p>

<pre><code>// G-Counter: grow-only counter
// Node A: {A: 3, B: 0, C: 0}
// Node B: {A: 0, B: 2, C: 0}
// Node C: {A: 0, B: 0, C: 1}
// Merge: {A: 3, B: 2, C: 1}
// Total: 6 (sum of all counters)

// PN-Counter: positive-negative counter
// Tracks increments and decrements separately
// Merge: max(increments), max(decrements)</code></pre>

<h3>Circuit Breakers</h3>
<p>A circuit breaker prevents cascading failures. When a downstream service fails, calls fail fast instead of waiting for timeouts.</p>

<pre><code>class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 30000
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) {
        this.state = 'open';
      }
      throw error;
    }
  }
}</code></pre>`,
    principles: [
      "The CAP theorem is real. Choose two: consistency, availability, partition tolerance.",
      "Design for partial failure. Every component can fail independently at any time.",
      "Idempotency is essential. Retries must be safe.",
      "Eventual consistency is a feature. Design to tolerate the window.",
      "Circuit breakers prevent cascading failures."
    ],
    examples: [
      { title: "Amazon DynamoDB", body: "DynamoDB uses eventual consistency as its default read mode. This provides high availability and low latency at the cost of consistency." },
      { title: "etcd Leader Election", body: "etcd uses Raft. When the leader fails, a new leader is elected in ~150ms. During the election window, writes are unavailable." }
    ],
    antiPatterns: [
      "Assuming synchronous replication. It is slow and fragile.",
      "Ignoring clock skew. Use logical clocks or vector clocks.",
      "Building without circuit breakers.",
      "Assuming exactly-once delivery. At-least-once is the reality."
    ],
    checklist: [
      "Consensus algorithm understood (Raft, Paxos, or ZAB)",
      "Conflict resolution strategy defined",
      "Circuit breakers on all external service calls",
      "Idempotency keys on all write operations",
      "Timeout and retry policies with exponential backoff"
    ],
    move: "Deploy a 3-node etcd cluster. Kill the leader. Watch the new leader elected in <200ms."
  },

  "osint-reconnaissance": {
    intro: `<p>Every social media post, every DNS record, every WHOIS entry, every Wayback Machine snapshot — the internet is the world's largest intelligence database. OSINT is the discipline of mining it for actionable information.</p>
<p>OSINT is not hacking. It is research. Everything is publicly available. The skill is knowing where to look, how to connect the dots, and how to verify the results.</p>`,
    deepDive: `<h3>Domain and Infrastructure Recon</h3>
<p>Every domain tells a story: who registered it, when, what servers it points to, what other domains share the same infrastructure.</p>

<pre><code># WHOIS: domain registration
whois example.com

# DNS enumeration
dig example.com ANY
dig example.com MX
dig example.com TXT

# Subdomain enumeration
subfinder -d example.com -o subdomains.txt
amass enum -passive -d example.com

# Certificate Transparency logs
curl -s "https://crt.sh/?q=%.example.com&output=json" | \
  jq -r '.[].name_value' | sort -u</code></pre>

<h3>Social Media Intelligence</h3>
<p>Social media profiles reveal relationships, interests, locations, and timelines.</p>

<pre><code># Sherlock: find usernames across platforms
sherlock username

# Email OSINT
# Hunter.io: find email patterns for a domain
# Have I Been Pwned: check if email was in a breach
# Emailrep.io: reputation check

# Phone number OSINT
# NumVerify: validate and identify carrier
# TrueCaller: caller identification</code></pre>

<h3>Geolocation Intelligence</h3>
<p>Every photo contains EXIF data, including GPS coordinates. Every social media post can be geolocated.</p>

<pre><code># Photo geolocation
exiftool -gps:all photo.jpg

# Timezone from photo:
# Shadow analysis: direction and length indicate time
# Clock in background: confirms timezone
# Sun position: azimuth and elevation

# Vehicle identification:
# License plate patterns (country, state)
# Steering wheel side (left-hand vs right-hand traffic)</code></pre>`,
    principles: [
      "OSINT is research, not hacking. Everything is publicly available.",
      "Verify every piece of information. Corroborate across multiple sources.",
      "Document everything. The intelligence is useless if you cannot reproduce the research.",
      "Respect privacy. OSINT is powerful. Use it responsibly.",
      "The internet never forgets. Your own digital footprint is a target."
    ],
    examples: [
      { title: "Corporate Espionage Investigation", body: "An employee was suspected of stealing IP. OSINT revealed: the employee had a GitHub account with private repositories containing company code. The profile was linked to a personal email not in the company directory." },
      { title: "Phishing Campaign Attribution", body: "A phishing email targeted the finance team. OSINT on the sending domain: registered 2 days ago, privacy-protected WHOIS, hosted on a bulletproof VPS. Cross-referencing revealed 47 identical phishing sites." }
    ],
    antiPatterns: [
      "Using a single source for intelligence.",
      "Ignoring operational security during OSINT.",
      "Confusing correlation with causation.",
      "Storing intelligence without encryption."
    ],
    checklist: [
      "Target defined (person, organization, or infrastructure)",
      "Multiple sources cross-referenced",
      "Digital footprint mapped",
      "Timeline constructed from multiple data points",
      "Findings documented with sources and confidence levels",
      "Operational security maintained"
    ],
    move: "Run sherlock on your own username. Find every account linked to your name. That is your digital footprint."
  },

  "dns-deep-dive": {
    intro: `<p>Every internet connection starts with DNS. The system that translates names to numbers is also the system that logs every request, every destination, every intent. DNS is the phone book of the internet — and like every phone book, it records who called whom.</p>
<p>DNS was designed in 1983 with one assumption: trust. That assumption is now a vulnerability. Every DNS query is sent in plaintext, logged by the resolver, and visible to the network.</p>`,
    deepDive: `<h3>DNS Over HTTPS</h3>
<p>DoH encrypts DNS queries by sending them over HTTPS connections.</p>

<pre><code># Configure DoH on Linux
# /etc/systemd/resolved.conf
[Resolve]
DNS=1.1.1.1#cloudflare-dns.com
DNS=9.9.9.9#dns.quad9.net
DNSOverTLS=yes
DNSSEC=yes

# Or use dnscrypt-proxy for more control
listen_addresses = ['127.0.0.1:53']
server_names = ['cloudflare', 'quad9']</code></pre>

<h3>DNS Leak Testing</h3>
<p>Switching to DoH does not guarantee privacy. Your system may still leak DNS queries through other channels.</p>

<pre><code># Test for DNS leaks
# Visit dnsleaktest.com or ipleak.net

# Command-line leak test
dig TXT unique-test-12345.dnsleaktest.com

# Common leak sources:
# 1. systemd-resolved bypasses DoH for certain queries
# 2. libc resolver sends direct queries
# 3. Browser DNS prefetch ignores system settings

# Fix: force all DNS through DoH
iptables -A OUTPUT -p udp --dport 53 -j DROP
iptables -A OUTPUT -p tcp --dport 53 -j DROP</code></pre>

<h3>DNS Security Extensions</h3>
<p>DNSSEC adds cryptographic signatures to DNS records. It verifies integrity, not privacy.</p>

<pre><code># DNSSEC validation
[Resolve]
DNSSEC=yes

# Verify DNSSEC is working
dig dnssec-failed.org
# Should return SERVFAIL if DNSSEC validation fails</code></pre>`,
    principles: [
      "DNS queries are metadata. Metadata is surveillance.",
      "DNSSEC is authentication, not privacy.",
      "DoH is not bulletproof. Test for DNS leaks after switching.",
      "DNS is the first line of defense.",
      "Run your own DNS resolver."
    ],
    examples: [
      { title: "ISP DNS Surveillance", body: "Your ISP logs every DNS query you make. This data is sold to advertisers, used for targeted marketing, and shared with law enforcement." },
      { title: "DNS Cache Poisoning", body: "An attacker sends forged DNS responses to a resolver. DNSSEC prevents this by verifying the authenticity of responses." }
    ],
    antiPatterns: [
      "Using ISP DNS without thinking about it.",
      "Trusting Cloudflare or Google DNS blindly.",
      "Ignoring DNSSEC.",
      "Not testing for DNS leaks."
    ],
    checklist: [
      "DNS over HTTPS or DNS over TLS configured",
      "DNS leak test passed",
      "DNSSEC validation enabled",
      "Port 53 blocked outbound",
      "Self-hosted resolver running"
    ],
    move: "Run dig example.com and look at the resolver IP. Is it your ISP? Is it yours? That answer tells you who sees your browsing history."
  },

  "automation-with-ansible": {
    intro: `<p>If you do it twice, automate it. If you do it once but will do it again, automate it. Manual processes are bugs in your infrastructure. They break at 3 AM, they depend on tribal knowledge, and they scale linearly with headcount.</p>
<p>Ansible is the right tool for infrastructure automation. Agentless, idempotent, readable. The barrier to entry is low, and the ceiling is high.</p>`,
    deepDive: `<h3>Playbooks: The Unit of Automation</h3>
<p>An Ansible playbook is a list of tasks to execute on managed nodes. Each task calls a module. Modules are idempotent — they check the current state and only make changes if needed.</p>

<pre><code># Playbook: provision a web server
---
- hosts: webservers
  become: yes
  vars:
    nginx_port: 80
    domain: example.com

  tasks:
    - name: Install packages
      apt:
        name: [nginx, certbot, python3-certbot-nginx, ufw]
        state: present
        update_cache: yes

    - name: Configure firewall
      ufw:
        rule: allow
        port: "{{ item }}"
      loop: ['22', '80', '443']

    - name: Enable firewall
      ufw:
        state: enabled
        policy: deny

    - name: Deploy nginx config
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/sites-available/default
      notify: Reload nginx

    - name: Enable HTTPS
      shell: >
        certbot --nginx -d {{ domain }}
        --non-interactive --agree-tos -m admin@{{ domain }}
      args:
        creates: /etc/letsencrypt/live/{{ domain }}

  handlers:
    - name: Reload nginx
      service:
        name: nginx
        state: reloaded</code></pre>

<h3>Roles: Reusable Automation</h3>
<p>Roles package playbooks into reusable components.</p>

<pre><code># Role structure
roles/
  nginx/
    tasks/main.yml
    handlers/main.yml
    templates/nginx.conf.j2
    defaults/main.yml

# Use the role in a playbook
---
- hosts: webservers
  become: yes
  roles:
    - nginx
    - { role: certbot, domain: example.com }
    - monitoring-agent</code></pre>

<h3>Inventory and Variables</h3>
<p>Inventory defines which hosts Ansible manages. Variables customize behavior per host.</p>

<pre><code># Inventory file (hosts.yml)
all:
  children:
    webservers:
      hosts:
        web1.example.com:
          nginx_port: 80
        web2.example.com:
          nginx_port: 8080
    databases:
      hosts:
        db1.example.com:
          postgres_version: 15

  vars:
    ansible_user: deploy
    ansible_ssh_private_key_file: ~/.ssh/deploy_key</code></pre>`,
    principles: [
      "Idempotency is the foundation. Running the same playbook twice must produce the same result.",
      "Start with one playbook per service.",
      "Use ansible-vault for secrets.",
      "Tag your tasks. Running only specific tags saves time.",
      "Test in staging before production."
    ],
    examples: [
      { title: "Zero-Downtime Deployment", body: "A playbook deploys a new version: copies the binary, runs health checks, switches traffic, and rolls back if health checks fail. The entire process is automated and idempotent." },
      { title: "Disaster Recovery", body: "A playbook rebuilds the entire infrastructure from scratch: provisions VMs, installs packages, deploys configurations, restores backups. The recovery time is the playbook execution time, not hours of manual work." }
    ],
    antiPatterns: [
      "Running playbooks as root. Use become: yes for privilege escalation.",
      "Hardcoding values in playbooks. Use variables for portability.",
      "Skipping idempotency checks. Every task must be safe to run multiple times.",
      "Not using roles. Roles are the unit of reuse in Ansible."
    ],
    checklist: [
      "All infrastructure managed by Ansible",
      "Secrets stored in ansible-vault",
      "Playbooks tagged for selective execution",
      "Idempotency verified for all tasks",
      "Inventory version controlled"
    ],
    move: "Write a playbook that provisions a fresh Ubuntu server: install nginx, configure firewall, deploy a hello-world page. Run it. Destroy the server. Run it again. That is automation."
  },

  "reverse-engineering-basics": {
    intro: `<p>Source code is a luxury. Reverse engineering is reading the binary directly. When you cannot see the source, the assembly is all you have. The reverse engineer reads the program's intent from its machine code — instruction by instruction.</p>
<p>Reverse engineering is not about understanding every assembly instruction. It is about understanding the program's behavior: what it does, what it expects, and what it produces. The goal is to answer questions without source code.</p>`,
    deepDive: `<h3>Static Analysis: Reading the Binary</h3>
<p>Static analysis examines the binary without executing it. Disassemblers convert machine code to assembly. Decompilers attempt to reconstruct source code.</p>

<pre><code># Ghidra: NSA's open-source reverse engineering tool
# Load binary, analyze, decompile functions

# radare2: command-line reverse engineering
r2 -A binary
[0x00401000]> afl        # List all functions
[0x00401000]> pdf @main  # Disassemble main
[0x00401000]> axt @sym.check_password  # Cross-references

# objdump: basic disassembly
objdump -d -M intel binary | head -50

# nm: list symbols
nm binary | grep -i main</code></pre>

<h3>Dynamic Analysis: Watching the Binary</h3>
<p>Dynamic analysis executes the binary and observes its behavior. Debuggers set breakpoints and inspect memory.</p>

<pre><code># GDB: GNU debugger
gdb ./binary
(gdb) break main
(gdb) run
(gdb) info registers        # View registers
(gdb) x/20x $rsp           # View stack
(gdb) x/s 0x402000         # View string at address
(gdb) stepi                 # Single step instruction
(gdb) continue              # Continue execution

# ltrace: library call trace
ltrace ./binary
# Shows: strcmp("user", "admin"), printf("Access denied")

# strace: system call trace
strace ./binary
# Shows: open("/etc/passwd"), read(fd, buf, 1024)</code></pre>

<h3>String Analysis and Patterns</h3>
<p>Strings in a binary reveal intent. Error messages, URLs, format strings, configuration data — all visible as plaintext.</p>

<pre><code># Extract strings from binary
strings binary | head -50

# Look for interesting patterns
strings binary | grep -i "password\|secret\|key\|http\|flag"

# Format strings: look for printf-like calls
strings binary | grep "%s\|%d\|%x"

# API imports: what functions does it call?
objdump -T binary | grep -i "printf\|strcmp\|strcpy\|gets"

# If it calls gets() or strcpy(), it has buffer overflow potential
# If it calls strcmp(), it has a hardcoded comparison</code></pre>`,
    principles: [
      "Start with strings. They reveal the program's intent faster than assembly.",
      "Static analysis for structure. Dynamic analysis for behavior. Use both.",
      "Cross-references tell the story. What calls this function? What does it call?",
      "The binary is the ground truth. Assumptions about source code are assumptions.",
      "Document every finding. Reverse engineering is slow. Do not redo work."
    ],
    examples: [
      { title: "Crackme Challenge", body: "A crackme binary asks for a password. Static analysis reveals a strcmp call. The string comparison is against 's3cr3t'. The password is 's3cr3t'. Real binaries encrypt or hash passwords — this one had a plaintext comparison." },
      { title: "Malware Analysis", body: "A suspicious binary was found on a server. String analysis revealed C2 URLs and XOR-encoded configuration. Dynamic analysis showed it decoded the config at runtime, contacted the C2, and downloaded a payload. The XOR key was a single byte — brute-forceable in 256 attempts." }
    ],
    antiPatterns: [
      "Running the binary on your analysis machine. Use a sandbox or VM.",
      "Ignoring the entropy. High entropy sections may be packed or encrypted.",
      "Trusting the disassembler. Anti-disassembly techniques produce incorrect output.",
      "Not checking for anti-debugging. Some binaries detect and evade debuggers."
    ],
    checklist: [
      "Binary loaded in disassembler (Ghidra or IDA)",
      "Strings extracted and analyzed",
      "Main function identified and decompiled",
      "Cross-references mapped for key functions",
      "Dynamic analysis performed in sandbox",
      "Findings documented with addresses and evidence"
    ],
    move: "Download a crackme from crackmes.one. Try to solve it. If you can solve it, you understand the basics of reverse engineering."
  },

  "blockchain-layer2-scaling": {
    intro: `<p>Layer 2 is not a compromise. It is the scaling architecture that inherits Ethereum's security while moving execution off-chain. The tradeoff is complexity, not security. Understanding the architecture is understanding the future.</p>
<p>Ethereum processes ~15 transactions per second. Visa processes ~65,000. Layer 2 solutions bridge this gap by executing transactions off-chain and settling results on-chain. The security model is different, but the guarantees are equivalent.</p>`,
    deepDive: `<h3>Optimistic Rollups</h3>
<p>Optimistic rollups assume transactions are valid and submit them to L1 without proof. A challenge period (7 days) allows anyone to submit a fraud proof if a transaction is invalid.</p>

<pre><code>// Optimistic rollup transaction flow
// 1. User submits transaction to L2 sequencer
// 2. Sequencer executes transaction and batches it
// 3. Batch is posted to L1 (calldata or blobs)
// 4. Challenge period begins (7 days)
// 5. If no challenge, transaction is finalized
// 6. If challenged, fraud proof is submitted to L1
// 7. L1 contract re-executes the transaction
// 8. Invalid batch is reverted, sequencer is slashed

// Fraud proof mechanism:
// 1. Challenger isolates the disputed transaction
// 2. Posts a claim: "this transaction is invalid"
// 3. L1 contract performs interactive verification
// 4. Binary search finds the exact invalid instruction
// 5. L1 contract re-executes that instruction
// 6. If invalid, the batch is reverted</code></pre>

<h3>ZK Rollups</h3>
<p>ZK rollups submit a cryptographic proof (validity proof) with every batch. The proof guarantees that all transactions in the batch are valid. No challenge period needed.</p>

<pre><code>// ZK rollup transaction flow
// 1. User submits transaction to L2 sequencer
// 2. Sequencer executes and generates a ZK proof
// 3. Batch + proof posted to L1
// 4. L1 contract verifies the proof
// 5. If proof valid, batch is finalized immediately
// 6. No challenge period — instant finality

// Proof types:
// - SNARKs (used by zkSync, Polygon zkEVM)
//   Small proofs, fast verification, trusted setup required
// - STARKs (used by StarkNet)
//   Larger proofs, slower verification, no trusted setup
//   Quantum-resistant

// zkEVM compatibility:
// - Type 1: Full Ethereum equivalence (Taiko)
// - Type 2: EVM-compatible (Polygon zkEVM)
// - Type 3: EVM-compatible with minor differences (zkSync Era)
// - Type 4: High-level language compatible (Scroll)</code></pre>

<h3>State Channels</h3>
<p>State channels move entire interactions off-chain. Two parties open a channel, exchange unlimited transactions off-chain, and settle the final state on-chain.</p>

<pre><code>// Payment channel flow
// 1. Alice and Bob open a channel (deposit ETH on L1)
// 2. Alice sends 1 ETH to Bob (off-chain, signed)
// 3. Bob sends 0.5 ETH back to Alice (off-chain, signed)
// 4. Repeat step 2-3 unlimited times
// 5. Close channel: submit final state to L1
// 6. L1 contract distributes funds based on final state

// Advantages:
// - Instant transactions (no block confirmation)
// - Near-zero fees (no gas per transaction)
// - Full privacy (off-chain transactions not public)

// Disadvantages:
// - Both parties must be online
// - Capital is locked in the channel
// - Not suitable for general computation</code></pre>`,
    principles: [
      "L2 inherits L1 security. The trust model is the same, the execution model is different.",
      "Optimistic rollups rely on game theory (fraud proofs). ZK rollups rely on math (validity proofs).",
      "Instant finality is only possible with ZK rollups. Optimistic rollups have a 7-day challenge period.",
      "State channels are for specific use cases (payments). Rollups are general-purpose.",
      "The L2 ecosystem is fragmented. Cross-chain bridges are a security risk."
    ],
    examples: [
      { title: "Arbitrum One", body: "Arbitrum is the largest optimistic rollup by TVL. It processes millions of transactions daily at a fraction of Ethereum's gas cost. The fraud proof system has never been triggered in production — because sequencers are honest." },
      { title: "zkSync Era", body: "zkSync Era is a ZK rollup that supports smart contracts. It uses SNARKs for proof generation and settles on Ethereum. Transaction finality is immediate after L1 verification." }
    ],
    antiPatterns: [
      "Trusting L2 sequencers. Sequencers can censor transactions. Use force-inclusion mechanisms.",
      "Ignoring cross-chain bridge risks. Bridges are the #1 attack target in L2.",
      "Assuming L2 is as decentralized as L1. Most L2s have centralized sequencers today.",
      "Not testing with real gas costs. L2 gas is cheaper, but not free."
    ],
    checklist: [
      "L2 type understood (optimistic vs ZK)",
      "Sequencer decentralization status checked",
      "Cross-chain bridge risks assessed",
      "Force-inclusion mechanism available",
      "Withdrawal period understood (7 days for optimistic)"
    ],
    move: "Bridge 0.01 ETH to Arbitrum. Make a swap on Uniswap. Bridge it back. Notice the gas difference. That is L2 in action."
  },

  "incident-response-playbook": {
    intro: `<p>Incidents are not a matter of if, but when. The difference between a minor event and a catastrophe is the quality of your response in the first hour. The incident response playbook is the difference between chaos and control.</p>
<p>A playbook is not a document you read during an incident. It is a set of practiced procedures that your team executes automatically. The time to practice is before the incident, not during it.</p>`,
    deepDive: `<h3>The First Hour: Triage</h3>
<p>The first hour determines the outcome. The triage phase answers three questions: what is happening, who is affected, and how bad is it.</p>

<pre><code># Incident response checklist
# Phase 1: Detection and Triage (0-30 minutes)

1. CONFIRM the incident
   - Is this a false positive?
   - What evidence supports the classification?
   - Assign severity: P1 (critical), P2 (high), P3 (medium), P4 (low)

2. ASSESS scope
   - Which systems are affected?
   - Which users are affected?
   - Is the incident ongoing or contained?

3. ASSEMBLE the team
   - Incident commander: makes decisions
   - Technical lead: coordinates investigation
   - Communications: updates stakeholders
   - Scribe: documents everything

4. CONTAIN
   - Isolate affected systems
   - Preserve evidence (memory dumps, logs, disk images)
   - Block attack vectors (firewall rules, account lockouts)

5. COMMUNICATE
   - Internal: status page, Slack channel, war room
   - External: customer notification (if required)
   - Regulatory: breach notification (if required)</code></pre>

<h3>Investigation and Analysis</h3>
<p>The investigation phase answers: how did this happen, what was accessed, and what was exfiltrated.</p>

<pre><code># Investigation checklist
# Phase 2: Investigation (1-24 hours)

1. TIMELINE
   - When did the incident start?
   - What was the initial access vector?
   - What actions did the attacker take?
   - When was the incident detected?

2. EVIDENCE COLLECTION
   - Memory dumps (volatile evidence first)
   - Disk images (for deleted files)
   - Log files (centralized, immutable)
   - Network captures (if available)
   - Cloud audit logs (CloudTrail, Azure Activity Log)

3. ROOT CAUSE ANALYSIS
   - What vulnerability was exploited?
   - What misconfiguration allowed it?
   - What control failed to detect it?
   - What control failed to prevent it?

4. IMPACT ASSESSMENT
   - What data was accessed?
   - What data was exfiltrated?
   - What systems were compromised?
   - What credentials were leaked?</code></pre>

<h3>Recovery and Post-Incident</h3>
<p>Recovery restores normal operations. Post-incident analysis prevents recurrence.</p>

<pre><code># Recovery checklist
# Phase 3: Recovery (24-72 hours)

1. ERADICATE
   - Remove attacker persistence mechanisms
   - Rebuild compromised systems (do not clean — rebuild)
   - Rotate all potentially compromised credentials
   - Patch the exploited vulnerability

2. RESTORE
   - Restore from known-good backups
   - Verify data integrity
   - Monitor for re-infection
   - Gradually restore services

3. POST-INCIDENT
   - Blameless post-mortem within 72 hours
   - Document: timeline, root cause, impact, actions
   - Action items: specific, assigned, dated
   - Update the playbook based on lessons learned</code></pre>`,
    principles: [
      "The first hour determines the outcome. Practice before the incident.",
      "Preserve evidence first. You cannot investigate what you did not collect.",
      "Communicate early, communicate often. Silence creates panic.",
      "Rebuild, do not clean. Compromised systems have persistence you cannot detect.",
      "Blameless post-mortems. The goal is learning, not punishment."
    ],
    examples: [
      { title: "SolarWinds Incident (2020)", body: "A supply chain attack compromised SolarWinds' build process. The malicious code was distributed to 18,000 organizations. The investigation took months. The lesson: supply chain security is critical. Verify every dependency." },
      { title: "Log4Shell (2021)", body: "A remote code execution vulnerability in Log4j affected millions of Java applications. The exploit was trivial: a JNDI lookup in a log message. The response: patch immediately, then audit all Java dependencies. The lesson: dependency management is security." }
    ],
    antiPatterns: [
      "Panicking during an incident. Follow the playbook.",
      "Destroying evidence. Memory dumps and logs are critical.",
      "Communicating without facts. 'We are investigating' is acceptable.",
      "Skipping the post-mortem. The lessons learned prevent the next incident."
    ],
    checklist: [
      "Incident response playbook exists and is current",
      "Team has practiced the playbook (tabletop exercise)",
      "Communication templates are prepared",
      "Evidence collection tools are ready",
      "Post-mortem template is defined"
    ],
    move: "Run a tabletop exercise. Pick a scenario (ransomware, data breach, DDoS). Walk through the playbook. Identify gaps. The time to find gaps is before the incident."
  },

  "python-automation-scripts": {
    intro: `<p>Python is not the fastest language. It is the fastest to write. For security automation, speed of development beats speed of execution. A Python script that takes 10 seconds to run and 30 minutes to write is better than a Go binary that takes 0.1 seconds and 4 hours to write.</p>
<p>Python is the duct tape of security engineering. It connects systems, automates tasks, parses output, and generates reports. It is not elegant. It is effective.</p>`,
    deepDive: `<h3>Network Scanning</h3>
<p>Python's socket library is all you need for network scanning. No external dependencies required.</p>

<pre><code>#!/usr/bin/env python3
"""Minimal port scanner. Zero dependencies."""
import socket
import sys
from datetime import datetime

def scan_host(host, ports):
    results = []
    for port in ports:
        try:
            sock = socket.create_connection((host, port), timeout=2)
            sock.close()
            results.append({"port": port, "status": "open"})
        except (socket.timeout, ConnectionRefusedError):
            results.append({"port": port, "status": "closed"})
    return results

def scan_network(network, ports):
    """Scan a /24 network for open ports."""
    import concurrent.futures
    results = {}
    hosts = [f"{network}.{i}" for i in range(1, 255)]

    def scan_one(host):
        open_ports = [r for r in scan_host(host, ports) if r["status"] == "open"]
        if open_ports:
            return host, open_ports
        return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = {executor.submit(scan_one, h): h for h in hosts}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                host, ports = result
                results[host] = ports

    return results

if __name__ == "__main__":
    network = sys.argv[1] if len(sys.argv) > 1 else "192.168.1"
    ports = [22, 80, 443, 8080, 3000, 5432]
    print(f"Scanning {network}.0/24...")
    results = scan_network(network, ports)
    for host, open_ports in sorted(results.items()):
        port_list = ", ".join(str(p["port"]) for p in open_ports)
        print(f"{host}: {port_list}")</code></pre>

<h3>Log Analysis</h3>
<p>Python excels at parsing and analyzing log files. Regular expressions, counters, and timelines — all trivial in Python.</p>

<pre><code>#!/usr/bin/env python3
"""Analyze SSH auth logs for brute force attempts."""
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime

def parse_auth_log(logfile):
    failed_attempts = defaultdict(list)
    successful_logins = []

    pattern = re.compile(
        r'(\w+ \d+ \d+:\d+:\d+).*sshd.*'
        r'(Failed password|Accepted password).*'
        r'for (\S+) from (\S+)'
    )

    with open(logfile) as f:
        for line in f:
            match = pattern.search(line)
            if not match:
                continue

            timestamp, status, user, ip = match.groups()

            if status == "Failed password":
                failed_attempts[ip].append({
                    "user": user,
                    "time": timestamp
                })
            elif status == "Accepted password":
                successful_logins.append({
                    "user": user,
                    "ip": ip,
                    "time": timestamp
                })

    return failed_attempts, successful_logins

if __name__ == "__main__":
    logfile = sys.argv[1] if len(sys.argv) > 1 else "/var/log/auth.log"
    failed, success = parse_auth_log(logfile)

    print(f"Failed attempts: {sum(len(v) for v in failed.values())}")
    print(f"Successful logins: {len(success)}")

    print("\nTop attacking IPs:")
    for ip, attempts in sorted(failed.items(), key=lambda x: -len(x[1]))[:10]:
        users = Counter(a["user"] for a in attempts)
        print(f"  {ip}: {len(attempts)} attempts -> {dict(users)}")

    print("\nSuccessful logins from attack IPs:")
    attack_ips = set(failed.keys())
    for login in success:
        if login["ip"] in attack_ips:
            print(f"  {login['time']} {login['user']} from {login['ip']}")</code></pre>

<h3>Automated Reporting</h3>
<p>Python generates reports in any format: HTML, PDF, CSV, JSON. The script that scans, analyzes, and reports is the complete automation pipeline.</p>

<pre><code>#!/usr/bin/env python3
"""Generate a network audit report."""
import json
import subprocess
from datetime import datetime

def run_nmap(target):
    result = subprocess.run(
        ["nmap", "-sV", "-O", "--json", target],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

def generate_html_report(scan_data, output_file):
    html = f"""&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;&lt;title&gt;Network Audit Report&lt;/title&gt;
&lt;style&gt;
body {{ font-family: monospace; background: #111; color: #e9e8e2; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ border: 1px solid #30302b; padding: 8px; text-align: left; }}
th {{ background: #1a1a14; }}
&lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;
&lt;h1&gt;Network Audit Report&lt;/h1&gt;
&lt;p&gt;Generated: {datetime.now().isoformat()}&lt;/p&gt;
&lt;table&gt;
&lt;tr&gt;&lt;th&gt;Host&lt;/th&gt;&lt;th&gt;OS&lt;/th&gt;&lt;th&gt;Open Ports&lt;/th&gt;&lt;/tr&gt;"""

    for host in scan_data.get("hosts", []):
        addr = host.get("address", {}).get("addr", "unknown")
        os_guess = host.get("os", {}).get("osmatch", [{}])[0].get("name", "unknown")
        ports = ", ".join(
            p.get("portid", "") for p in host.get("ports", [])
            if p.get("state") == "open"
        )
        html += f"\n&lt;tr&gt;&lt;td&gt;{addr}&lt;/td&gt;&lt;td&gt;{os_guess}&lt;/td&gt;&lt;td&gt;{ports}&lt;/td&gt;&lt;/tr&gt;"

    html += "\n&lt;/table&gt;\n&lt;/body&gt;\n&lt;/html&gt;"

    with open(output_file, "w") as f:
        f.write(html)

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "192.168.1.0/24"
    scan_data = run_nmap(target)
    generate_html_report(scan_data, "report.html")
    print("Report generated: report.html")</code></pre>`,
    principles: [
      "Python is not the fastest language. It is the fastest to write.",
      "Zero dependencies is a feature. The standard library covers most security use cases.",
      "Scripts should be runnable from the command line. Accept arguments, print output.",
      "Log everything. The script that runs at 3 AM should produce output you can read at 9 AM.",
      "Reuse code. Build a personal library of security scripts."
    ],
    examples: [
      { title: "Automated Vulnerability Scanner", body: "A Python script runs nmap, parses the output, checks each service against CVE databases, and generates a prioritized vulnerability report. The entire pipeline is 200 lines of Python." },
      { title: "Credential Dumper", body: "A Python script reads /etc/shadow (as root), hashes a wordlist, and checks for matches. No external tools needed. The script runs in seconds on a modern CPU." }
    ],
    antiPatterns: [
      "Using Python for high-performance tasks. Use Go or Rust for speed-critical code.",
      "Ignoring error handling. Scripts that crash at 3 AM are useless.",
      "Hardcoding values. Accept command-line arguments for flexibility.",
      "Not testing scripts. Run them in a sandbox before production."
    ],
    checklist: [
      "Script accepts command-line arguments",
      "Error handling covers common failure modes",
      "Output is parseable (JSON or structured text)",
      "Dependencies are documented (requirements.txt)",
      "Script is executable (chmod +x, shebang line)"
    ],
    move: "Write a script that scans your local network for open ports and outputs the results as JSON. That is your first security automation tool."
  },
};
