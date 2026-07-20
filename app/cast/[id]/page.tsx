import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { CastDetailsSectionSkeleton } from '@/components';
import { CastDetailsSection } from '@/components/CastPage/CastDetailsSection';

import { getTmdbPersonDetails } from '@/services/person';

export default async function CastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  if (Number.isNaN(numericId)) {
    notFound();
  }

  const person = await getTmdbPersonDetails(numericId);

  if (!person) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative mx-auto w-full max-w-6xl md:hidden">
        <div className="relative h-[400px] w-full overflow-hidden sm:h-[450px]">
          {person.profileUrl ? (
            <Image
              src={person.profileUrl}
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover object-top"
            />
          ) : null}
          <div className="from-background via-background/40 to-background/10 absolute inset-0 bg-gradient-to-t" />
          <div className="from-background to-background absolute inset-0 bg-gradient-to-r via-transparent" />
        </div>
      </div>

      <Suspense fallback={<CastDetailsSectionSkeleton />}>
        <CastDetailsSection numericId={numericId} person={person} />
      </Suspense>
    </div>
  );
}
