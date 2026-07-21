'use client';

import { createContext, type ReactNode, use, useContext } from 'react';

import type { Viewer } from '@/services/viewer';

const ViewerContext = createContext<Promise<Viewer | null> | null>(null);

export function ViewerProvider({
  viewerPromise,
  children,
}: {
  viewerPromise: Promise<Viewer | null>;
  children: ReactNode;
}) {
  return (
    <ViewerContext.Provider value={viewerPromise}>
      {children}
    </ViewerContext.Provider>
  );
}

// Suspends the calling component until the viewer promise resolves — only
// call this from a component wrapped in its own <Suspense> boundary (e.g.
// NavBarUserMenu), never from the root layout itself, so the rest of the
// app can still prerender as a static shell while this resolves.
export function useViewer(): {
  username: string | null;
  avatarUrl: string | null;
} {
  const viewerPromise = useContext(ViewerContext);
  if (!viewerPromise) return { username: null, avatarUrl: null };
  const viewer = use(viewerPromise);
  return {
    username: viewer?.username ?? null,
    avatarUrl: viewer?.avatarUrl ?? null,
  };
}
