import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Clock, TrendingUp, Coffee } from 'lucide-react';

const AttendanceHistory = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);
      setRecords(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-primary text-lg">Loading...</div></div>;

  const totalHours = records.reduce((sum, r) => sum + Number(r.total_worked_minutes || 0), 0) / 60;
  const completedDays = records.filter(r => r.status === 'checked_out').length;
  const avgHours = completedDays > 0 ? totalHours / completedDays : 0;
  const totalBreaks = records.reduce((sum, r) => sum + (Array.isArray(r.pauses) ? r.pauses.length : 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Attendance History</h2>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Days Worked</p>
              <p className="text-xl font-bold text-foreground">{completedDays}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-xl font-bold text-foreground">{totalHours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Hours/Day</p>
              <p className="text-xl font-bold text-foreground">{avgHours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Coffee className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Breaks</p>
              <p className="text-xl font-bold text-foreground">{totalBreaks}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Recent Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Breaks</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>
                ) : records.map((r) => {
                  const hours = Number(r.total_worked_minutes || 0) / 60;
                  const pct = Math.min((hours / 8) * 100, 100);
                  return (
                    <TableRow key={r.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell className="font-medium">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</TableCell>
                      <TableCell>{r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                      <TableCell>{r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                      <TableCell>{Array.isArray(r.pauses) ? r.pauses.length : 0}</TableCell>
                      <TableCell className="font-semibold">{hours.toFixed(1)}h</TableCell>
                      <TableCell className="min-w-[100px]"><Progress value={pct} className="h-2" /></TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'checked_in' ? 'default' : r.status === 'paused' ? 'destructive' : 'secondary'}>
                          {r.status === 'checked_in' ? 'Working' : r.status === 'paused' ? 'Paused' : 'Completed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceHistory;
