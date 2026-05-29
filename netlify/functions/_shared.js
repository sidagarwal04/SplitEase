import { createClient } from '@supabase/supabase-js';

export function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function adminClient() {
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawUrl) throw new Error('SUPABASE URL env var not configured (set VITE_SUPABASE_URL or SUPABASE_URL)');
  if (!key)    throw new Error('SUPABASE_SERVICE_ROLE_KEY env var not configured');
  // Defensive: strip a trailing /rest/v1/ if someone set the env var to the
  // PostgREST path by mistake — adminClient needs the project base URL.
  const url = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
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
    // Surface the real cause so clients see e.g. "session_not_found" instead
    // of a generic "Invalid token", which is actionable (re-sign-in).
    const err = new Error(`Invalid token: ${error?.message ?? 'no user returned'}`);
    err.status = 401;
    throw err;
  }
  return { user: data.user, admin };
}
