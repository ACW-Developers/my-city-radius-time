import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CalendarDays, DollarSign, Users, TrendingUp, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const { profile, roles } = useAuth();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);
  const [todayCheckedIn, setTodayCheckedIn] = useState(0);

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
        .select('total_worked_minutes, date')
        .gte('date', startOfWeek.toISOString().split('T')[0]);
      if (weekData) {
        setWeeklyHours(weekData.reduce((sum: number, r: any) => sum + Number(r.total_worked_minutes || 0), 0) / 60);

        // Build weekly chart data
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const chartData = days.map((day, i) => {
          const date = new Date(startOfWeek);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          const dayRecords = weekData.filter(r => r.date === dateStr);
          const hours = dayRecords.reduce((s: number, r: any) => s + Number(r.total_worked_minutes || 0), 0) / 60;
          return { name: day, hours: +hours.toFixed(1) };
        });
        setWeeklyData(chartData);
      }

      // Employee count & today's checked in
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setEmployeeCount(count || 0);

      const { count: checkedIn } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'checked_in');
      setTodayCheckedIn(checkedIn || 0);

      // Role distribution
      const { data: userRoles } = await supabase.from('user_roles').select('role');
      if (userRoles) {
        const roleCounts: Record<string, number> = {};
        userRoles.forEach(r => { roleCounts[r.role] = (roleCounts[r.role] || 0) + 1; });
        setRoleDistribution(Object.entries(roleCounts).map(([name, value]) => ({
          name: name.replace(/_/g, ' '),
          value,
        })));
      }
    };
    fetchData();
  }, []);

  const statusLabel = todayRecord
    ? todayRecord.status === 'checked_in' ? 'Clocked In' : todayRecord.status === 'paused' ? 'Paused' : 'Checked Out'
    : 'Not Checked In';

  const statusColor = todayRecord?.status === 'checked_in' ? 'text-primary' : todayRecord?.status === 'paused' ? 'text-orange-500' : 'text-muted-foreground';

  const CHART_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name || 'User'}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          <span>{dateString}</span>
        </div>
      </div>

      {/* Stats Grid - futuristic cards with colored icons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Today's Status</p>
              <p className={`text-3xl font-bold ${statusColor}`}>{statusLabel}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="size-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Today's Hours</p>
              <p className="text-3xl font-bold text-foreground">
                {(Number(todayRecord?.total_worked_minutes || 0) / 60).toFixed(1)}h
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-2/10">
              <CalendarDays className="size-6 text-[hsl(var(--chart-2))]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-3xl font-bold text-foreground">{weeklyHours.toFixed(1)}h</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-3/10">
              <DollarSign className="size-6 text-[hsl(var(--chart-3))]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Employees</p>
              <p className="text-3xl font-bold text-foreground">{employeeCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-4/10">
              <Users className="size-6 text-[hsl(var(--chart-4))]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Checked In Today</p>
              <p className="text-3xl font-bold text-foreground">{todayCheckedIn}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-1/10">
              <UserCheck className="size-6 text-[hsl(var(--chart-1))]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="text-lg font-semibold capitalize text-foreground">
                {roles.length > 0 ? roles.join(', ').replace(/_/g, ' ') : 'Unassigned'}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-5/10">
              <TrendingUp className="size-6 text-[hsl(var(--chart-5))]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Weekly Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Area type="monotone" dataKey="hours" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorHours)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" />
              Role Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {roleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {roleDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No roles assigned yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
