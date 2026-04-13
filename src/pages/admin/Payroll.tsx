import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DollarSign, Users, Clock, Search, TrendingUp, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function getBiweeklyRange() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  while (startOfYear.getDay() !== 1) startOfYear.setDate(startOfYear.getDate() + 1);
  const daysSinceStart = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const periodIndex = Math.floor(daysSinceStart / 14);
  const periodStart = new Date(startOfYear);
  periodStart.setDate(periodStart.getDate() + periodIndex * 14);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 13);
  return { start: periodStart, end: periodEnd };
}

const Payroll = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const { start, end } = getBiweeklyRange();
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: roles } = await supabase.from('user_roles').select('*');
      const { data: payRates } = await supabase.from('pay_rates').select('*');
      const { data: records } = await supabase.from('attendance_records').select('*')
        .gte('date', start.toISOString().split('T')[0]).lte('date', end.toISOString().split('T')[0]);

      const result = (profiles || []).map(p => {
        const userRoles = (roles || []).filter((r: any) => r.user_id === p.user_id);
        const userRecords = (records || []).filter((r: any) => r.user_id === p.user_id);
        const totalHours = userRecords.reduce((sum: number, r: any) => sum + Number(r.total_worked_minutes || 0), 0) / 60;
        const individualRate = (payRates || []).find((r: any) => r.user_id === p.user_id);
        let rate = individualRate ? Number(individualRate.hourly_rate) : 0;
        if (!individualRate && userRoles.length > 0) {
          const roleRate = (payRates || []).find((r: any) => r.role === userRoles[0].role && !r.user_id);
          rate = roleRate ? Number(roleRate.hourly_rate) : 0;
        }
        return { ...p, roles: userRoles.map((r: any) => r.role), totalHours, hourlyRate: rate, totalPay: rate * totalHours };
      });
      setData(result);
      setLoading(false);
    };
    fetch();
  }, []);

  const { start, end } = getBiweeklyRange();
  const totalPay = data.reduce((sum, e) => sum + e.totalPay, 0);
  const totalHours = data.reduce((sum, e) => sum + e.totalHours, 0);
  const activeWorkers = data.filter(d => d.totalHours > 0).length;

  const filtered = data.filter(e => !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase()));

  // Top earners chart data
  const chartData = [...data]
    .filter(d => d.totalPay > 0)
    .sort((a, b) => b.totalPay - a.totalPay)
    .slice(0, 8)
    .map(d => ({ name: d.full_name?.split(' ')[0] || 'N/A', pay: +d.totalPay.toFixed(2), hours: +d.totalHours.toFixed(1) }));

  const kpis = [
    { label: 'Total Payroll', value: `$${totalPay.toFixed(2)}`, icon: DollarSign, gradient: 'from-[hsl(var(--primary))] to-[hsl(var(--chart-2))]', highlight: true },
    { label: 'Total Hours', value: `${totalHours.toFixed(1)}h`, icon: Clock, gradient: 'from-[hsl(var(--chart-2))] to-[hsl(var(--chart-3))]' },
    { label: 'Active Workers', value: String(activeWorkers), icon: Users, gradient: 'from-[hsl(var(--chart-3))] to-[hsl(var(--chart-1))]' },
    { label: 'Avg Pay', value: `$${activeWorkers > 0 ? (totalPay / activeWorkers).toFixed(2) : '0'}`, icon: TrendingUp, gradient: 'from-[hsl(var(--chart-4))] to-[hsl(var(--chart-5))]' },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Payroll Report</h1>
          <p className="text-xs text-muted-foreground">Biweekly compensation overview</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-2xs self-start sm:self-auto">
          {start.toLocaleDateString()} — {end.toLocaleDateString()}
        </Badge>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="stat-card border-border/40 shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-start justify-between mb-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${kpi.gradient} shadow-sm`}>
                  <kpi.icon className="size-4 text-white" />
                </div>
                {kpi.highlight && <ArrowUpRight className="size-3.5 text-[hsl(var(--success))]" />}
              </div>
              <p className="text-2xs text-muted-foreground font-medium">{kpi.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${kpi.highlight ? 'text-primary' : 'text-foreground'}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top earners chart */}
      {chartData.length > 0 && (
        <Card className="border-border/40 shadow-xs">
          <CardHeader className="pb-1 px-4 pt-3.5 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
              <TrendingUp className="size-3.5 text-primary" />
              Top Earners
            </CardTitle>
            <Badge variant="outline" className="text-2xs font-normal">This period</Badge>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={28}>
                  <defs>
                    <linearGradient id="payGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
                      borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '11px', boxShadow: 'var(--shadow-md)',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Pay']}
                  />
                  <Bar dataKey="pay" fill="url(#payGradient)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-12 gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center animate-pulse">
            <Clock className="size-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Loading payroll data...</p>
        </div>
      ) : (
        <Card className="border-border/40 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-semibold">Employee Summary</CardTitle>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="elegant-table">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-2xs">Employee</TableHead>
                    <TableHead className="text-2xs">Role</TableHead>
                    <TableHead className="text-2xs text-right">Hours</TableHead>
                    <TableHead className="text-2xs text-right">Rate</TableHead>
                    <TableHead className="text-2xs text-right">Total Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-2xs font-semibold text-primary ring-1 ring-primary/10">
                            {(emp.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-xs text-foreground">{emp.full_name || emp.email}</p>
                            <p className="text-2xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-2xs font-normal">
                          {emp.roles.join(', ').replace(/_/g, ' ') || 'Unassigned'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums">{emp.totalHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">${emp.hourlyRate.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-primary tabular-nums">${emp.totalPay.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length > 0 && (
                    <TableRow className="border-t-2 border-border/60 bg-muted/20 hover:bg-muted/30">
                      <TableCell colSpan={4} className="font-bold text-xs text-foreground">Total Payroll</TableCell>
                      <TableCell className="text-right font-bold text-sm text-primary tabular-nums">${totalPay.toFixed(2)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Payroll;
