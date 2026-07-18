import { Suspense } from 'react';

import { BottomTabBarClient } from './BottomTabBarClient';

export function BottomTabBar() {
  return (
    <Suspense fallback={null}>
      <BottomTabBarClient />
    </Suspense>
  );
}
