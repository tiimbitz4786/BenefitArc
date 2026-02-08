'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_approved, is_admin')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
      }
      return data;
    } catch (err) {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        // Auth initialization failed
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Safety net: never show loading screen for more than 10 seconds
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 10000);

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        // Silently sync user and profile — never touch loading state.
        // Initial load is handled by init() above.
        // Sign-in is handled by the signIn function below.
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchProfile(session.user.id); // fire-and-forget
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data?.user) {
      await fetchProfile(data.user.id);
    }

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    return { error };
  };

  const isApproved = profile?.is_approved || false;
  const isAdmin = profile?.is_admin || false;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      isApproved,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
