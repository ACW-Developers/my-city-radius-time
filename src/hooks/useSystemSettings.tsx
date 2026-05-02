import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBiweeklyPeriod, type BiweeklyPeriod } from '@/lib/biweekly';

export interface ModuleVisibility {
  dashboard: boolean;
  checkin: boolean;
  attendance: boolean;
  pay: boolean;
  employees: boolean;
  pay_rates: boolean;
  admin_attendance: boolean;
  payroll: boolean;
  reports: boolean;
  activity_log: boolean;
  settings: boolean;
}

interface SystemSettings {
  app_name: string;
  modules: ModuleVisibility;
  work_hours: { start: string; end: string; timezone: string };
  pay_period: string;
  biweekly_anchor: string; // YYYY-MM-DD
}

interface SettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  currentPeriod: BiweeklyPeriod;
  updateSetting: (key: string, value: any) => Promise<void>;
  refresh: () => Promise<void>;
}

const defaults: SystemSettings = {
  app_name: 'My City Radius',
  modules: {
    dashboard: true, checkin: true, attendance: true, pay: true,
    employees: true, pay_rates: true, admin_attendance: true, payroll: true,
    reports: true, activity_log: true, settings: true,
  },
  work_hours: { start: '08:00', end: '17:00', timezone: 'America/Phoenix' },
  pay_period: 'biweekly',
  biweekly_anchor: new Date().toISOString().split('T')[0],
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('system_settings' as any).select('key, value');
    if (data) {
      const s = { ...defaults };
      for (const row of data as any[]) {
        if (row.key === 'app_name') s.app_name = typeof row.value === 'string' ? row.value : String(row.value);
        if (row.key === 'modules') s.modules = { ...defaults.modules, ...(typeof row.value === 'object' ? row.value : {}) };
        if (row.key === 'work_hours') s.work_hours = { ...defaults.work_hours, ...(typeof row.value === 'object' ? row.value : {}) };
        if (row.key === 'pay_period') s.pay_period = typeof row.value === 'string' ? row.value : String(row.value);
        if (row.key === 'biweekly_anchor') s.biweekly_anchor = typeof row.value === 'string' ? row.value : String(row.value);
      }
      setSettings(s);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = async (key: string, value: any) => {
    // Upsert: update if exists, otherwise insert
    const { data: existing } = await supabase.from('system_settings' as any).select('id').eq('key', key).maybeSingle();
    if (existing) {
      await (supabase.from('system_settings' as any) as any).update({ value, updated_at: new Date().toISOString() }).eq('key', key);
    } else {
      await (supabase.from('system_settings' as any) as any).insert({ key, value });
    }
    await fetchSettings();
  };

  const currentPeriod = useMemo(() => getBiweeklyPeriod(settings.biweekly_anchor), [settings.biweekly_anchor]);

  return (
    <SettingsContext.Provider value={{ settings, loading, currentPeriod, updateSetting, refresh: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  return ctx;
}
