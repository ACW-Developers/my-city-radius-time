import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CalendarDays, DollarSign, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { profile, roles, isAdmin } = useAuth();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', today)
        .maybeSingle();
      setTodayRecord(todayData);

      // Weekly hours
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const { data: weekData } = await supabase
        .from('attendance_records')
        .select('total_worked_minutes')
        .gte('date', startOfWeek.toISOString().split('T')[0]);
      if (weekData) {
        setWeeklyHours(weekData.reduce((sum: number, r: any) => sum + Number(r.total_worked_minutes || 0), 0) / 60);
      }

      if (isAdmin) {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        setEmployeeCount(count || 0);
      }
    };
    fetchData();
  }, [isAdmin]);

  const statusLabel = todayRecord
    ? todayRecord.status === 'checked_in' ? 'Clocked In' : todayRecord.status === 'paused' ? 'Paused' : 'Checked Out'
    : 'Not Checked In';

  const statusColor = todayRecord?.status === 'checked_in' ? 'text-primary' : todayRecord?.status === 'paused' ? 'text-orange-500' : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {profile?.full_name || 'User'}!
        </h2>
        <p className="text-muted-foreground">Here's your overview for today</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Status</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${statusColor}`}>{statusLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Hours</CardTitle>
            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {(Number(todayRecord?.total_worked_minutes || 0) / 60).toFixed(1)}h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{weeklyHours.toFixed(1)}h</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Employees</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{employeeCount}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Role</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold capitalize text-foreground">
              {roles.length > 0 ? roles.join(', ').replace(/_/g, ' ') : 'Unassigned'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
