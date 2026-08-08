"use client";

// ─── Product Sidebar ─────────────────────────────────────────────────────────
// Sticky sidebar placement for a single high-confidence product.
// Replaces BookAd when relevant products are available.

import ProductCard from "./ProductCard";

interface ProductSidebarProps {
  products: Array<{
    id: string;
    title: string;
    price?: string;
    imageUrl?: string;
    detailPageUrl: string;
    relevanceScore: number;
    reason: string;
  }>;
  articleSlug: string;
}

export default function ProductSidebar({ products, articleSlug }: ProductSidebarProps) {
  if (products.length === 0) return null;

  const primary = products[0];

  return (
    <div className="product-sidebar">
      <div className="product-sidebar__disclosure">
        <span>PRODUCT RECOMMENDATION</span>
      </div>
      <ProductCard
        productId={primary.id}
        title={primary.title}
        price={primary.price}
        imageUrl={primary.imageUrl}
        detailPageUrl={primary.detailPageUrl}
        relevanceScore={primary.relevanceScore}
        reason={primary.reason}
        articleSlug={articleSlug}
        variant="full"
      />
      <p className="product-sidebar__disclosure-text">
        As an Amazon Associate, we earn from qualifying purchases. This recommendation
        is based on the article&apos;s content and is not influenced by commission rates.
      </p>
      <style jsx>{`
        .product-sidebar {
          position: sticky;
          top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-width: 320px;
        }
        .product-sidebar__disclosure {
          font-size: 0.6rem;
          letter-spacing: 0.12em;
          color: #555;
          text-transform: uppercase;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .product-sidebar__disclosure-text {
          font-size: 0.65rem;
          color: #555;
          line-height: 1.4;
          margin: 0;
        }
        @media (max-width: 1024px) {
          .product-sidebar {
            position: static;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
