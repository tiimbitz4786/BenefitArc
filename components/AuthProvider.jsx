'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setProfile(data);
      }
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
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
        console.error('Error getting session:', err);
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only show loading on subsequent auth changes (sign in/out),
          // not during the initial load which is handled by getSession
          if (initialLoadDone) {
            setLoading(true);
          }
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        if (initialLoadDone) {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [initialLoadDone]);

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
