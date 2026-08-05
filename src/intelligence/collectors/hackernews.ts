import type { Collector } from "@/intelligence/types";

export const hackerNewsCollector: Collector = {
  name: "HACKER NEWS",
  async collect() {
    const ids = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
      { next: { revalidate: 900 }, signal: AbortSignal.timeout(10000) }
    ).then((r) => r.json() as Promise<number[]>);

    const stories = await Promise.all(
      ids.slice(0, 10).map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          next: { revalidate: 900 },
          signal: AbortSignal.timeout(10000),
        }).then((r) => r.json())
      )
    );

    return stories
      .filter((item) => item?.url)
      .map((item) => ({
        id: `hn-${item.id}`,
        title: item.title,
        url: item.url,
        source: "HACKER NEWS",
        summary: `${item.score} points / ${item.descendants ?? 0} comments`,
        topics: ["TECHNOLOGY"],
        publishedAt: new Date(item.time * 1000).toISOString(),
        metrics: { score: item.score ?? 0 },
      }));
  },
};
