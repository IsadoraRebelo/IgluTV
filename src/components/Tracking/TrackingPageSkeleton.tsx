function TrackingRowSkeleton() {
  return (
    <div className="flex items-stretch overflow-hidden rounded-lg bg-white/[0.03]">
      <div className="bg-surface aspect-square w-25 shrink-0 animate-pulse sm:w-30" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4">
        <div className="bg-surface h-5 w-24 animate-pulse rounded-full" />
        <div className="flex flex-col gap-1.5">
          <div className="bg-surface h-3.5 w-16 animate-pulse rounded" />
          <div className="bg-surface h-3.5 w-2/3 animate-pulse rounded" />
        </div>
      </div>
      <div className="flex shrink-0 items-center pr-3 pl-1">
        <div className="bg-surface h-9 w-9 animate-pulse rounded-full" />
      </div>
    </div>
  );
}

function TrackingStatsPillsSkeleton() {
  return (
    <div className="flex gap-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex-1 rounded-md border border-white/[0.07] bg-white/5 py-1.5 text-center"
        >
          <div className="bg-surface mx-auto h-4 w-14 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

function TrackingSidebarStatsSkeleton() {
  return (
    <div className="hidden h-fit flex-col gap-1 rounded-lg bg-white/[0.03] p-2 lg:flex">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2 rounded-md px-3 py-2.5"
        >
          <div className="bg-surface h-4 w-4 shrink-0 animate-pulse rounded" />
          <div className="bg-surface h-3.5 w-32 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

function TrackingTabSkeleton({ active }: { active: boolean }) {
  return (
    <div
      className={`-mb-px flex-1 border-b-2 px-1 py-3 text-center lg:flex-none lg:px-0.5 lg:py-2 ${
        active ? 'border-accent' : 'border-transparent'
      }`}
    >
      <div className="bg-surface mx-auto h-4 w-16 animate-pulse rounded lg:mx-0 lg:h-3.5 lg:w-14" />
    </div>
  );
}

export function TrackingPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="container-narrow flex-1 pb-20">
        <div className="mt-5">
          <div className="mb-3.5 lg:hidden">
            <TrackingStatsPillsSkeleton />
          </div>

          <div className="mb-3.5 flex border-b border-white/[0.07] lg:mb-6 lg:items-end lg:justify-between lg:border-white/[0.08]">
            <div className="flex flex-1 lg:flex-none lg:gap-7">
              <TrackingTabSkeleton active />
              <TrackingTabSkeleton active={false} />
            </div>
            <div className="bg-surface hidden h-[19px] w-[19px] animate-pulse rounded lg:block" />
          </div>

          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_260px]">
            <div>
              <div className="mb-3 overflow-hidden rounded-lg bg-white/[0.03]">
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="bg-surface h-5 w-36 animate-pulse rounded" />
                  <div className="bg-surface h-6 w-6 shrink-0 animate-pulse rounded" />
                </div>
              </div>

              <div className="overflow-hidden rounded-lg bg-white/[0.03]">
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="bg-surface h-5 w-24 animate-pulse rounded" />
                  <div className="bg-surface h-6 w-6 shrink-0 animate-pulse rounded" />
                </div>
                <div className="bg-accent h-1 w-full" />
                <div className="flex flex-col gap-2 p-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <TrackingRowSkeleton key={index} />
                  ))}
                </div>
              </div>
            </div>

            <TrackingSidebarStatsSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
}
