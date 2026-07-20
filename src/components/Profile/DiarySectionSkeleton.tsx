const ROWS_PER_MONTH = 4;

export function DiarySectionSkeleton() {
  return (
    <div className="flex flex-col gap-3 md:gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-1">
        <div className="bg-surface h-4 w-14 animate-pulse rounded" />
        <div className="flex items-center gap-2">
          <div className="bg-surface hidden h-7 w-28 animate-pulse rounded-md sm:block" />
          <div className="bg-surface hidden h-7 w-24 animate-pulse rounded-md sm:block" />
          <div className="bg-surface h-8 w-8 animate-pulse rounded-md" />
        </div>
      </div>

      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index}>
            {index % ROWS_PER_MONTH === 0 ? (
              <div className="flex items-center gap-2.5 py-3 sm:gap-3 sm:pt-5 sm:pb-2">
                <div className="bg-surface h-2.5 w-14 animate-pulse rounded" />
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>
            ) : null}
            <div className="flex items-center gap-3 rounded-lg border-b border-white/5 px-0.5 py-2.5 sm:gap-4 sm:px-2 sm:py-3">
              <div className="flex w-[30px] shrink-0 flex-col items-center gap-1 sm:w-10">
                <div className="bg-surface h-5 w-4 animate-pulse rounded sm:h-6" />
                <div className="bg-surface h-2 w-5 animate-pulse rounded" />
              </div>

              <div className="bg-surface aspect-[2/3] w-[38px] shrink-0 animate-pulse rounded-md sm:w-11" />

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="bg-surface h-3.5 w-1/3 animate-pulse rounded" />
                <div className="bg-surface h-3 w-1/5 animate-pulse rounded" />
              </div>

              <div className="bg-surface hidden h-3 w-14 animate-pulse rounded sm:block" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
