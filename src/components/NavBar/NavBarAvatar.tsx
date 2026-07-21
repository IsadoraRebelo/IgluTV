'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useViewer } from '@/components/ViewerProvider/ViewerProvider';

export function NavBarAvatar() {
  const { username, avatarUrl } = useViewer();

  if (!username) {
    return null;
  }

  return (
    <Link
      href={`/profile/${username}`}
      aria-label="Profile"
      className="bg-surface relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={username}
          fill
          sizes="32px"
          className="object-cover"
        />
      ) : (
        <span className="text-sm font-semibold text-white">
          {username.slice(0, 1).toUpperCase()}
        </span>
      )}
    </Link>
  );
}
