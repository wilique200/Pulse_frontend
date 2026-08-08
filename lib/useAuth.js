'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

/** Tracks the current Supabase session. Returns { user, session,
 * loading, signOut }. `session.access_token` is what gets sent to the
 * backend as the Authorization header on every API call. */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return {
    user: session?.user ?? null,
    session,
    loading,
    signOut: () => supabase.auth.signOut(),
  };
}
