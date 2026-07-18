import {
  ClockIcon,
  EyeIcon,
  HeartIcon,
  PauseIcon,
  PlayIcon,
  RocketLaunchIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import { Image as ImageIcon, ImagePlus } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  DetailRow,
  PosterCard,
  ShowActionsMenu,
  ShowActionsSidebar,
  ShowOverview,
  ShowProgressBar,
  ShowTabs,
  ShowTracker,
  ShowTrackingProvider,
  WatchProviders,
} from '@/components';

import { getUserCountry } from '@/services/profile';
import { getShowTracking, getWatchedEpisodes } from '@/services/tracking';
import {
  getTmdbShowFullDetails,
  getTmdbWatchProviders,
} from '@/services/tv-shows';
import { getViewer } from '@/services/viewer';

import type { ShowDetails, ShowMeta, ShowStatus } from '@/types';

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
    icon: <EyeIcon className="text-text-secondary h-4 w-4 md:h-5 md:w-5" />,
    reviveIcon: (
      <PlayIcon className="text-text-secondary h-4 w-4 md:h-5 md:w-5" />
    ),
    finishedIcon: (
      <RocketLaunchIcon className="h-4 w-4 text-yellow-500 md:h-5 md:w-5" />
    ),
    label: 'Watched',
    activeColor: '[&_svg]:!text-accent',
  },
  {
    id: 'favourite',
    icon: <HeartIcon className="text-text-secondary h-4 w-4 md:h-5 md:w-5" />,
    label: 'Favourite',
    activeColor: '[&_svg]:!text-red-500',
  },
  {
    id: '1',
    status: 'watch_later',
    icon: <ClockIcon className="text-text-secondary h-4 w-4 md:h-5 md:w-5" />,
    label: 'Add to watchlist',
    activeColor: '[&_svg]:!text-accent-foreground',
  },
  {
    id: '2',
    status: 'paused',
    icon: <PauseIcon className="text-text-secondary h-4 w-4 md:h-5 md:w-5" />,
    label: 'Pause',
    activeColor: '[&_svg]:!text-paused',
  },
  {
    id: '3',
    status: 'dropped',
    icon: <TrashIcon className="text-text-secondary h-4 w-4 md:h-5 md:w-5" />,
    label: 'Drop',
    activeColor: '[&_svg]:!text-dropped',
  },
  {
    icon: <ImageIcon className="text-text-secondary h-4 w-4 md:h-5 md:w-5" />,
    label: 'Change poster',
  },
  {
    icon: <ImagePlus className="text-text-secondary h-4 w-4 md:h-5 md:w-5" />,
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
    notFound();
  }

  const [
    tmdbFull,
    watchedEpisodes,
    tracking,
    viewer,
    watchProviders,
    userCountry,
  ] = await Promise.all([
    getTmdbShowFullDetails(numericId),
    getWatchedEpisodes(numericId),
    getShowTracking(numericId),
    getViewer(),
    getTmdbWatchProviders(numericId),
    getUserCountry(),
  ]);
  const isLoggedIn = viewer !== null;

  if (!tmdbFull) {
    notFound();
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
      initialIsFavourite={tracking?.isFavourite ?? false}
      tmdbStatus={details.status}
      isLoggedIn={isLoggedIn}
    >
      <div className="flex flex-1 flex-col">
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
            <div className="from-background via-background/40 to-background/10 absolute inset-0 bg-gradient-to-t" />
            <div className="from-background to-background absolute inset-0 bg-gradient-to-r via-transparent" />
            <div className="absolute top-15 right-4 z-10 sm:top-24 sm:right-6 lg:hidden">
              <ShowActionsMenu actions={SHOW_ACTIONS} />
            </div>
          </div>

          <div className="container-narrow relative z-10 -mt-24 sm:-mt-32">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
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
                  <div className="bg-surface text-text-faint flex h-full w-full items-center justify-center text-xs">
                    No poster
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col pb-1 md:gap-2">
                <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {details.name}
                </h1>
                {metaLineParts.length > 0 ? (
                  <p className="text-text-secondary text-sm">
                    {metaLineParts.join(' · ')}
                  </p>
                ) : null}
                {details.overview ? (
                  <ShowOverview text={details.overview} />
                ) : null}
                <WatchProviders
                  providers={watchProviders}
                  initialCountry={userCountry}
                  isLoggedIn={isLoggedIn}
                />
              </div>
            </div>

            <ShowProgressBar
              seasons={meta?.seasons ?? []}
              className="mt-2 w-full md:w-[230px]"
            />
          </div>
        </div>

        <main className="container-narrow flex-1 pb-20">
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
        <h2 className="mb-3 px-1 text-lg font-semibold text-white">Details</h2>
        <div className="flex flex-col divide-y divide-white/10 px-1 text-sm">
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
          <DetailRow
            label="Genres"
            value={details.genres.length ? details.genres.join(', ') : null}
          />
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

function CastTab({ cast }: { cast: ShowDetails['cast'] }) {
  if (cast.length === 0) {
    return (
      <p className="text-text-faint text-sm">No cast information available.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {cast.map((member) => (
        <PosterCard
          key={member.actorId}
          variant="overlay"
          href={`/cast/${member.actorId}`}
          posterUrl={member.imageUrl}
          imageAlt={member.actorName}
          sizes="(max-width: 640px) 33vw, 20vw"
          overlay={{ title: member.actorName, subtitle: member.character }}
        />
      ))}
    </div>
  );
}

function SimilarTab({ shows }: { shows: ShowMeta['similar'] }) {
  if (shows.length === 0) {
    return <p className="text-text-faint text-sm">No similar shows found.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {shows.map((similarShow) => (
        <PosterCard
          key={similarShow.id}
          show={similarShow}
          sizes="(max-width: 640px) 33vw, 20vw"
        />
      ))}
    </div>
  );
}
