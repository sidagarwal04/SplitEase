import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[OweNow] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in values.'
  );
}

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Disable auto-detection; we exchange the OAuth code manually in AuthProvider
    // to avoid a race between detectSessionInUrl and getSession() that can leave
    // the client thinking no session exists after a successful Google callback.
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export const RECEIPTS_BUCKET = 'receipts';
