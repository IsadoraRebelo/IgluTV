import Image from 'next/image';
import Link from 'next/link';

import type { PersonSearchResult, TvShowSearchResult } from '@/types';

export function ShowResultRow({ show }: { show: TvShowSearchResult }) {
  const year = show.firstAirDate ? show.firstAirDate.slice(0, 4) : null;

  return (
    <Link
      href={`/show/${show.id}`}
      className="flex gap-4 rounded-md p-2 hover:bg-white/5"
    >
      <div className="relative h-[105px] w-[70px] shrink-0 overflow-hidden rounded-sm bg-[#2c3440]">
        {show.posterUrl ? (
          <Image
            src={show.posterUrl}
            alt={show.name}
            fill
            sizes="70px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1">
        <h3 className="text-base font-semibold text-white">
          {show.name}
          {year ? (
            <span className="ml-2 text-sm font-normal text-[#8a9bab]">
              {year}
            </span>
          ) : null}
        </h3>
        {show.originalName ? (
          <p className="truncate text-sm text-[#8a9bab]">
            Original title: {show.originalName}
          </p>
        ) : null}
        {show.overview ? (
          <p className="line-clamp-2 text-sm text-[#8a9bab]">{show.overview}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function PersonResultRow({ person }: { person: PersonSearchResult }) {
  return (
    <Link
      href={`/cast/${person.id}`}
      className="flex gap-4 rounded-md p-2 hover:bg-white/5"
    >
      <div className="relative h-[70px] w-[70px] shrink-0 overflow-hidden rounded-full bg-[#2c3440]">
        {person.profileUrl ? (
          <Image
            src={person.profileUrl}
            alt={person.name}
            fill
            sizes="70px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1">
        <h3 className="text-base font-semibold text-white">{person.name}</h3>
        {person.knownForNames.length > 0 ? (
          <p className="max-w-md truncate text-sm text-[#8a9bab]">
            Known for: {person.knownForNames.join(', ')}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
