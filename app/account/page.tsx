import { redirect } from 'next/navigation';

import { createClient } from '@/supabase/server';

import { AccountView } from './AccountView';

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect('/');

  return <AccountView email={user.email} />;
}
