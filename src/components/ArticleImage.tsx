import Image from "next/image";

interface ArticleImageProps {
  url: string;
  alt: string;
  photographer?: string;
  photographerUrl?: string;
  sourceUrl?: string;
  className?: string;
  priority?: boolean;
}

export default function ArticleImage({
  url,
  alt,
  photographer,
  photographerUrl,
  sourceUrl,
  className = "article-mid-image",
  priority = false,
}: ArticleImageProps) {
  const caption =
    photographer && photographerUrl && sourceUrl ? (
      <figcaption>
        Photo by{" "}
        <a href={photographerUrl} target="_blank" rel="noopener noreferrer">
          {photographer}
        </a>{" "}
        on{" "}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          Pexels
        </a>
      </figcaption>
    ) : null;

  return (
    <figure className={className}>
      <Image
        src={url}
        alt={alt}
        width={1200}
        height={675}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
      {caption}
    </figure>
  );
}
