export function SearchResultsSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-4 p-1 md:p-2">
          <div className="bg-surface h-[105px] w-[70px] shrink-0 animate-pulse rounded-sm" />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <div className="bg-surface h-4 w-2/3 animate-pulse rounded" />
            <div className="bg-surface h-3 w-1/3 animate-pulse rounded" />
            <div className="bg-surface h-3 w-full animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
