import { createClient } from '@/supabase/server';

import { AuthDialog } from './AuthDialog';
import { LogOutButton } from './LogOutButton';

export async function AuthButton() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{user.email}</span>
        <LogOutButton />
      </div>
    );
  }

  return <AuthDialog />;
}
