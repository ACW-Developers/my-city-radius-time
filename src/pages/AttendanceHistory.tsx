import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  if (loading) return <div className="animate-pulse text-primary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Attendance History</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Recent Attendance</CardTitle>
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
                  <TableHead>Hours Worked</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No records found</TableCell></TableRow>
                ) : records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.check_in ? new Date(r.check_in).toLocaleTimeString() : '-'}</TableCell>
                    <TableCell>{r.check_out ? new Date(r.check_out).toLocaleTimeString() : '-'}</TableCell>
                    <TableCell>{Array.isArray(r.pauses) ? r.pauses.length : 0}</TableCell>
                    <TableCell>{(Number(r.total_worked_minutes || 0) / 60).toFixed(2)}h</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === 'checked_in' ? 'bg-primary/10 text-primary' :
                        r.status === 'paused' ? 'bg-orange-100 text-orange-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {r.status === 'checked_in' ? 'Working' : r.status === 'paused' ? 'Paused' : 'Completed'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceHistory;
