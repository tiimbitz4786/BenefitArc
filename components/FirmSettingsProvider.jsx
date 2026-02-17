'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

const FirmSettingsContext = createContext({});

export const useFirmSettings = () => useContext(FirmSettingsContext);

const DEFAULT_FIRM_SETTINGS = {
  firm_name: '',
  logo_base64: '',
  accent_color: '#6366f1',
};

export function FirmSettingsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const isDemoMode = userId === 'demo-user-id';
  const [firmSettings, setFirmSettings] = useState(DEFAULT_FIRM_SETTINGS);
  const [firmSettingsLoading, setFirmSettingsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!userId || isDemoMode) {
        setFirmSettings(DEFAULT_FIRM_SETTINGS);
        setFirmSettingsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('firm_settings')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!mounted) return;
        if (data && !error) {
          setFirmSettings({
            firm_name: data.firm_name || '',
            logo_base64: data.logo_base64 || '',
            accent_color: data.accent_color || '#6366f1',
          });
        } else {
          setFirmSettings(DEFAULT_FIRM_SETTINGS);
        }
      } catch {
        if (mounted) setFirmSettings(DEFAULT_FIRM_SETTINGS);
      } finally {
        if (mounted) setFirmSettingsLoading(false);
      }
    };

    setFirmSettingsLoading(true);
    load();

    return () => { mounted = false; };
  }, [userId, isDemoMode]);

  const saveFirmSettings = async (newSettings) => {
    if (!user || isDemoMode) return { error: 'Not authenticated' };

    const row = {
      user_id: user.id,
      firm_name: newSettings.firm_name || '',
      logo_base64: newSettings.logo_base64 || '',
      accent_color: newSettings.accent_color || '#6366f1',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('firm_settings')
      .upsert(row, { onConflict: 'user_id' });

    if (!error) {
      setFirmSettings(newSettings);
    }
    return { error };
  };

  return (
    <FirmSettingsContext.Provider value={{ firmSettings, firmSettingsLoading, saveFirmSettings }}>
      {children}
    </FirmSettingsContext.Provider>
  );
}
