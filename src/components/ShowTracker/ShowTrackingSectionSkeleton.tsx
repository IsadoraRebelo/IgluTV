export function ShowTrackingSectionSkeleton() {
  return (
    <>
      <div className="absolute top-5 right-4 z-10 lg:hidden">
        <div className="bg-surface h-9 w-9 animate-pulse rounded-full" />
      </div>

      <div className="container-shell relative z-10 -mt-24">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
          <div className="bg-surface hidden h-[345px] w-[230px] shrink-0 animate-pulse rounded-md md:block" />

          <div className="flex flex-1 flex-col gap-2 pb-1 md:mt-5 md:gap-3">
            <div className="bg-surface h-7 w-2/3 animate-pulse rounded sm:h-8" />
            <div className="bg-surface h-3 w-1/3 animate-pulse rounded" />
            <div className="mt-1 flex flex-col gap-1.5">
              <div className="bg-surface h-3 w-full animate-pulse rounded" />
              <div className="bg-surface h-3 w-5/6 animate-pulse rounded" />
              <div className="bg-surface h-3 w-2/3 animate-pulse rounded" />
            </div>
            <div className="bg-surface mt-4 h-4 w-32 animate-pulse rounded" />
          </div>
        </div>

        <div className="bg-surface mt-2 h-7 w-full animate-pulse rounded-md md:h-5 md:w-[230px]" />
      </div>

      <main className="container-shell flex-1 pb-5">
        <div className="mt-2 grid grid-cols-1 gap-10 md:mt-5 md:mt-10 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="flex gap-6 border-b border-white/10 pb-3">
              <div className="bg-surface h-4 w-12 animate-pulse rounded" />
              <div className="bg-surface h-4 w-10 animate-pulse rounded" />
              <div className="bg-surface h-4 w-14 animate-pulse rounded" />
            </div>
            <div className="mt-5 flex flex-col gap-5 md:mt-6 md:gap-10">
              <div className="bg-surface h-24 w-full animate-pulse rounded-lg md:h-28" />
              <div className="flex flex-col gap-2">
                <div className="bg-surface h-5 w-28 animate-pulse rounded" />
                <div className="bg-surface h-14 w-full animate-pulse rounded-lg" />
                <div className="bg-surface h-14 w-full animate-pulse rounded-lg" />
              </div>
            </div>
          </div>

          <aside className="hidden h-fit flex-col gap-2 rounded-lg bg-white/[0.03] p-2 lg:flex">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="bg-surface h-9 w-full animate-pulse rounded-md"
              />
            ))}
          </aside>
        </div>
      </main>
    </>
  );
}
