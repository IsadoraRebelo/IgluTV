'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { AuthDialog } from '@/components';
import { useViewer } from '@/components/ViewerProvider/ViewerProvider';

import { pillLinkClass } from './pillLinkClass';

export function NavBarPillLinks({ isOverlay }: { isOverlay: boolean }) {
  const { username } = useViewer();
  const pathname = usePathname();
  const [authView, setAuthView] = useState<'login' | 'signup' | null>(null);

  if (!username) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthView('login')}
          className={pillLinkClass(false, isOverlay)}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => setAuthView('signup')}
          className={pillLinkClass(false, isOverlay)}
        >
          Sign Up
        </button>
        <AuthDialog
          open={authView !== null}
          onOpenChange={(open) => setAuthView(open ? authView : null)}
          initialView={authView ?? 'login'}
        />
      </>
    );
  }

  const items = [
    { href: '/tracking', label: 'Tracking' },
    { href: `/profile/${username}/diary`, label: 'Diary' },
    { href: `/profile/${username}/shows`, label: 'My Shows' },
    { href: `/profile/${username}/watchlist`, label: 'Watchlist' },
  ];

  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pillLinkClass(pathname === item.href, isOverlay)}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}
