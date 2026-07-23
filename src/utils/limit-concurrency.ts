// Runs an async mapper over items with at most `limit` in flight.
//
// Unbounded Promise.all over TMDB is what produced ~293 concurrent requests
// from the tracking page and a wall of 429s. TMDB refuses at roughly 50/sec,
// and — worse — a refusal gets cached, so a momentary burst removes data for
// hours. Queuing turns a burst into a slightly slower first load.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const size = Math.max(1, limit);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, worker)
  );

  return results;
}
