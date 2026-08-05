import type { Collector } from "@/intelligence/types";

export const cveCollector: Collector = {
  name: "CVE DATABASE",
  async collect() {
    const data = await fetch(
      "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=10",
      { next: { revalidate: 1800 }, signal: AbortSignal.timeout(15000) }
    ).then((r) => r.json());

    return (data.vulnerabilities ?? [])
      .map(
        (entry: {
          cve: {
            id: string;
            descriptions?: { value: string }[];
            published: string;
          };
        }) => ({
          id: `cve-${entry.cve.id}`,
          title: entry.cve.id,
          url: `https://nvd.nist.gov/vuln/detail/${entry.cve.id}`,
          source: "NVD / CVE",
          summary:
            entry.cve.descriptions?.[0]?.value ??
            "New vulnerability published.",
          topics: ["SECURITY", "CVE"],
          publishedAt: entry.cve.published,
        })
      );
  },
};
