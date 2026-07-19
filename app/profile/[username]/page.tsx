import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import {
  ProfileOverviewSectionSkeleton,
  ProfileSettingsButton,
} from '@/components';
import { ProfileOverviewSection } from '@/components/Profile/ProfileOverviewSection';

import { getProfileByUsername } from '@/services/profile';
import { getRecentWatchedShowsForUser } from '@/services/tracking';
import { getShowSummary } from '@/services/tv-shows';
import { getViewerId } from '@/services/viewer';

const RECENT_ACTIVITY_LIMIT = 15;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) {
    return { title: 'IgluTV' };
  }

  return {
    title: `${profile.username} - IgluTV`,
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const [viewerId, recentRows] = await Promise.all([
    getViewerId(),
    getRecentWatchedShowsForUser(profile.id, RECENT_ACTIVITY_LIMIT),
  ]);
  const isOwner = viewerId === profile.id;

  // Mirrors the old `recentActivity[0]?.show.bannerUrl` fallback: walk the
  // recent-watch list in order and use the first show whose TMDB summary
  // resolves (cached, so typically zero or one extra request beyond the
  // banner-having case). Only needed when the profile has no custom banner.
  let bannerFallbackUrl: string | null = null;
  if (!profile.bannerUrl) {
    for (const row of recentRows) {
      const summary = await getShowSummary(row.tmdbShowId);
      if (summary?.bannerUrl) {
        bannerFallbackUrl = summary.bannerUrl;
        break;
      }
    }
  }
  const bannerUrl = profile.bannerUrl ?? bannerFallbackUrl;

  return (
    <div className="flex flex-1 flex-col">
      <div className="container-wide relative">
        <div className="relative h-[250px] w-full overflow-hidden md:h-[350px]">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt=""
              fill
              sizes="(max-width: 950px) 100vw, 950px"
              priority
              className="object-cover object-top"
            />
          ) : null}
          <div className="from-background via-background/40 to-background/10 absolute inset-0 bg-gradient-to-t" />
          <div className="from-background to-background absolute inset-0 bg-gradient-to-r via-transparent" />
          {isOwner ? (
            <ProfileSettingsButton
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              bannerUrl={bannerUrl}
            />
          ) : null}
        </div>

        <div className="mt-[-70px] flex items-end px-2 md:mt-[-50px] md:px-15">
          <div className="border-accent-foreground bg-surface relative h-18 w-18 shrink-0 overflow-hidden rounded-full border-1 md:h-20 md:w-20">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.username}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
                {profile.username.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="z-50 mb-2 ml-3">
            <h1 className="text-lg font-bold text-white md:text-xl">
              {profile.username}
            </h1>
          </div>
        </div>
      </div>

      <Suspense fallback={<ProfileOverviewSectionSkeleton />}>
        <ProfileOverviewSection profile={profile} recentRows={recentRows} />
      </Suspense>
    </div>
  );
}
