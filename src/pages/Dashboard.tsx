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

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const { data: weekData } = await supabase
        .from('attendance_records')
        .select('total_worked_minutes, date')
        .gte('date', startOfWeek.toISOString().split('T')[0]);
      if (weekData) {
        setWeeklyHours(weekData.reduce((sum: number, r: any) => sum + Number(r.total_worked_minutes || 0), 0) / 60);
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

      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setEmployeeCount(count || 0);

      const { count: checkedIn } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'checked_in');
      setTodayCheckedIn(checkedIn || 0);

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

  const statusColor = todayRecord?.status === 'checked_in' ? 'text-primary' : todayRecord?.status === 'paused' ? 'text-warning' : 'text-muted-foreground';

  const CHART_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const stats = [
    { label: "Today's Status", value: statusLabel, valueClass: statusColor, icon: Clock, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
    { label: "Today's Hours", value: `${(Number(todayRecord?.total_worked_minutes || 0) / 60).toFixed(1)}h`, icon: CalendarDays, iconBg: 'bg-chart-2/10', iconColor: 'text-[hsl(var(--chart-2))]' },
    { label: 'This Week', value: `${weeklyHours.toFixed(1)}h`, icon: DollarSign, iconBg: 'bg-chart-3/10', iconColor: 'text-[hsl(var(--chart-3))]' },
    { label: 'Employees', value: String(employeeCount), icon: Users, iconBg: 'bg-chart-4/10', iconColor: 'text-[hsl(var(--chart-4))]' },
    { label: 'Checked In', value: String(todayCheckedIn), icon: UserCheck, iconBg: 'bg-chart-1/10', iconColor: 'text-[hsl(var(--chart-1))]' },
    { label: 'Role', value: roles.length > 0 ? roles.join(', ').replace(/_/g, ' ') : 'Unassigned', icon: TrendingUp, iconBg: 'bg-chart-5/10', iconColor: 'text-[hsl(var(--chart-5))]', capitalize: true },
  ];

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
          <p className="text-xs text-muted-foreground">Welcome back, {profile?.full_name || 'User'}</p>
        </div>
        <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <Clock className="size-3" />
          <span>{dateString}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="flex items-center justify-between p-3 sm:p-4">
              <div className="min-w-0">
                <p className="text-2xs text-muted-foreground">{stat.label}</p>
                <p className={`text-lg sm:text-xl font-bold truncate ${stat.valueClass || 'text-foreground'} ${stat.capitalize ? 'capitalize text-sm' : ''}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.iconBg}`}>
                <stat.icon className={`size-4 ${stat.iconColor}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
              <TrendingUp className="size-3.5 text-primary" />
              Weekly Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))',
                      fontSize: '11px',
                    }}
                  />
                  <Area type="monotone" dataKey="hours" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorHours)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
              <Users className="size-3.5 text-primary" />
              Role Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <div className="h-48">
              {roleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
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
                        borderRadius: '6px',
                        color: 'hsl(var(--foreground))',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No roles assigned yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
