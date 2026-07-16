import { PosterCard } from '@/components/PosterCard/PosterCard';

import type { ShowStatus, ShowSummary } from '@/types';

export function ShowCarouselRow({
  title,
  shows,
  watchedCounts,
  status,
}: {
  title: string;
  shows: ShowSummary[];
  watchedCounts?: Map<number, number>;
  status?: ShowStatus;
}) {
  if (shows.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-white sm:text-xl">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {shows.map((show) => (
          <PosterCard
            key={show.id}
            show={show}
            className="w-32 shrink-0"
            progress={
              watchedCounts
                ? {
                    watchedCount: watchedCounts.get(show.id) ?? 0,
                    showStatus: status ?? null,
                  }
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
