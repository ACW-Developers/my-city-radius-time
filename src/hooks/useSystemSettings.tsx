import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

interface SettingsContextType {
  settings: SystemSettings;
  loading: boolean;
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
      }
      setSettings(s);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = async (key: string, value: any) => {
    await (supabase.from('system_settings' as any) as any).update({ value, updated_at: new Date().toISOString() }).eq('key', key);
    await fetchSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSetting, refresh: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  return ctx;
}
