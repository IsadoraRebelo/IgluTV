'use client';

import Link from 'next/link';

import { useViewer } from '@/components/ViewerProvider/ViewerProvider';

import { cn } from '@/utils';

export function NavBarShowsLink({ isOverlay }: { isOverlay: boolean }) {
  const { username } = useViewer();
  if (!username) return null;

  return (
    <Link
      href={`/profile/${username}/shows`}
      className={cn(
        'transition-colors',
        isOverlay
          ? 'text-white/80 hover:text-white'
          : 'text-foreground/80 hover:text-foreground'
      )}
    >
      Shows
    </Link>
  );
}
