export function WatchlistSectionSkeleton() {
  return (
    <div className="flex flex-col gap-3 md:gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-1 md:mt-5">
        <div className="bg-surface h-5 w-20 animate-pulse rounded" />

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="bg-surface h-4 w-14 animate-pulse rounded" />
            <div className="bg-surface h-4 w-16 animate-pulse rounded" />
          </div>
          <div className="bg-surface h-8 w-8 animate-pulse rounded-md sm:hidden" />
          <div className="bg-surface hidden h-4 w-24 animate-pulse rounded sm:ml-2 sm:block" />
        </div>
      </div>

      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))] lg:grid-cols-[repeat(6,minmax(0,1fr))]">
        {Array.from({ length: 18 }).map((_, index) => (
          <div
            key={index}
            className="bg-surface aspect-[2/3] w-full animate-pulse rounded-sm"
          />
        ))}
      </div>
    </div>
  );
}
