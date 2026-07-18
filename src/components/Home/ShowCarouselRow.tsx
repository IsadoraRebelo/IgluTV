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
      <h2 className="font-heading mb-2 md:mb-4 text-lg font-bold text-white md:text-xl">
        {title}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {shows.map((show) => (
          <PosterCard
            key={show.id}
            show={show}
            className="w-32 shrink-0 transition-transform duration-200 hover:-translate-y-1 sm:w-40 lg:w-44"
            sizes="(max-width: 640px) 128px, (max-width: 1024px) 160px, 176px"
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
