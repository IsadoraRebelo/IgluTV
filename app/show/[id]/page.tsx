import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ShowTrackingSectionSkeleton } from '@/components';
import { ShowTrackingSection } from '@/components/ShowTracker/ShowTrackingSection';

import { getTmdbShowFullDetails } from '@/services/tv-shows';
import { getViewerId } from '@/services/viewer';

import type { ShowDetails, ShowMeta } from '@/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return { title: 'IgluTV' };
  }

  const tmdbFull = await getTmdbShowFullDetails(numericId);
  if (!tmdbFull) {
    return { title: 'IgluTV' };
  }

  return {
    title: `${tmdbFull.details.name} - IgluTV`,
  };
}

export default async function ShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  if (Number.isNaN(numericId)) {
    notFound();
  }

  const viewerId = await getViewerId();
  const tmdbFull = await getTmdbShowFullDetails(numericId, viewerId);
  if (!tmdbFull) {
    notFound();
  }

  const details: ShowDetails = tmdbFull.details;
  const meta: ShowMeta | null = tmdbFull.meta ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="relative h-[400px] w-full overflow-hidden sm:h-[450px]">
          {details.bannerUrl ? (
            <Image
              src={details.bannerUrl}
              alt=""
              fill
              sizes="(min-width: 1152px) 1152px, 100vw"
              priority
              className="object-cover object-top"
            />
          ) : null}
          <div className="from-background via-background/40 to-background/10 absolute inset-0 bg-gradient-to-t" />
          <div className="from-background to-background absolute inset-0 bg-gradient-to-r via-transparent" />
        </div>

        <Suspense fallback={<ShowTrackingSectionSkeleton />}>
          <ShowTrackingSection
            showId={numericId}
            details={details}
            meta={meta}
          />
        </Suspense>
      </div>
    </div>
  );
}
