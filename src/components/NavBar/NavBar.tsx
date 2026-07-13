import { getCurrentUsername } from '@/services/profile';

import { NavBarClient } from './NavBarClient';

export async function NavBar() {
  const username = await getCurrentUsername();

  return <NavBarClient username={username} />;
}
