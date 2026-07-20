import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/utils';

type ProfileTab = 'shows' | 'diary' | 'watchlist';

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'shows', label: 'Shows' },
  { id: 'diary', label: 'Diary' },
  { id: 'watchlist', label: 'Watchlist' },
];

export function ProfileSubNav({
  username,
  avatarUrl,
  active,
}: {
  username: string;
  avatarUrl: string | null;
  active: ProfileTab;
}) {
  return (
    <div className="mb-5 hidden md:flex items-center gap-6 rounded-sm bg-[#181f26] px-4 py-3">
      <Link
        href={`/profile/${username}`}
        className="flex shrink-0 items-center gap-2"
      >
        <div className="bg-surface relative h-6 w-6 shrink-0 overflow-hidden rounded-full">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={username}
              fill
              sizes="36px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
              {username.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <span className="text-sm font-bold text-white">{username}</span>
      </Link>

      <nav className="flex flex-1 items-center justify-end gap-5">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/profile/${username}/${tab.id}`}
            className={cn(
              'text-xs font-semibold tracking-wide uppercase',
              tab.id === active ? 'text-accent' : 'text-text-tertiary'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
