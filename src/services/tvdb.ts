'use server';

import { unstable_cache } from 'next/cache';

import { TVDB_API_BASE_URL } from '@/consts';
import type {
  CastMember,
  ShowDetails,
  TVDBLoginRaw,
  TVDBSearchResultRaw,
  TVDBSeriesExtendedRaw,
} from '@/types';
import { getCountryDisplayName, getLanguageDisplayName } from '@/utils';

async function fetchTvdbToken(): Promise<string> {
  // Throws (rather than returning null) on any failure so unstable_cache
  // never persists a bad token for its full 25-day window — a transient
  // /login failure would otherwise disable every show page until then.
  const apiKey = process.env.TVDB_API_KEY;
  if (!apiKey) {
    throw new Error('[tvdb] TVDB_API_KEY not set');
  }

  const res = await fetch(`${TVDB_API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: apiKey }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`[tvdb] login ${res.status}: ${res.statusText}`);
  }

  const json: TVDBLoginRaw = await res.json();
  const token = json.data?.token;
  if (!token) {
    throw new Error('[tvdb] login response missing token');
  }
  return token;
}

const getTvdbToken = unstable_cache(fetchTvdbToken, ['tvdb-token'], {
  revalidate: 60 * 60 * 24 * 25,
  tags: ['tvdb-token'],
});

function pickArtworkUrl(
  record: TVDBSeriesExtendedRaw,
  type: number
): string | null {
  const matches = (record.artworks ?? [])
    .filter((artwork) => artwork.type === type)
    .sort((a, b) => b.score - a.score);

  return matches[0]?.image ?? null;
}

function pickEnglishName(record: TVDBSeriesExtendedRaw): string {
  const englishName = record.translations?.nameTranslations?.find(
    (translation) => translation.language === 'eng'
  )?.name;
  return englishName ?? record.name;
}

function pickEnglishOverview(record: TVDBSeriesExtendedRaw): string {
  const englishOverview = record.translations?.overviewTranslations?.find(
    (translation) => translation.language === 'eng'
  )?.overview;
  return englishOverview ?? record.overview ?? '';
}

function mapCast(record: TVDBSeriesExtendedRaw): CastMember[] {
  return (record.characters ?? [])
    .filter((character) => character.peopleType === 'Actor')
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 8)
    .map((character) => ({
      actorName: character.personName,
      character: character.name,
      imageUrl: character.image ?? character.personImgURL,
    }));
}

async function fetchTvdbShowByName(
  name: string,
  year?: string
): Promise<ShowDetails | null> {
  try {
    const token = await getTvdbToken();

    const searchParams = new URLSearchParams({ query: name, type: 'series' });
    if (year) searchParams.set('year', year);

    const searchRes = await fetch(
      `${TVDB_API_BASE_URL}/search?${searchParams}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );

    if (!searchRes.ok) {
      console.warn(
        `[tvdb] search ${searchRes.status}: ${searchRes.statusText}`
      );
      return null;
    }

    const searchJson: { data?: TVDBSearchResultRaw[] } =
      await searchRes.json();
    const first = searchJson.data?.[0];
    if (!first) return null;

    const seriesId = first.id.replace('series-', '');

    const extendedRes = await fetch(
      `${TVDB_API_BASE_URL}/series/${seriesId}/extended?meta=translations`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );

    if (!extendedRes.ok) {
      console.warn(
        `[tvdb] extended ${extendedRes.status}: ${extendedRes.statusText}`
      );
      return null;
    }

    const extendedJson: { data?: TVDBSeriesExtendedRaw } =
      await extendedRes.json();
    const record = extendedJson.data;
    if (!record) return null;

    return {
      name: pickEnglishName(record),
      overview: pickEnglishOverview(record),
      year: record.year ?? null,
      // Prefer the "Background" artwork (type 3, 1920x1080 fanart) for the
      // hero image — it fits a wide backdrop far better than the "Banner"
      // artwork (type 1, a thin 758x140 strip).
      bannerUrl:
        pickArtworkUrl(record, 3) ??
        pickArtworkUrl(record, 1) ??
        record.image ??
        null,
      posterUrl: pickArtworkUrl(record, 2),
      genres: (record.genres ?? []).map((genre) => genre.name),
      network: record.originalNetwork?.name ?? null,
      cast: mapCast(record),
      status: record.status?.name ?? null,
      averageRuntime: record.averageRuntime ?? null,
      originalLanguage: getLanguageDisplayName(record.originalLanguage),
      originalCountry: getCountryDisplayName(record.originalCountry),
    };
  } catch (err) {
    console.warn('[tvdb] fetch failed', err);
    return null;
  }
}

export const getTvdbShowByName = unstable_cache(
  fetchTvdbShowByName,
  ['tvdb-show'],
  { revalidate: 3600, tags: ['tvdb-show'] }
);
