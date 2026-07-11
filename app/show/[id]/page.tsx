import {
  EyeIcon,
  PauseIcon,
  PlayIcon,
  RocketLaunchIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import { Clock, Image as ImageIcon, ImagePlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import {
  ShowActionsMenu,
  ShowActionsSidebar,
  ShowOverview,
  ShowTabs,
  ShowTracker,
  ShowTrackingProvider,
} from '@/components';

import { getShowTracking, getWatchedEpisodes } from '@/services/tracking';
import { getTmdbShowFullDetails } from '@/services/tv-shows';

import { createClient } from '@/supabase/server';

import type { ShowDetails, ShowMeta, ShowStatus } from '@/types';
import type { ReactNode } from 'react';

const SHOW_ACTIONS: {
  id?: string;
  status?: ShowStatus;
  icon: ReactNode;
  reviveIcon?: ReactNode;
  finishedIcon?: ReactNode;
  label: string;
  activeColor?: string;
}[] = [
  {
    id: 'mark-watched',
    icon: <EyeIcon className="h-4 w-4 text-[#8a9bab] md:h-5 md:w-5" />,
    reviveIcon: <PlayIcon className="h-4 w-4 text-[#8a9bab] md:h-5 md:w-5" />,
    finishedIcon: (
      <RocketLaunchIcon className="h-4 w-4 text-yellow-500 md:h-5 md:w-5" />
    ),
    label: 'Mark watched',
    activeColor: '[&_svg]:!text-green-500',
  },
  {
    id: '1',
    status: 'watch_later',
    icon: <Clock className="h-4 w-4 text-[#8a9bab] md:h-5 md:w-5" />,
    label: 'Add to watchlist',
    activeColor: '[&_svg]:!text-green-500',
  },
  {
    id: '2',
    status: 'paused',
    icon: <PauseIcon className="h-4 w-4 text-[#8a9bab] md:h-5 md:w-5" />,
    label: 'Pause',
    activeColor: '[&_svg]:!text-red-500',
  },
  {
    id: '3',
    status: 'dropped',
    icon: <TrashIcon className="h-4 w-4 text-[#8a9bab] md:h-5 md:w-5" />,
    label: 'Drop',
    activeColor: '[&_svg]:!text-gray-200',
  },
  {
    icon: <ImageIcon className="h-4 w-4 text-[#8a9bab] md:h-5 md:w-5" />,
    label: 'Change poster',
  },
  {
    icon: <ImagePlus className="h-4 w-4 text-[#8a9bab] md:h-5 md:w-5" />,
    label: 'Change banner',
  },
];

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function ShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  if (Number.isNaN(numericId)) {
    return <ShowNotFound />;
  }

  const supabase = await createClient();
  const [tmdbFull, watchedEpisodes, tracking, userResult] = await Promise.all([
    getTmdbShowFullDetails(numericId),
    getWatchedEpisodes(numericId),
    getShowTracking(numericId),
    supabase.auth.getUser(),
  ]);
  const isLoggedIn = userResult.data.user !== null;

  if (!tmdbFull) {
    return <ShowNotFound />;
  }

  const details: ShowDetails = tmdbFull.details;

  const meta: ShowMeta | null = tmdbFull.meta ?? null;

  const metaLineParts = [
    details.year,
    meta?.numberOfSeasons
      ? `${meta.numberOfSeasons} season${meta.numberOfSeasons === 1 ? '' : 's'}`
      : null,
    details.averageRuntime ? `${details.averageRuntime}m` : null,
    details.contentRating,
  ].filter((part): part is string => Boolean(part));

  return (
    <ShowTrackingProvider
      showId={numericId}
      seasons={meta?.seasons ?? []}
      watchedEpisodes={watchedEpisodes}
      skipCatchUpPrompt={tracking?.skipCatchUpPrompt ?? false}
      initialStatus={tracking?.status ?? null}
      tmdbStatus={details.status}
      isLoggedIn={isLoggedIn}
    >
      <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
        <div className="relative mx-auto w-full max-w-6xl">
          <div className="relative h-[200px] w-full overflow-hidden sm:h-[450px]">
            {details.bannerUrl ? (
              <Image
                src={details.bannerUrl}
                alt=""
                fill
                sizes="100vw"
                priority
                className="object-cover object-top"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/40 to-[#14181c]/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#14181c] via-transparent to-[#14181c]" />
            <Link
              href="/"
              className="absolute top-4 left-4 z-10 text-sm text-white/70 transition-colors hover:text-white sm:top-6 sm:left-6"
            >
              ← Back to home
            </Link>
            <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6 lg:hidden">
              <ShowActionsMenu actions={SHOW_ACTIONS} />
            </div>
          </div>

          <div className="relative z-10 mx-auto -mt-24 w-full max-w-[950px] px-2 px-5 sm:-mt-32 md:px-0">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              <div className="relative hidden h-[345px] w-[230px] shrink-0 overflow-hidden rounded-md shadow-2xl ring-1 ring-white/10 md:block">
                {details.posterUrl ? (
                  <Image
                    src={details.posterUrl}
                    alt={details.name}
                    fill
                    sizes="230px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#2c3440] text-xs text-[#678]">
                    No poster
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col pb-1 md:gap-2">
                <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {details.name}
                </h1>
                {metaLineParts.length > 0 ? (
                  <p className="text-sm text-[#8a9bab]">
                    {metaLineParts.join(' · ')}
                  </p>
                ) : null}
                {details.overview ? (
                  <ShowOverview text={details.overview} />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-[950px] flex-1 px-5 pb-20 md:px-0">
          <div className="mt-6 grid grid-cols-1 gap-10 md:mt-10 lg:grid-cols-[1fr_260px]">
            <div>
              <ShowTabs
                home={<HomeTab meta={meta} details={details} />}
                cast={<CastTab cast={details.cast} />}
                similar={<SimilarTab shows={meta?.similar ?? []} />}
              />
            </div>

            <aside className="hidden h-fit flex-col gap-1 rounded-lg bg-white/[0.03] p-2 lg:flex">
              <ShowActionsSidebar actions={SHOW_ACTIONS} />
            </aside>
          </div>
        </main>
      </div>
    </ShowTrackingProvider>
  );
}

function ShowNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#14181c] px-6 py-24 text-center">
      <p className="text-[#9ab0bf]">Show not found.</p>
      <Link
        href="/"
        className="mt-4 text-sm text-[#678] underline hover:text-[#9ab0bf]"
      >
        Back to home
      </Link>
    </div>
  );
}

function HomeTab({
  meta,
  details,
}: {
  meta: ShowMeta | null;
  details: ShowDetails;
}) {
  return (
    <div className="flex flex-col gap-7 md:gap-10">
      <ShowTracker
        seasons={meta?.seasons ?? []}
        cast={details.cast}
        meta={meta}
        details={details}
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Details</h2>
        <div className="flex flex-col divide-y divide-white/10 text-sm">
          <DetailRow label="Seasons" value={meta?.numberOfSeasons} />
          <DetailRow label="Episodes" value={meta?.numberOfEpisodes} />
          <DetailRow
            label="Average run time"
            value={
              details.averageRuntime
                ? `${details.averageRuntime} minutes`
                : null
            }
          />
          <DetailRow
            label="Next episode"
            value={formatDate(details.nextEpisodeDate)}
          />
          <DetailRow
            label="Premiere"
            value={formatDate(details.premiereDate)}
          />
          <DetailRow
            label="Last aired"
            value={formatDate(details.lastAiredDate)}
          />
          <DetailRow label="Status" value={details.status} />
          <DetailRow label="Network" value={details.network} />
          <DetailRow
            label="Original language"
            value={details.originalLanguage}
          />
          <DetailRow label="Country" value={details.originalCountry} />
        </div>
      </section>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[#8a9bab]">{label}</span>
      <span className="text-[#c2d0dd]">{value}</span>
    </div>
  );
}

function CastTab({ cast }: { cast: ShowDetails['cast'] }) {
  if (cast.length === 0) {
    return (
      <p className="text-sm text-[#678]">No cast information available.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
      {cast.map((member) => (
        <div
          key={`${member.actorName}-${member.character}`}
          className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-[#2c3440]"
        >
          {member.imageUrl ? (
            <Image
              src={member.imageUrl}
              alt={member.actorName}
              fill
              sizes="(max-width: 640px) 33vw, 20vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute right-0 bottom-0 left-0 p-3">
            <div className="truncate text-base font-semibold text-white">
              {member.actorName}
            </div>
            <div className="truncate text-xs tracking-wide text-white/70 uppercase">
              {member.character}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimilarTab({ shows }: { shows: ShowMeta['similar'] }) {
  if (shows.length === 0) {
    return <p className="text-sm text-[#678]">No similar shows found.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
      {shows.map((similarShow) => (
        <Link
          key={similarShow.id}
          href={`/show/${similarShow.id}`}
          className="flex flex-col gap-2"
        >
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-[#2c3440]">
            {similarShow.posterUrl ? (
              <Image
                src={similarShow.posterUrl}
                alt={similarShow.name}
                fill
                sizes="(max-width: 640px) 33vw, 20vw"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs text-[#c2d0dd]">
              {similarShow.name}
            </p>
            {similarShow.matchPercentage !== null ? (
              <span className="shrink-0 text-xs text-[#8a9bab]">
                {similarShow.matchPercentage}%
              </span>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
