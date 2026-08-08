"use client";

// ─── Product Bottom Module ───────────────────────────────────────────────────
// Bottom placement for 2-3 complementary products.
// Renders after article content, before footer.

import ProductCard from "./ProductCard";

interface ProductBottomProps {
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

export default function ProductBottom({ products, articleSlug }: ProductBottomProps) {
  if (products.length === 0) return null;

  return (
    <div className="product-bottom">
      <div className="product-bottom__header">
        <span className="product-bottom__label">RELEVANT TO THIS ARTICLE</span>
        <h3 className="product-bottom__title">Products You May Find Useful</h3>
        <p className="product-bottom__subtitle">
          Contextual recommendations based on this article&apos;s content.
        </p>
      </div>

      <div className="product-bottom__grid">
        {products.slice(0, 3).map(product => (
          <ProductCard
            key={product.id}
            productId={product.id}
            title={product.title}
            price={product.price}
            imageUrl={product.imageUrl}
            detailPageUrl={product.detailPageUrl}
            relevanceScore={product.relevanceScore}
            reason={product.reason}
            articleSlug={articleSlug}
            variant="full"
          />
        ))}
      </div>

      <p className="product-bottom__disclosure">
        As an Amazon Associate, we earn from qualifying purchases. Recommendations are
        based on content relevance, not commission rates. We only recommend products
        we believe are genuinely useful for the topic discussed.
      </p>

      <style jsx>{`
        .product-bottom {
          margin-top: 2rem;
          padding: 1.5rem;
          background: rgba(10, 10, 12, 0.6);
          border: 1px solid rgba(0, 255, 136, 0.1);
          border-radius: 8px;
        }
        .product-bottom__header {
          margin-bottom: 1.25rem;
        }
        .product-bottom__label {
          font-size: 0.6rem;
          letter-spacing: 0.12em;
          color: #00ff88;
          text-transform: uppercase;
          font-weight: 600;
        }
        .product-bottom__title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e0e0e0;
          margin: 0.25rem 0 0.25rem;
        }
        .product-bottom__subtitle {
          font-size: 0.8rem;
          color: #888;
          margin: 0;
        }
        .product-bottom__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
        .product-bottom__disclosure {
          margin-top: 1rem;
          font-size: 0.65rem;
          color: #555;
          line-height: 1.4;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 0.75rem;
        }
        @media (max-width: 640px) {
          .product-bottom__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
