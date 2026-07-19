export function ShowsSectionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="bg-surface h-6 w-16 animate-pulse rounded" />
        <div className="bg-surface hidden h-8 w-24 animate-pulse rounded-md sm:block" />
        <div className="bg-surface hidden h-8 w-24 animate-pulse rounded-md sm:block" />
      </div>

      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))] md:grid-cols-[repeat(4,minmax(0,1fr))] lg:grid-cols-[repeat(6,minmax(0,1fr))]">
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
