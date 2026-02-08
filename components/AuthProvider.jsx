'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

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
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        // Session retrieval failed silently
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only show loading for real auth transitions, not token refreshes
        const isAuthTransition = event === 'SIGNED_IN' || event === 'SIGNED_OUT';

        setUser(session?.user ?? null);

        if (session?.user) {
          if (initialLoadDone.current && isAuthTransition) {
            setLoading(true);
          }
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        if (initialLoadDone.current && isAuthTransition) {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // No dependencies - subscribe once

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
