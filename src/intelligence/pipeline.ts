import type { Collector, ScoredOpportunity } from "./types";
import { deduplicate } from "./processors/deduplicate";
import { normalize } from "./processors/normalize";
import { classify } from "./processors/classify";
import { rankOpportunities } from "./ranking";

export async function runIntelligence(
  collectors: Collector[]
): Promise<{ items: ScoredOpportunity[]; errors: string[] }> {
  const settled = await Promise.allSettled(
    collectors.map((collector) => collector.collect())
  );

  const errors = settled
    .filter(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected"
    )
    .map((result) => String(result.reason));

  const items = settled
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<Collector["collect"]>>
      > => result.status === "fulfilled"
    )
    .flatMap((result) => result.value);

  return {
    items: rankOpportunities(classify(deduplicate(normalize(items)))),
    errors,
  };
}
