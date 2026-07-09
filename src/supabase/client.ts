import { createBrowserClient } from '@supabase/ssr';

import { Database } from './database.types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  // Create a singleton instance to avoid multiple GoTrueClient instances
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
