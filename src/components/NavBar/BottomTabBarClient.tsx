'use client';

import { ListChecks } from 'lucide-react';
import { TvIcon, UserIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { AuthDialog } from '@/components';
import { useViewer } from '@/components/ViewerProvider/ViewerProvider';

import { cn } from '@/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: TvIcon },
  { href: '/tracking', label: 'Shows', icon: ListChecks },
];

export function BottomTabBarClient() {
  const pathname = usePathname();
  const { username } = useViewer();
  const [authOpen, setAuthOpen] = useState(false);
  const profileHref = username ? `/profile/${username}` : null;

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className="bg-background/85 fixed inset-x-0 bottom-0 z-40 gap-20 flex items-start justify-center border-t border-white/7 px-6 pt-2.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 px-2',
              isActive(href) ? 'text-accent' : 'text-text-secondary'
            )}
          >
            <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        ))}

        {profileHref ? (
          <Link
            href={profileHref}
            className={cn(
              'flex flex-col items-center gap-1 px-2',
              isActive('/profile') ? 'text-accent' : 'text-text-secondary'
            )}
          >
            <UserIcon className="h-[22px] w-[22px]" strokeWidth={2} />
            <span className="text-[10px] font-semibold">Profile</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="text-text-secondary flex flex-col items-center gap-1 px-2"
          >
            <UserIcon className="h-[22px] w-[22px]" strokeWidth={2} />
            <span className="text-[10px] font-semibold">Profile</span>
          </button>
        )}
      </nav>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
