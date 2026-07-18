import Image from 'next/image';
import type { ReactNode } from 'react';

export function HomeHero({
  bannerUrl,
  children,
}: {
  bannerUrl: string | null;
  children: ReactNode;
}) {
  return (
    <div className="bg-background relative w-full overflow-hidden">
      <div className="absolute inset-0">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
        <div className="from-background via-background/60 to-background/20 absolute inset-0 bg-gradient-to-t" />
        <div className="from-background/80 to-background/40 absolute inset-0 bg-gradient-to-r via-transparent" />
      </div>
      <div className="relative pt-24 pb-10 sm:pt-28">{children}</div>
    </div>
  );
}
