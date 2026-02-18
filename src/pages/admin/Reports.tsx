import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Users, Clock, DollarSign, TrendingUp } from 'lucide-react';

const Reports = () => {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin, startDate, endDate]);

  if (!isAdmin) return <p className="text-destructive">Access denied</p>;

  const workerData = employees.map(emp => {
    const empRecords = records.filter(r => r.user_id === emp.user_id);
    const totalMinutes = empRecords.reduce((sum, r) => sum + Number(r.total_worked_minutes || 0), 0);
    const empRoles = roles.filter(r => r.user_id === emp.user_id).map(r => r.role);
    const daysWorked = empRecords.filter(r => r.status === 'checked_out').length;
    return {
      name: emp.full_name || emp.email,
      hours: +(totalMinutes / 60).toFixed(1),
      daysWorked,
      roles: empRoles.join(', ').replace(/_/g, ' ') || 'Unassigned',
      avgHoursPerDay: daysWorked > 0 ? +(totalMinutes / 60 / daysWorked).toFixed(1) : 0,
    };
  }).sort((a, b) => b.hours - a.hours);

  const totalHours = workerData.reduce((s, w) => s + w.hours, 0);
  const activeWorkers = workerData.filter(w => w.hours > 0).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Reports</h2>

      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-44" />
        <span className="text-muted-foreground">to</span>
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-44" />
      </div>

      {loading ? <div className="animate-pulse text-primary">Loading...</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
                <Users className="size-4 text-primary" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-foreground">{employees.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Workers</CardTitle>
                <TrendingUp className="size-4 text-primary" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-foreground">{activeWorkers}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                <Clock className="size-4 text-primary" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}h</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Hours/Worker</CardTitle>
                <DollarSign className="size-4 text-primary" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-foreground">{activeWorkers > 0 ? (totalHours / activeWorkers).toFixed(1) : '0'}h</p></CardContent>
            </Card>
          </div>

          {workerData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Hours by Employee</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workerData.slice(0, 15)}>
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
                      <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Worker Details</CardTitle></CardHeader>
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
                    {workerData.map(w => (
                      <TableRow key={w.name}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell className="capitalize">{w.roles}</TableCell>
                        <TableCell>{w.daysWorked}</TableCell>
                        <TableCell className="text-primary font-semibold">{w.hours}h</TableCell>
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
