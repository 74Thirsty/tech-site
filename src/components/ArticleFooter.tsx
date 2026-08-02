export default function ArticleFooter() {
  return (
    <footer className="article-footer-banner">
      <svg
        className="footer-banner-svg"
        viewBox="0 0 800 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="NEON//FORGE footer banner"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4f34a" stopOpacity="0" />
            <stop offset="20%" stopColor="#d4f34a" stopOpacity="1" />
            <stop offset="80%" stopColor="#d4f34a" stopOpacity="1" />
            <stop offset="100%" stopColor="#d4f34a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#30302b" />
            <stop offset="50%" stopColor="#d4f34a" />
            <stop offset="100%" stopColor="#30302b" />
          </linearGradient>
        </defs>

        {/* Scan line animation */}
        <line x1="0" y1="1" x2="800" y2="1" stroke="url(#lineGrad)" strokeWidth="2" className="scan-line" />

        {/* Company name */}
        <text x="400" y="70" textAnchor="middle" className="banner-brand" filter="url(#glow)">
          NEON<span className="banner-slash">//</span>FORGE
        </text>
        <text x="400" y="95" textAnchor="middle" className="banner-tagline">
          Build. Ship. Repeat.
        </text>

        {/* Social links */}
        <g className="social-group">
          {/* GitHub */}
          <a href="#" aria-label="GitHub">
            <circle cx="280" cy="140" r="18" className="social-circle" />
            <text x="280" y="145" textAnchor="middle" className="social-icon">GH</text>
          </a>
          {/* Twitter/X */}
          <a href="#" aria-label="Twitter">
            <circle cx="340" cy="140" r="18" className="social-circle" />
            <text x="340" y="145" textAnchor="middle" className="social-icon">X</text>
          </a>
          {/* LinkedIn */}
          <a href="#" aria-label="LinkedIn">
            <circle cx="400" cy="140" r="18" className="social-circle" />
            <text x="400" y="145" textAnchor="middle" className="social-icon">IN</text>
          </a>
          {/* Discord */}
          <a href="#" aria-label="Discord">
            <circle cx="460" cy="140" r="18" className="social-circle" />
            <text x="460" y="145" textAnchor="middle" className="social-icon">DC</text>
          </a>
        </g>

        {/* Donate button */}
        <g className="donate-group">
          <rect x="340" y="170" width="120" height="30" rx="4" className="donate-btn" />
          <text x="400" y="190" textAnchor="middle" className="donate-text">DONATE</text>
        </g>

        {/* Bottom line */}
        <line x1="100" y1="199" x2="700" y2="199" stroke="#30302b" strokeWidth="1" />
      </svg>
    </footer>
  );
}
