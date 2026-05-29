import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId) => {
    if (!userId) return setProfile(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error) setProfile(data ?? null);
  };

  useEffect(() => {
    let mounted = true;

    // Drop a locally-cached session whose server-side counterpart is gone
    // (e.g. JWT references a session_id that no longer exists). Without this,
    // the SDK keeps reporting "signed in" while every GoTrue call 403s.
    const validateOrClearSession = async (sess) => {
      if (!sess) return null;
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        console.warn('[OweNow] stored session rejected by server, signing out:', error);
        await supabase.auth.signOut().catch(() => {});
        Object.keys(localStorage)
          .filter((k) => k.startsWith('sb-'))
          .forEach((k) => localStorage.removeItem(k));
        return null;
      }
      return sess;
    };

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error('[OweNow] exchangeCodeForSession error:', error);
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) console.error('[OweNow] getSession error:', error);
        if (!mounted) return;
        const validSession = await validateOrClearSession(data?.session ?? null);
        if (!mounted) return;
        setSession(validSession);
        // Fire-and-forget — profile is metadata; don't block the loading flag on it.
        loadProfile(validSession?.user?.id).catch((e) =>
          console.error('[OweNow] loadProfile error:', e)
        );
      } catch (e) {
        console.error('[OweNow] auth init failed:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      loadProfile(newSession?.user?.id).catch((e) =>
        console.error('[OweNow] loadProfile (onAuthStateChange) error:', e)
      );
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signInWithGoogle: async () => {
        const redirectTo = `${import.meta.env.VITE_APP_URL ?? window.location.origin}/`;
        return supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: { prompt: 'select_account' },
          },
        });
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
      refreshProfile: async () => loadProfile(session?.user?.id),
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
