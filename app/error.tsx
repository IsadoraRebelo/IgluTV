'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[app] unhandled error', error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-text-tertiary">Something went wrong.</p>
      <button
        onClick={() => unstable_retry()}
        className="text-text-faint hover:text-text-tertiary mt-4 text-sm underline"
      >
        Try again
      </button>
    </div>
  );
}
