export function CastWatchProgress({
  watchedCount,
  totalCount,
}: {
  watchedCount: number;
  totalCount: number;
}) {
  if (totalCount === 0) return null;

  const percentage = Math.round((watchedCount / totalCount) * 100);

  return (
    <div className="rounded-sm bg-white/[0.03] ring-1 ring-white/10">
      <div className="flex items-baseline justify-between px-3 pt-2">
        <p className="text-xs text-[#c2d0dd]">
          You&apos;ve watched {watchedCount} of {totalCount}
        </p>
        <span className="text-lg font-semibold text-white">{percentage}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="bg-accent h-full rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
