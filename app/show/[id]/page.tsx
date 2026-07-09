import type { ComponentType } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import {
  Clock,
  Eye,
  Image as ImageIcon,
  ImagePlus,
  ListPlus,
  Pause,
  Pencil,
  Play,
  ThumbsUp,
  Trash2,
} from 'lucide-react';

import { SeasonAccordion, ShowOverview, ShowTabs } from '@/components';
import { getPopularTvShows, getTmdbShowFullDetails } from '@/services/tv-shows';
import { getTvdbShowByName } from '@/services/tvdb';
import type { ShowDetails, ShowMeta } from '@/types';

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
  const shows = await getPopularTvShows();
  // Shows on the homepage's curated top-10 already carry name/year here.
  // A show reached via a "Similar" link isn't in that list, so it's
  // resolved directly from TMDB by id below instead.
  const curatedShow = shows.find((s) => String(s.id) === id);
  const numericId = curatedShow?.id ?? Number(id);

  if (!curatedShow && Number.isNaN(numericId)) {
    return <ShowNotFound />;
  }

  const tmdbFull = await getTmdbShowFullDetails(numericId);

  if (!curatedShow && !tmdbFull) {
    return <ShowNotFound />;
  }

  const name = curatedShow?.name ?? tmdbFull!.details.name;
  const year =
    (curatedShow?.firstAirDate
      ? curatedShow.firstAirDate.slice(0, 4)
      : tmdbFull?.details.year) ?? undefined;

  const tvdbDetails = await getTvdbShowByName(name, year);

  const details: ShowDetails =
    tvdbDetails ??
    tmdbFull?.details ??
    (curatedShow
      ? {
          name: curatedShow.name,
          overview: curatedShow.overview,
          year: curatedShow.firstAirDate
            ? curatedShow.firstAirDate.slice(0, 4)
            : null,
          bannerUrl: null,
          posterUrl: curatedShow.posterUrl,
          genres: [],
          network: null,
          cast: [],
          status: null,
          averageRuntime: null,
          originalLanguage: null,
          originalCountry: null,
        }
      : {
          name,
          overview: '',
          year: year ?? null,
          bannerUrl: null,
          posterUrl: null,
          genres: [],
          network: null,
          cast: [],
          status: null,
          averageRuntime: null,
          originalLanguage: null,
          originalCountry: null,
        });

  const meta: ShowMeta | null = tmdbFull?.meta ?? null;

  const metaLineParts = [
    details.year,
    meta?.numberOfSeasons
      ? `${meta.numberOfSeasons} season${meta.numberOfSeasons === 1 ? '' : 's'}`
      : null,
    details.averageRuntime ? `${details.averageRuntime}m` : null,
    details.genres.length > 0 ? details.genres.join(', ') : null,
    meta?.contentRating ?? null,
  ].filter((part): part is string => Boolean(part));

  return (
    <div className="flex flex-1 flex-col bg-[#14181c] font-sans antialiased">
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="relative h-[220px] w-full overflow-hidden sm:h-[450px]">
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
        </div>

        <div className="relative z-10 mx-auto -mt-24 w-full max-w-[950px] px-2 sm:-mt-32">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div className="relative h-[345px] w-[230px] shrink-0 overflow-hidden rounded-md shadow-2xl ring-1 ring-white/10">
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

            <div className="flex flex-1 flex-col gap-2 pb-1">
              <h1 className="text-2xl mt-5 font-semibold tracking-tight text-white sm:text-3xl">
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

      <main className="mx-auto w-full max-w-[950px] flex-1 pb-20">
        <div className="mt-10 grid grid-cols-1 gap-10 px-2 lg:grid-cols-[1fr_260px]">
          <div>
            <ShowTabs
              home={
                <HomeTab
                  showId={numericId}
                  meta={meta}
                  genres={details.genres}
                  status={details.status}
                  averageRuntime={details.averageRuntime}
                  originalLanguage={details.originalLanguage}
                  originalCountry={details.originalCountry}
                />
              }
              cast={<CastTab cast={details.cast} />}
              similar={<SimilarTab shows={meta?.similar ?? []} />}
            />
          </div>

          <aside className="flex h-fit flex-col gap-1 rounded-lg bg-white/[0.03] p-2">
            <ActionItem icon={Play} label="Currently watching" />
            <ActionItem icon={Eye} label="Mark watched" />
            <ActionItem icon={Clock} label="Add to watchlist" />
            <ActionItem icon={Pencil} label="Add rating / log" />
            <ActionItem icon={Pause} label="Pause" />
            <ActionItem icon={Trash2} label="Drop" />
            <ActionItem icon={ThumbsUp} label="Recommend to friends" />
            <ActionItem icon={ListPlus} label="Add to list" />
            <ActionItem icon={ImageIcon} label="Change poster" />
            <ActionItem icon={ImagePlus} label="Change banner" />
          </aside>
        </div>
      </main>
    </div>
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

function ActionItem({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c2d0dd] hover:bg-white/5">
      <Icon className="h-4 w-4 text-[#8a9bab]" />
      {label}
    </div>
  );
}

function HomeTab({
  showId,
  meta,
  genres,
  status,
  averageRuntime,
  originalLanguage,
  originalCountry,
}: {
  showId: number;
  meta: ShowMeta | null;
  genres: string[];
  status: string | null;
  averageRuntime: number | null;
  originalLanguage: string | null;
  originalCountry: string | null;
}) {
  return (
    <div className="flex flex-col gap-10">
      {meta?.latestEpisode ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">
            Latest episode
          </h2>
          <div className="flex gap-4">
            <div className="relative h-[84px] w-[150px] shrink-0 overflow-hidden rounded-md bg-[#2c3440]">
              {meta.latestEpisode.imageUrl ? (
                <Image
                  src={meta.latestEpisode.imageUrl}
                  alt={meta.latestEpisode.name}
                  fill
                  sizes="150px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium text-white">
                {meta.latestEpisode.name}
              </p>
              <p className="text-xs text-[#8a9bab]">
                {[
                  `S${String(meta.latestEpisode.seasonNumber).padStart(2, '0')} E${String(
                    meta.latestEpisode.episodeNumber
                  ).padStart(2, '0')}`,
                  formatDate(meta.latestEpisode.airDate),
                  meta.latestEpisode.runtime
                    ? `${meta.latestEpisode.runtime}m`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {meta && meta.seasons.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">
            Seasons ({meta.numberOfSeasons ?? meta.seasons.length})
          </h2>
          <SeasonAccordion showId={showId} seasons={meta.seasons} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Details</h2>
        <div className="flex flex-col divide-y divide-white/10 text-sm">
          <DetailRow label="Seasons" value={meta?.numberOfSeasons} />
          <DetailRow label="Episodes" value={meta?.numberOfEpisodes} />
          <DetailRow
            label="Average run time"
            value={averageRuntime ? `${averageRuntime} minutes` : null}
          />
          <DetailRow
            label="Next episode"
            value={formatDate(meta?.nextEpisodeDate)}
          />
          <DetailRow label="Premiere" value={formatDate(meta?.premiereDate)} />
          <DetailRow
            label="Last aired"
            value={formatDate(meta?.lastAiredDate)}
          />
          <DetailRow label="Status" value={status} />
          <DetailRow label="Original language" value={originalLanguage} />
          <DetailRow label="Country" value={originalCountry} />
          <DetailRow
            label="Genres"
            value={genres.length > 0 ? genres.join(', ') : null}
          />
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
