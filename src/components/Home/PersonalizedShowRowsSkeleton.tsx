function ShowCarouselRowSkeleton({
  titleWidthClassName,
}: {
  titleWidthClassName: string;
}) {
  return (
    <section>
      <div
        className={`bg-surface mb-2 h-5 animate-pulse rounded md:mb-4 ${titleWidthClassName}`}
      />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-surface aspect-[2/3] w-32 shrink-0 animate-pulse rounded-sm sm:w-40 lg:w-44"
          />
        ))}
      </div>
    </section>
  );
}

export function PersonalizedShowRowsSkeleton() {
  return (
    <>
      <ShowCarouselRowSkeleton titleWidthClassName="w-28" />
      <ShowCarouselRowSkeleton titleWidthClassName="w-24" />
    </>
  );
}
