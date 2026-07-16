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
    <div className="relative w-full overflow-hidden bg-[#14181c]">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/60 to-[#14181c]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#14181c]/80 via-transparent to-[#14181c]/40" />
      </div>
      <div className="relative pt-24 pb-10 sm:pt-28">{children}</div>
    </div>
  );
}
