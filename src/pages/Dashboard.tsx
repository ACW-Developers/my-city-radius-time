import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarDays, DollarSign, Users, TrendingUp, UserCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const Dashboard = () => {
  const { profile, roles, isAdmin } = useAuth();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [lastWeekHours, setLastWeekHours] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);
  const [todayCheckedIn, setTodayCheckedIn] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

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
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

      const { data: weekData } = await supabase
        .from('attendance_records')
        .select('total_worked_minutes, date')
        .gte('date', startOfLastWeek.toISOString().split('T')[0]);

      if (weekData) {
        const thisWeekRecords = weekData.filter(r => r.date >= startOfWeek.toISOString().split('T')[0]);
        const lastWeekRecords = weekData.filter(r => r.date < startOfWeek.toISOString().split('T')[0]);
        const thisWeekTotal = thisWeekRecords.reduce((sum: number, r: any) => sum + Number(r.total_worked_minutes || 0), 0) / 60;
        const lastWeekTotal = lastWeekRecords.reduce((sum: number, r: any) => sum + Number(r.total_worked_minutes || 0), 0) / 60;
        setWeeklyHours(thisWeekTotal);
        setLastWeekHours(lastWeekTotal);

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const chartData = days.map((day, i) => {
          const date = new Date(startOfWeek);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          const dayRecords = thisWeekRecords.filter(r => r.date === dateStr);
          const hours = dayRecords.reduce((s: number, r: any) => s + Number(r.total_worked_minutes || 0), 0) / 60;
          return { name: day, hours: +hours.toFixed(1), target: 8 };
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

      const { data: activityData } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentActivity(activityData || []);
    };
    fetchData();
  }, []);

  const statusLabel = todayRecord
    ? todayRecord.status === 'checked_in' ? 'Clocked In' : todayRecord.status === 'paused' ? 'Paused' : 'Checked Out'
    : 'Not Checked In';

  const statusColor = todayRecord?.status === 'checked_in'
    ? 'text-[hsl(var(--success))]'
    : todayRecord?.status === 'paused'
    ? 'text-[hsl(var(--warning))]'
    : 'text-muted-foreground';

  const statusBadgeVariant = todayRecord?.status === 'checked_in' ? 'default' : todayRecord?.status === 'paused' ? 'secondary' : 'outline';

  const CHART_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const weeklyChange = lastWeekHours > 0 ? ((weeklyHours - lastWeekHours) / lastWeekHours * 100) : 0;
  const weeklyUp = weeklyChange >= 0;

  const stats = [
    {
      label: "Today's Status", value: statusLabel, valueClass: statusColor,
      icon: Clock, gradient: 'from-[hsl(var(--primary))] to-[hsl(var(--chart-2))]',
      badge: <Badge variant={statusBadgeVariant} className="text-2xs">{statusLabel}</Badge>
    },
    {
      label: "Today's Hours", value: `${(Number(todayRecord?.total_worked_minutes || 0) / 60).toFixed(1)}h`,
      icon: CalendarDays, gradient: 'from-[hsl(var(--chart-2))] to-[hsl(var(--chart-3))]',
      sub: 'of 8h target'
    },
    {
      label: 'Weekly Hours', value: `${weeklyHours.toFixed(1)}h`,
      icon: TrendingUp, gradient: 'from-[hsl(var(--chart-3))] to-[hsl(var(--chart-1))]',
      trend: weeklyChange !== 0 ? { up: weeklyUp, value: `${Math.abs(weeklyChange).toFixed(0)}%` } : null
    },
    {
      label: 'Team Size', value: String(employeeCount),
      icon: Users, gradient: 'from-[hsl(var(--chart-4))] to-[hsl(var(--chart-5))]',
      sub: `${todayCheckedIn} active now`
    },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Good {today.getHours() < 12 ? 'morning' : today.getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{dateString}</p>
        </div>
        <Badge variant="outline" className="text-2xs gap-1.5 self-start sm:self-auto">
          <span className="size-1.5 rounded-full bg-[hsl(var(--success))] animate-pulse" />
          {roles.length > 0 ? roles.map(r => r.replace(/_/g, ' ')).join(', ') : 'Employee'}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="stat-card group border-border/40 shadow-xs hover:shadow-md transition-all duration-300">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient} shadow-sm`}>
                  <stat.icon className="size-4 text-white" />
                </div>
                {stat.trend && (
                  <div className={`flex items-center gap-0.5 text-2xs font-medium ${stat.trend.up ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                    {stat.trend.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {stat.trend.value}
                  </div>
                )}
              </div>
              <p className="text-2xs text-muted-foreground font-medium">{stat.label}</p>
              {stat.badge ? (
                <div className="mt-1">{stat.badge}</div>
              ) : (
                <p className={`text-lg font-bold mt-0.5 ${stat.valueClass || 'text-foreground'}`}>{stat.value}</p>
              )}
              {stat.sub && <p className="text-2xs text-muted-foreground/70 mt-0.5">{stat.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-3 border-border/40 shadow-xs">
          <CardHeader className="pb-1 px-4 pt-3.5 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
              <TrendingUp className="size-3.5 text-primary" />
              Weekly Hours
            </CardTitle>
            <Badge variant="outline" className="text-2xs font-normal">This week</Badge>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barSize={24} barGap={4}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--accent))', radius: 4 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                      fontSize: '11px',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  />
                  <Bar dataKey="hours" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/40 shadow-xs">
          <CardHeader className="pb-1 px-4 pt-3.5">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
              <Users className="size-3.5 text-primary" />
              Team Roles
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <div className="h-52">
              {roleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
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
                        fontSize: '11px',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No roles assigned yet</div>
              )}
            </div>
            {roleDistribution.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {roleDistribution.map((role, i) => (
                  <div key={role.name} className="flex items-center gap-1.5 text-2xs">
                    <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="capitalize text-muted-foreground">{role.name}</span>
                    <span className="font-semibold text-foreground">{role.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {isAdmin && recentActivity.length > 0 && (
        <Card className="border-border/40 shadow-xs">
          <CardHeader className="pb-1 px-4 pt-3.5">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
              <CalendarDays className="size-3.5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <div className="space-y-2">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/8">
                    <Clock className="size-3 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{log.action}</p>
                    <p className="text-2xs text-muted-foreground truncate">{log.details}</p>
                  </div>
                  <span className="text-2xs text-muted-foreground/60 shrink-0">
                    {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
