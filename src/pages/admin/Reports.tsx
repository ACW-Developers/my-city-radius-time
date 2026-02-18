import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Users, Clock, DollarSign, TrendingUp, Search } from 'lucide-react';

const Reports = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: profiles }, { data: attendance }, { data: userRoles }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('attendance_records').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('user_roles').select('*'),
      ]);
      setEmployees(profiles || []);
      setRecords(attendance || []);
      setRoles(userRoles || []);
      setLoading(false);
    };
    fetchData();
  }, [startDate, endDate]);

  const workerData = employees.map(emp => {
    const empRecords = records.filter(r => r.user_id === emp.user_id);
    const totalMinutes = empRecords.reduce((sum, r) => sum + Number(r.total_worked_minutes || 0), 0);
    const empRoles = roles.filter(r => r.user_id === emp.user_id).map(r => r.role);
    const daysWorked = empRecords.filter(r => r.status === 'checked_out').length;
    return {
      name: emp.full_name || emp.email,
      email: emp.email,
      hours: +(totalMinutes / 60).toFixed(1),
      daysWorked,
      roles: empRoles.join(', ').replace(/_/g, ' ') || 'Unassigned',
      avgHoursPerDay: daysWorked > 0 ? +(totalMinutes / 60 / daysWorked).toFixed(1) : 0,
    };
  }).sort((a, b) => b.hours - a.hours);

  const totalHours = workerData.reduce((s, w) => s + w.hours, 0);
  const activeWorkers = workerData.filter(w => w.hours > 0).length;

  const filtered = workerData.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Reports</h2>

      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-44" />
        <span className="text-muted-foreground">to</span>
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-44" />
      </div>

      {loading ? <div className="animate-pulse text-primary text-center py-8">Loading...</div> : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="size-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Total Employees</p><p className="text-xl font-bold text-foreground">{employees.length}</p></div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><TrendingUp className="size-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Active Workers</p><p className="text-xl font-bold text-foreground">{activeWorkers}</p></div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Clock className="size-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Total Hours</p><p className="text-xl font-bold text-foreground">{totalHours.toFixed(1)}h</p></div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><DollarSign className="size-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Avg Hours/Worker</p><p className="text-xl font-bold text-foreground">{activeWorkers > 0 ? (totalHours / activeWorkers).toFixed(1) : '0'}h</p></div>
              </CardContent>
            </Card>
          </div>

          {workerData.length > 0 && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Hours by Employee</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workerData.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base">Worker Details</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Days Worked</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Avg Hours/Day</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(w => (
                      <TableRow key={w.name} className="hover:bg-accent/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {w.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-sm">{w.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize text-xs">{w.roles}</Badge></TableCell>
                        <TableCell>{w.daysWorked}</TableCell>
                        <TableCell className="font-semibold text-primary">{w.hours}h</TableCell>
                        <TableCell>{w.avgHoursPerDay}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Reports;
