import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, CalendarDays } from 'lucide-react';

function getBiweeklyRange() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  // Find first Monday
  while (startOfYear.getDay() !== 1) startOfYear.setDate(startOfYear.getDate() + 1);
  
  const daysSinceStart = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const periodIndex = Math.floor(daysSinceStart / 14);
  const periodStart = new Date(startOfYear);
  periodStart.setDate(periodStart.getDate() + periodIndex * 14);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 13);
  
  return { start: periodStart, end: periodEnd };
}

const PaySummary = () => {
  const { user, roles } = useAuth();
  const [hourlyRate, setHourlyRate] = useState(0);
  const [periodHours, setPeriodHours] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;

      // Get individual pay rate first, fallback to role rate
      const { data: userRate } = await supabase
        .from('pay_rates')
        .select('hourly_rate')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userRate) {
        setHourlyRate(Number(userRate.hourly_rate));
      } else if (roles.length > 0) {
        const { data: roleRate } = await supabase
          .from('pay_rates')
          .select('hourly_rate')
          .eq('role', roles[0])
          .is('user_id', null)
          .maybeSingle();
        if (roleRate) setHourlyRate(Number(roleRate.hourly_rate));
      }

      // Biweekly hours
      const { start, end } = getBiweeklyRange();
      const { data: records } = await supabase
        .from('attendance_records')
        .select('total_worked_minutes')
        .eq('user_id', user.id)
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0]);

      if (records) {
        setPeriodHours(records.reduce((sum: number, r: any) => sum + Number(r.total_worked_minutes || 0), 0) / 60);
      }
      setLoading(false);
    };
    fetch();
  }, [user, roles]);

  const { start, end } = getBiweeklyRange();

  if (loading) return <div className="animate-pulse text-primary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Pay & Hours Summary</h2>
      
      <p className="text-sm text-muted-foreground">
        Biweekly period: {start.toLocaleDateString()} — {end.toLocaleDateString()} (Mon–Fri, 8 AM–5 PM)
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hourly Rate</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">${hourlyRate.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hours This Period</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{periodHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">of 80h max (biweekly)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Pay</CardTitle>
            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">${(hourlyRate * periodHours).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaySummary;
