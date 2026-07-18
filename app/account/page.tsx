import { redirect } from 'next/navigation';

import { getViewer } from '@/services/viewer';

import { AccountView } from './AccountView';

export default async function AccountPage() {
  const viewer = await getViewer();

  if (!viewer?.email) redirect('/');

  return <AccountView email={viewer.email} />;
}
