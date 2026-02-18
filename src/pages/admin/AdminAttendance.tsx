import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const AdminAttendance = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    setEmployees(profiles || []);

    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', dateFilter)
      .order('check_in', { ascending: true });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateFilter]);

  const getName = (userId: string) => {
    const emp = employees.find(e => e.user_id === userId);
    return emp?.full_name || emp?.email || userId;
  };

  

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">All Attendance</h2>
      <div className="flex items-center gap-4">
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-48" />
      </div>
      <Card>
        <CardHeader><CardTitle>Attendance for {new Date(dateFilter).toLocaleDateString()}</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="animate-pulse text-primary">Loading...</div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Breaks</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No records</TableCell></TableRow>
                  ) : records.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{getName(r.user_id)}</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAttendance;
