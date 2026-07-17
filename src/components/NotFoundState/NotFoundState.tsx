import Link from 'next/link';

export function NotFoundState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#14181c] px-6 py-24 text-center">
      <p className="text-[#9ab0bf]">{message}</p>
      <Link
        href="/"
        className="mt-4 text-sm text-[#678] underline hover:text-[#9ab0bf]"
      >
        Back to home
      </Link>
    </div>
  );
}
