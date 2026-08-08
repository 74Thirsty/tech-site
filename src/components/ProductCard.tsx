"use client";

// ─── Product Card Component ──────────────────────────────────────────────────
// Renders a single Amazon product recommendation.
// All affiliate links go through /api/affiliate/click for tracking.
// Dark theme with acid-green accents matching the site design.

import Image from "next/image";

interface ProductCardProps {
  productId: string;
  title: string;
  price?: string;
  imageUrl?: string;
  detailPageUrl: string;
  relevanceScore: number;
  reason: string;
  articleSlug: string;
  variant?: "compact" | "full";
}

export default function ProductCard({
  productId,
  title,
  price,
  imageUrl,
  detailPageUrl,
  relevanceScore,
  reason,
  articleSlug,
  variant = "full",
}: ProductCardProps) {
  const trackingUrl = `/api/affiliate/click?p=${encodeURIComponent(productId)}&a=${encodeURIComponent(articleSlug)}&url=${encodeURIComponent(detailPageUrl)}`;

  if (variant === "compact") {
    return (
      <a
        href={trackingUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="product-card product-card--compact"
      >
        {imageUrl && (
          <div className="product-card__image">
            <Image
              src={imageUrl}
              alt={title}
              width={64}
              height={64}
              loading="lazy"
              className="product-card__img"
            />
          </div>
        )}
        <div className="product-card__info">
          <h4 className="product-card__title">{title}</h4>
          {price && <span className="product-card__price">{price}</span>}
        </div>
      </a>
    );
  }

  return (
    <a
      href={trackingUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="product-card"
    >
      {imageUrl && (
        <div className="product-card__image">
          <Image
            src={imageUrl}
            alt={title}
            width={120}
            height={120}
            loading="lazy"
            className="product-card__img"
          />
        </div>
      )}
      <div className="product-card__info">
        <span className="product-card__label">RECOMMENDED</span>
        <h4 className="product-card__title">{title}</h4>
        {price && <span className="product-card__price">{price}</span>}
        <p className="product-card__reason">{reason}</p>
        <span className="product-card__cta">View on Amazon →</span>
      </div>
      <style jsx>{`
        .product-card {
          display: flex;
          flex-direction: row;
          gap: 1rem;
          padding: 1rem;
          background: rgba(10, 10, 12, 0.8);
          border: 1px solid rgba(0, 255, 136, 0.15);
          border-radius: 8px;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .product-card:hover {
          border-color: rgba(0, 255, 136, 0.4);
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.08);
        }
        .product-card--compact {
          padding: 0.75rem;
          gap: 0.75rem;
        }
        .product-card__image {
          flex-shrink: 0;
          display: flex;
          align-items: flex-start;
        }
        .product-card__img {
          border-radius: 4px;
          object-fit: contain;
          background: #fff;
        }
        .product-card__info {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          min-width: 0;
        }
        .product-card__label {
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          color: #00ff88;
          font-weight: 600;
          text-transform: uppercase;
        }
        .product-card__title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #e0e0e0;
          margin: 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .product-card--compact .product-card__title {
          font-size: 0.8rem;
          -webkit-line-clamp: 1;
        }
        .product-card__price {
          font-size: 1rem;
          font-weight: 700;
          color: #00ff88;
        }
        .product-card__reason {
          font-size: 0.75rem;
          color: #888;
          margin: 0;
          line-height: 1.4;
        }
        .product-card__cta {
          font-size: 0.75rem;
          color: #00ff88;
          font-weight: 500;
          margin-top: 0.25rem;
        }
        .product-card:hover .product-card__cta {
          text-decoration: underline;
        }
      `}</style>
    </a>
  );
}
