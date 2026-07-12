import { redirect } from 'next/navigation';

import { getCurrentUsername } from '@/services/profile';

export default async function MyProfileRedirectPage() {
  const username = await getCurrentUsername();
  if (!username) redirect('/');

  redirect(`/profile/${username}`);
}
