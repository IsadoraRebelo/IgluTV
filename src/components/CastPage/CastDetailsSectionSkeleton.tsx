export function CastDetailsSectionSkeleton() {
  return (
    <>
      <div className="container-shell relative z-10 -mt-24 flex flex-col gap-2 pb-2 md:hidden">
        <div className="flex flex-col gap-1.5">
          <div className="bg-surface h-3 w-28 animate-pulse rounded" />
          <div className="bg-surface h-7 w-2/3 animate-pulse rounded" />
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          <div className="bg-surface h-3 w-full animate-pulse rounded" />
          <div className="bg-surface h-3 w-5/6 animate-pulse rounded" />
        </div>
        <div className="bg-surface mt-1 h-11 w-full animate-pulse rounded-sm" />
        <div className="bg-surface mt-2 h-7 w-36 animate-pulse rounded-md" />
      </div>

      <main className="container-shell flex-1 pt-5 md:pt-10 pb-5">
        <div className="grid grid-cols-1 gap-7 md:gap-10 lg:grid-cols-[1fr_260px]">
          <aside className="order-1 hidden flex-col gap-4 md:flex lg:order-2">
            <div className="bg-surface aspect-[3/4] w-full max-w-[230px] animate-pulse rounded-sm" />
            <div className="flex flex-col gap-1.5">
              <div className="bg-surface h-3 w-full animate-pulse rounded" />
              <div className="bg-surface h-3 w-full animate-pulse rounded" />
              <div className="bg-surface h-3 w-2/3 animate-pulse rounded" />
            </div>
            <div className="bg-surface h-7 w-36 animate-pulse rounded-md" />
            <div className="bg-surface h-11 w-full max-w-[230px] animate-pulse rounded-sm" />
          </aside>

          <div className="order-2 flex flex-col gap-5 lg:order-1">
            <div className="hidden flex-col gap-1.5 md:flex">
              <div className="bg-surface h-3 w-28 animate-pulse rounded" />
              <div className="bg-surface h-6 w-1/2 animate-pulse rounded" />
            </div>

            <div className="flex flex-col gap-3 md:gap-5">
              <div className="flex items-center justify-end gap-2">
                <div className="bg-surface h-8 w-24 animate-pulse rounded-md" />
                <div className="bg-surface h-8 w-24 animate-pulse rounded-md" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: 15 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-surface aspect-[2/3] w-full animate-pulse rounded-sm"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
