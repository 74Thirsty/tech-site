import type { Collector } from "@/intelligence/types";

export const githubCollector: Collector = {
  name: "GITHUB",
  async collect() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const response = await fetch(
      `https://api.github.com/search/repositories?q=stars:%3E1000+pushed:%3E${thirtyDaysAgo}&sort=stars&order=desc`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "stratagem-research",
        },
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) throw new Error(`GitHub ${response.status}`);

    const data = await response.json();
    return (data.items ?? [])
      .slice(0, 10)
      .map(
        (item: {
          id: number;
          name: string;
          html_url: string;
          description: string | null;
          topics?: string[];
          stargazers_count?: number;
          language?: string;
          owner?: { login?: string };
          updated_at?: string;
        }) => ({
          id: `github-${item.id}`,
          title: item.name,
          url: item.html_url,
          source: "GITHUB",
          summary:
            item.description ??
            `Stars: ${item.stargazers_count ?? 0}. Language: ${item.language ?? "unknown"}.`,
          topics: item.topics ?? ["PROGRAMMING"],
          publishedAt: item.updated_at ?? new Date().toISOString(),
        })
      );
  },
};
