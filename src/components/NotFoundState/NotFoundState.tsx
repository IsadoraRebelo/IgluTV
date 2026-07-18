import Link from 'next/link';

export function NotFoundState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-text-tertiary">{message}</p>
      <Link
        href="/"
        className="text-text-faint hover:text-text-tertiary mt-4 text-sm underline"
      >
        Back to home
      </Link>
    </div>
  );
}
