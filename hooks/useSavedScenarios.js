'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function useSavedScenarios(toolName) {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const autoSaveTimer = useRef(null);

  // Check if we're in demo mode (synthetic user id)
  const isDemoMode = user?.id === 'demo-user-id';

  const fetchScenarios = useCallback(async () => {
    if (!user || isDemoMode) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_scenarios')
        .select('id, scenario_name, tool_name, is_auto_save, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('tool_name', toolName)
        .order('updated_at', { ascending: false });

      if (!error && data) setScenarios(data);
    } catch (err) {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, toolName, isDemoMode]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const saveScenario = useCallback(async (name, data, isAutoSave = false) => {
    if (!user || isDemoMode) return null;

    const row = {
      user_id: user.id,
      tool_name: toolName,
      scenario_name: name || 'Untitled',
      data,
      is_auto_save: isAutoSave,
      updated_at: new Date().toISOString(),
    };

    // For auto-save, upsert by finding existing auto-save for this tool
    if (isAutoSave) {
      const existing = scenarios.find(s => s.is_auto_save);
      if (existing) {
        const { data: updated, error } = await supabase
          .from('saved_scenarios')
          .update({ data, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (!error && updated) {
          await fetchScenarios();
          return updated;
        }
        return null;
      }
    }

    const { data: created, error } = await supabase
      .from('saved_scenarios')
      .insert(row)
      .select()
      .single();

    if (!error && created) {
      await fetchScenarios();
      setActiveId(created.id);
      return created;
    }
    return null;
  }, [user, toolName, scenarios, isDemoMode, fetchScenarios]);

  const updateScenario = useCallback(async (id, data, name) => {
    if (!user || isDemoMode) return null;

    const updates = { data, updated_at: new Date().toISOString() };
    if (name !== undefined) updates.scenario_name = name;

    const { error } = await supabase
      .from('saved_scenarios')
      .update(updates)
      .eq('id', id);

    if (!error) {
      await fetchScenarios();
    }
    return !error;
  }, [user, isDemoMode, fetchScenarios]);

  const loadScenario = useCallback(async (id) => {
    if (!user || isDemoMode) return null;

    const { data, error } = await supabase
      .from('saved_scenarios')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setActiveId(id);
      return data;
    }
    return null;
  }, [user, isDemoMode]);

  const deleteScenario = useCallback(async (id) => {
    if (!user || isDemoMode) return false;

    const { error } = await supabase
      .from('saved_scenarios')
      .delete()
      .eq('id', id);

    if (!error) {
      if (activeId === id) setActiveId(null);
      await fetchScenarios();
      return true;
    }
    return false;
  }, [user, activeId, isDemoMode, fetchScenarios]);

  const autoSave = useCallback((data) => {
    if (!user || isDemoMode) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveScenario('Auto-save', data, true);
    }, 5000);
  }, [user, isDemoMode, saveScenario]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  return {
    scenarios,
    loading,
    activeId,
    saveScenario,
    updateScenario,
    loadScenario,
    deleteScenario,
    autoSave,
    fetchScenarios,
  };
}
