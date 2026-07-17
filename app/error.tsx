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
    <div className="flex flex-1 flex-col items-center justify-center bg-[#14181c] px-6 py-24 text-center">
      <p className="text-[#9ab0bf]">Something went wrong.</p>
      <button
        onClick={() => unstable_retry()}
        className="mt-4 text-sm text-[#678] underline hover:text-[#9ab0bf]"
      >
        Try again
      </button>
    </div>
  );
}
