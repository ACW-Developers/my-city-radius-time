import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CalendarDays, Users, Clock, Search, Pencil, Trash2 } from 'lucide-react';

const AdminAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    setEmployees(profiles || []);
    const { data } = await supabase.from('attendance_records').select('*').eq('date', dateFilter).order('check_in', { ascending: true });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateFilter]);

  const getName = (userId: string) => {
    const emp = employees.find(e => e.user_id === userId);
    return emp?.full_name || emp?.email || userId;
  };

  const logActivity = async (action: string, details?: string) => {
    if (!user) return;
    await supabase.from('activity_logs').insert({ user_id: user.id, action, details });
  };

  const handleEdit = (rec: any) => {
    setEditRecord(rec);
    setEditCheckIn(rec.check_in ? new Date(rec.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    setEditCheckOut(rec.check_out ? new Date(rec.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
  };

  const saveEdit = async () => {
    if (!editRecord) return;
    const updates: any = {};
    if (editCheckIn) {
      const [h, m] = editCheckIn.split(':');
      const d = new Date(editRecord.date);
      d.setHours(parseInt(h), parseInt(m), 0);
      updates.check_in = d.toISOString();
    }
    if (editCheckOut) {
      const [h, m] = editCheckOut.split(':');
      const d = new Date(editRecord.date);
      d.setHours(parseInt(h), parseInt(m), 0);
      updates.check_out = d.toISOString();
      updates.status = 'checked_out';
    }
    if (updates.check_in && updates.check_out) {
      const diff = (new Date(updates.check_out).getTime() - new Date(updates.check_in).getTime()) / 60000;
      updates.total_worked_minutes = Math.max(0, diff);
    }
    const { error } = await supabase.from('attendance_records').update(updates).eq('id', editRecord.id);
    if (error) toast.error('Error updating');
    else { toast.success('Record updated'); await logActivity('edit_attendance', `Edited attendance for ${getName(editRecord.user_id)}`); setEditRecord(null); fetchData(); }
  };

  const deleteRecord = async (rec: any) => {
    if (!confirm(`Delete attendance record for ${getName(rec.user_id)}?`)) return;
    const { error } = await supabase.from('attendance_records').delete().eq('id', rec.id);
    if (error) toast.error('Error deleting');
    else { toast.success('Record deleted'); await logActivity('delete_attendance', `Deleted attendance for ${getName(rec.user_id)}`); fetchData(); }
  };

  const filtered = records.filter(r => {
    if (!search) return true;
    return getName(r.user_id).toLowerCase().includes(search.toLowerCase());
  });

  const workingCount = records.filter(r => r.status === 'checked_in').length;
  const completedCount = records.filter(r => r.status === 'checked_out').length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">All Attendance</h2>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="size-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Total Records</p><p className="text-xl font-bold text-foreground">{records.length}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Clock className="size-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Currently Working</p><p className="text-xl font-bold text-primary">{workingCount}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><CalendarDays className="size-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold text-foreground">{completedCount}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-48" />
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">Attendance for {new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="animate-pulse text-primary py-8 text-center">Loading...</div> : (
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={r.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {getName(r.user_id).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{getName(r.user_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                      <TableCell>{r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                      <TableCell>{Array.isArray(r.pauses) ? r.pauses.length : 0}</TableCell>
                      <TableCell className="font-semibold">{(Number(r.total_worked_minutes || 0) / 60).toFixed(1)}h</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'checked_in' ? 'default' : r.status === 'paused' ? 'destructive' : 'secondary'}>
                          {r.status === 'checked_in' ? 'Working' : r.status === 'paused' ? 'Paused' : 'Completed'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteRecord(r)}><Trash2 className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editRecord} onOpenChange={(open) => { if (!open) setEditRecord(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Attendance Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Check In Time</Label><Input type="time" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)} /></div>
            <div className="space-y-2"><Label>Check Out Time</Label><Input type="time" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)} /></div>
            <Button onClick={saveEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAttendance;
