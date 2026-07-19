export function DiarySectionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="bg-surface h-6 w-16 animate-pulse rounded" />
        <div className="bg-surface hidden h-8 w-24 animate-pulse rounded-md sm:block" />
        <div className="bg-surface hidden h-8 w-24 animate-pulse rounded-md sm:block" />
      </div>

      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-white/5 py-3"
          >
            <div className="bg-surface h-8 w-14 shrink-0 animate-pulse rounded-md" />
            <div className="bg-surface aspect-[2/3] w-10 shrink-0 animate-pulse rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="bg-surface h-3.5 w-1/3 animate-pulse rounded" />
              <div className="bg-surface h-3 w-1/5 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
