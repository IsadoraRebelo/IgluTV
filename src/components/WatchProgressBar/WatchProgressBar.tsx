import { getWatchStatusBackground } from '@/components/ShowTracker/utils';

import type { ShowStatus } from '@/types';

export function WatchProgressBar({
  watchedCount,
  markableCount,
  showStatus,
  showCount = true,
  className = '',
}: {
  watchedCount: number;
  markableCount: number;
  showStatus: ShowStatus | null;
  showCount?: boolean;
  className?: string;
}) {
  const background = getWatchStatusBackground(
    showStatus,
    watchedCount,
    markableCount
  );

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ background, justifyContent: 'flex-end' }}
    >
      {showCount && markableCount > 0 ? (
        <span className="text-[10px] font-semibold text-white/90">
          {watchedCount}/{markableCount}
        </span>
      ) : null}
    </div>
  );
}
