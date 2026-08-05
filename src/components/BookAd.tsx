"use client";

import { useMemo } from "react";
import Image from "next/image";

type Book = {
  slug: string;
  title: string;
  author: string;
  description: string;
  appleBooksUrl: string;
  coverImage: string;
};

const BOOKS: Book[] = [
  {
    slug: "the-crypto-almanac",
    title: "The Crypto Almanac",
    author: "C.E. Hirschauer",
    description: "A deep dive into blockchain technology, decentralized finance, and smart contracts.",
    appleBooksUrl: "https://books.apple.com/us/book/the-crypto-almanac/id6751018716",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Publication221/v4/9d/bc/74/9dbc7400-5675-332c-98f8-b983420d1eb1/0003095437.jpg/313x0w.webp",
  },
  {
    slug: "ctrl-c-ctrl-v-and-the-death-of-reason",
    title: "Ctrl+C, Ctrl+V, and the Death of Reason",
    author: "C.E. Hirschauer",
    description: "A surgical strike against the decay of true engineering.",
    appleBooksUrl: "https://books.apple.com/us/book/ctrl-c-ctrl-v-and-the-death-of-reason/id6747921672",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Publication221/v4/00/61/be/0061be0e-d5f1-e61f-75f2-a661cebeafbb/0003016651.jpg/313x0w.webp",
  },
  {
    slug: "inside-the-black-forest",
    title: "Inside the Black Forest (The MEV Playbook)",
    author: "C.E. Hirschauer",
    description: "The black ops manual for MEV — flashloan-powered arbitrage agents and atomic bundles.",
    appleBooksUrl: "https://books.apple.com/us/book/inside-the-black-forest-the-mev-playbook/id6749015183",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/cc/f9/da/ccf9dabf-e663-f0f3-cbf6-ffbcd1f45504/0003028066.jpg/313x0w.webp",
  },
  {
    slug: "designing-and-launching-cryptocurrencies",
    title: "Designing and Launching Cryptocurrencies",
    author: "C.E. Hirschauer",
    description: "The definitive roadmap from initial concept to public launch and beyond.",
    appleBooksUrl: "https://books.apple.com/us/book/designing-and-launching-cryptocurrencies/id6751117632",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/ca/51/07/ca510709-5e82-74ff-2f68-adac822477dd/0003097790.jpg/313x0w.webp",
  },
  {
    slug: "smart-contracts",
    title: "Smart Contracts",
    author: "C.E. Hirschauer",
    description: "A comprehensive guide to the full lifecycle of smart contracts.",
    appleBooksUrl: "https://books.apple.com/us/book/smart-contracts-the-future-of-business-finance/id6749497265",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/ad/fb/da/adfbda42-06f7-f25b-3df1-0dfd3cfddc48/0003030482.jpg/313x0w.webp",
  },
  {
    slug: "neural-ledger",
    title: "Neural Ledger",
    author: "C.E. Hirschauer",
    description: "How AI is transforming finance — from fraud detection to wealth management.",
    appleBooksUrl: "https://books.apple.com/us/book/neural-ledger/id6751048942",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/d2/ed/d2/d2edd2f1-ca3e-3a5a-d4dd-88f9c52004bd/0003094357.jpg/313x0w.webp",
  },
  {
    slug: "tokenization-of-real-world-assets",
    title: "Tokenization of Real World Assets",
    author: "C.E. Hirschauer",
    description: "How tokenization is transforming global finance.",
    appleBooksUrl: "https://books.apple.com/us/book/tokenization-of-real-world-assets/id6752820646",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Publication221/v4/ad/df/ab/addfabf8-c4b6-1e08-7eaa-694c3fd24b72/0003159371.jpg/313x0w.webp",
  },
  {
    slug: "evm-unlocked",
    title: "EVM Unlocked",
    author: "C.E. Hirschauer",
    description: "An authoritative guide to Ethereum's architecture and smart contracts.",
    appleBooksUrl: "https://books.apple.com/us/book/evm-unlocked-the-hidden-engine-powering-modern-finance/id6757259148",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/5a/f9/04/5af90454-5ca1-bb37-edef-8baf1f2bae35/0004060133.jpg/313x0w.webp",
  },
];

function pickForToday(): Book {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return BOOKS[dayOfYear % BOOKS.length];
}

export default function BookAd() {
  const book = useMemo(() => pickForToday(), []);

  return (
    <a
      href={book.appleBooksUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="book-ad-banner"
    >
      <div className="book-ad-cover">
        <Image src={book.coverImage} alt={book.title} width={120} height={180} loading="lazy" />
      </div>
      <div className="book-ad-text">
        <span className="book-ad-label">FROM THE AUTHOR</span>
        <h3 className="book-ad-title">{book.title}</h3>
        <p className="book-ad-desc">{book.description}</p>
        <span className="book-ad-cta">View on Apple Books ↗</span>
      </div>
    </a>
  );
}
