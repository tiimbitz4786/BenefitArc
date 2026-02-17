'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDemo } from './DemoProvider';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@benefitarc.com',
};

const DEMO_PROFILE = {
  is_approved: true,
  is_admin: false,
  onboarding_completed: true,
};

export function AuthProvider({ children }) {
  const { isDemoMode } = useDemo();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_approved, is_admin, onboarding_completed')
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
    // If demo mode, set synthetic user immediately
    if (isDemoMode) {
      setUser(DEMO_USER);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

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

    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 10000);

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          fetchProfile(session.user.id);
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
  }, [isDemoMode]);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
  const onboardingCompleted = profile?.onboarding_completed || false;

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
      onboardingCompleted,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
