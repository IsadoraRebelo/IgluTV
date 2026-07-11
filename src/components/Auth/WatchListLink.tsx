import Link from 'next/link';

import { createClient } from '@/supabase/server';

export async function WatchListLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <Link
      href="/tracking"
      className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
    >
      Tracking
    </Link>
  );
}
