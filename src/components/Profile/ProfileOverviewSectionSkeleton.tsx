function StatTileSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-0 py-1 md:bg-white/[0.03] md:px-4 md:py-4">
      <div className="bg-surface h-11 w-11 shrink-0 animate-pulse rounded-xl" />
      <div className="flex flex-col gap-1.5">
        <div className="bg-surface h-4 w-12 animate-pulse rounded" />
        <div className="bg-surface h-2.5 w-16 animate-pulse rounded" />
      </div>
    </div>
  );
}

function PosterGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-surface aspect-[2/3] w-full animate-pulse rounded-sm"
        />
      ))}
    </div>
  );
}

export function ProfileOverviewSectionSkeleton() {
  return (
    <main className="container-shell flex-1 pb-5">
      <div className="mt-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatTileSkeleton key={index} />
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:mt-10 md:gap-10 lg:grid-cols-[1fr_260px]">
        <div className="flex min-w-0 flex-col gap-5 md:gap-10">
          <section>
            <div className="bg-surface mb-2 h-4 w-32 animate-pulse rounded md:mb-4" />
            <PosterGridSkeleton count={4} />
          </section>

          <section className="min-w-0">
            <div className="mb-2 flex items-center justify-between md:mb-4">
              <div className="bg-surface h-4 w-20 animate-pulse rounded" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-surface aspect-[2/3] w-32 shrink-0 animate-pulse rounded-sm"
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="hidden flex-col gap-5 md:flex md:gap-10">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="bg-surface h-4 w-20 animate-pulse rounded" />
            </div>
            <div className="flex gap-2 overflow-x-auto pt-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-surface aspect-[2/3] w-14 shrink-0 animate-pulse rounded-md"
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="bg-surface h-4 w-14 animate-pulse rounded" />
            </div>
            <div className="flex flex-col gap-3 py-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="bg-surface h-5 w-10 shrink-0 animate-pulse rounded-md" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="bg-surface h-3.5 w-3/4 animate-pulse rounded" />
                    <div className="bg-surface h-3.5 w-1/2 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
