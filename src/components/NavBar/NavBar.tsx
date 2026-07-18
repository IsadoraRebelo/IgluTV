import { Suspense } from 'react';

import { NavBarClient } from './NavBarClient';

export function NavBar() {
  return (
    <Suspense
      fallback={
        <header
          className="min-h-16 pt-[env(safe-area-inset-top)]"
          aria-hidden="true"
        />
      }
    >
      <NavBarClient />
    </Suspense>
  );
}
