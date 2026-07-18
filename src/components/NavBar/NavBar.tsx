import { Suspense } from 'react';

import { NavBarClient } from './NavBarClient';

export function NavBar() {
  return (
    <Suspense fallback={<header className="h-16" aria-hidden="true" />}>
      <NavBarClient />
    </Suspense>
  );
}
