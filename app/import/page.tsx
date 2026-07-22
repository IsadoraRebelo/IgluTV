import { redirect } from 'next/navigation';

import { getViewer } from '@/services/viewer';

import { ImportView } from './ImportView';

export default async function ImportPage() {
  const viewer = await getViewer();

  if (!viewer) redirect('/');

  return <ImportView />;
}
