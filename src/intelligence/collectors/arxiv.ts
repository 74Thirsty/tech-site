import type { Collector } from "@/intelligence/types";
import { rssCollector } from "./rss";
export const arxivCollector = rssCollector("https://export.arxiv.org/rss/cs.AI");
