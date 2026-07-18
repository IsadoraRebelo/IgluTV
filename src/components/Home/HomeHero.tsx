import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { ShowSummary } from '@/types';

import { HomeSearchBar } from './HomeSearchBar';

export type HomeHeroShow = Pick<
  ShowSummary,
  'id' | 'name' | 'year' | 'genres'
>;

export function HomeHero({
  bannerUrl,
  show,
  overview,
  children,
}: {
  bannerUrl: string | null;
  show?: HomeHeroShow | null;
  overview?: string | null;
  children: ReactNode;
}) {
  const meta = show
    ? [show.year, ...show.genres.slice(0, 2)].filter(Boolean).join(' · ')
    : null;

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

      <div className="relative pt-5 pb-5 md:pb-10">
        <div className="mb-6">
          <HomeSearchBar />
        </div>

        {show ? (
          <div className="container-shell mb-5 md:mt-20">
            <div className="max-w-xl">
              <span className="bg-accent text-background inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase">
                #1 Trending
              </span>
              <h1 className="font-heading mt-4 text-4xl leading-[0.96] font-extrabold tracking-tight text-white sm:text-4xl">
                {show.name}
              </h1>
              {meta ? (
                <p className="text-text-primary/80 mt-3 text-sm font-medium sm:text-base">
                  {meta}
                </p>
              ) : null}
              {overview ? (
                <p className="text-text-primary/80 mt-3 line-clamp-2 text-sm leading-relaxed sm:line-clamp-3 sm:text-base">
                  {overview}
                </p>
              ) : null}
              <Link
                href={`/show/${show.id}`}
                className="bg-accent text-background mt-5 inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-transform hover:scale-[1.02] md:h-[40px] md:text-base"
              >
                View Show
              </Link>
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
