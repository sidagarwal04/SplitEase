import { createClient } from '@supabase/supabase-js';

export function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function adminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin env vars not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Authenticates the caller from an `Authorization: Bearer <jwt>` header
// and returns the Supabase user, or throws a 401.
export async function authUser(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth?.startsWith('Bearer ')) {
    const err = new Error('Missing bearer token');
    err.status = 401;
    throw err;
  }
  const token = auth.slice('Bearer '.length);
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    // Surface the real cause so we don't have to dig through function logs.
    // Common causes: SUPABASE_SERVICE_ROLE_KEY stale, VITE_SUPABASE_URL still
    // contains /rest/v1/, or the user's JWT was issued by a now-rotated key.
    console.error('[invite] getUser failed:', error);
    const err = new Error(`Invalid token: ${error?.message ?? 'no user returned'}`);
    err.status = 401;
    throw err;
  }
  return { user: data.user, admin };
}
