import type { UpcomingGroup } from './buildUpcomingGroups';
import { TrackingUpcomingRow } from './TrackingUpcomingRow';

export function TrackingUpcomingGroups({ groups }: { groups: UpcomingGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <div>
      {groups.map((group, index) => (
        <div key={group.label}>
          <div className="mb-3 flex justify-center first:mt-0 lg:hidden" >
            <span className={`${index === 0 ? 'mt-0' : 'mt-5'} text-text-tertiary rounded-full bg-white/[0.06] px-4 py-1.5 text-[10.5px] font-bold tracking-[0.12em]`}>
              {group.label}
            </span>
          </div>
          <div
            className={`text-text-faint mb-3 hidden text-xs font-bold tracking-[0.14em] lg:block ${index === 0 ? 'mt-0' : 'mt-5'}`}
          >
            {group.label}
          </div>

          <div className="flex flex-col gap-3">
            {group.entries.map((entry) => (
              <TrackingUpcomingRow
                key={`${entry.showId}-${entry.seasonNumber}-${entry.episode.episodeNumber}`}
                showId={entry.showId}
                showName={entry.showName}
                posterUrl={entry.posterUrl}
                network={entry.network}
                seasonNumber={entry.seasonNumber}
                episode={entry.episode}
                daysUntilAir={entry.daysUntilAir}
                daysLabel={entry.daysLabel}
                seasons={entry.seasons}
                watchedEpisodes={entry.watchedEpisodes}
                skipCatchUpPrompt={entry.skipCatchUpPrompt}
                initialStatus={entry.initialStatus}
                tmdbStatus={entry.tmdbStatus}
                cast={entry.cast}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
