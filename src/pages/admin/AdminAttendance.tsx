import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CalendarDays, Users, Clock, Search, Pencil, Trash2, Download, Filter, RefreshCw, Printer } from 'lucide-react';

const AdminAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    setEmployees(profiles || []);

    let query = supabase.from('attendance_records').select('*')
      .gte('date', dateFrom).lte('date', dateTo)
      .order('date', { ascending: false });

    if (selectedEmployee !== 'all') {
      query = query.eq('user_id', selectedEmployee);
    }

    const { data } = await query;
    setRecords(data || []);
    setLoading(false);
  }, [dateFrom, dateTo, selectedEmployee]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-attendance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const getName = (userId: string) => {
    const emp = employees.find(e => e.user_id === userId);
    return emp?.full_name || emp?.email || userId;
  };

  const getEmail = (userId: string) => {
    const emp = employees.find(e => e.user_id === userId);
    return emp?.email || '';
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
  const totalHours = records.reduce((sum, r) => sum + Number(r.total_worked_minutes || 0), 0) / 60;

  const printEmployeeAttendance = (rec: any) => {
    const name = getName(rec.user_id);
    const email = getEmail(rec.user_id);
    const checkIn = rec.check_in ? new Date(rec.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    const checkOut = rec.check_out ? new Date(rec.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    const hoursWorked = (Number(rec.total_worked_minutes || 0) / 60).toFixed(2);
    const breaks = Array.isArray(rec.pauses) ? rec.pauses.length : 0;
    const status = rec.status === 'checked_in' ? 'Working' : rec.status === 'paused' ? 'Paused' : 'Completed';
    const dateStr = new Date(rec.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const breakRows = Array.isArray(rec.pauses) && rec.pauses.length > 0
      ? rec.pauses.map((p: any, i: number) => {
          const s = new Date(p.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const e = p.end ? new Date(p.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing';
          const dur = p.end ? Math.round((new Date(p.end).getTime() - new Date(p.start).getTime()) / 60000) : '—';
          return `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb;">${i + 1}</td><td style="padding:6px 12px;border:1px solid #e5e7eb;">${p.reason || 'Break'}</td><td style="padding:6px 12px;border:1px solid #e5e7eb;">${s}</td><td style="padding:6px 12px;border:1px solid #e5e7eb;">${e}</td><td style="padding:6px 12px;border:1px solid #e5e7eb;">${dur}${typeof dur === 'number' ? ' min' : ''}</td></tr>`;
        }).join('')
      : '';

    const html = `<!DOCTYPE html><html><head><title>Attendance - ${name}</title><style>
      @media print { body { margin: 0; } @page { margin: 20mm; } }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 700px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
      .company { font-size: 22px; font-weight: 700; color: #2563eb; }
      .subtitle { font-size: 11px; color: #6b7280; margin-top: 2px; }
      .doc-title { font-size: 13px; font-weight: 600; color: #374151; text-align: right; }
      .doc-date { font-size: 11px; color: #6b7280; text-align: right; }
      .section { margin-bottom: 20px; }
      .section-title { font-size: 13px; font-weight: 600; color: #2563eb; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #f3f4f6; padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600; font-size: 12px; color: #374151; }
      td { padding: 6px 12px; border: 1px solid #e5e7eb; }
      .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
      .badge-working { background: #dbeafe; color: #2563eb; }
      .badge-completed { background: #dcfce7; color: #16a34a; }
      .badge-paused { background: #fef3c7; color: #d97706; }
      .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
      .big-value { font-size: 28px; font-weight: 700; color: #1a1a1a; }
      .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
      .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
      .stat-label { font-size: 11px; color: #6b7280; }
      .stat-value { font-size: 20px; font-weight: 700; color: #1a1a1a; }
    </style></head><body>
      <div class="header">
        <div><div class="company">My City Radius</div><div class="subtitle">Employee Attendance System</div></div>
        <div><div class="doc-title">Attendance Record</div><div class="doc-date">Printed: ${new Date().toLocaleDateString()}</div></div>
      </div>
      <div class="section">
        <div class="section-title">Employee Information</div>
        <table><tbody>
          <tr><td style="font-weight:600;width:140px;">Full Name</td><td>${name}</td></tr>
          <tr><td style="font-weight:600;">Email</td><td>${email}</td></tr>
          <tr><td style="font-weight:600;">Date</td><td>${dateStr}</td></tr>
          <tr><td style="font-weight:600;">Status</td><td><span class="badge ${status === 'Working' ? 'badge-working' : status === 'Completed' ? 'badge-completed' : 'badge-paused'}">${status}</span></td></tr>
        </tbody></table>
      </div>
      <div class="stats">
        <div class="stat-card"><div class="stat-label">Check In</div><div class="stat-value">${checkIn}</div></div>
        <div class="stat-card"><div class="stat-label">Check Out</div><div class="stat-value">${checkOut}</div></div>
        <div class="stat-card"><div class="stat-label">Hours Worked</div><div class="stat-value">${hoursWorked}h</div></div>
      </div>
      ${breakRows ? `<div class="section"><div class="section-title">Break Details (${breaks})</div><table><thead><tr><th>#</th><th>Reason</th><th>Start</th><th>End</th><th>Duration</th></tr></thead><tbody>${breakRows}</tbody></table></div>` : ''}
      <div class="footer"><span>My City Radius · Attendance Report</span><span>Generated on ${new Date().toLocaleString()}</span></div>
    </body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); };
    }
  };

  const downloadCSV = () => {
    const rows = [['Employee', 'Email', 'Date', 'Check In', 'Check Out', 'Breaks', 'Hours Worked', 'Status']];
    filtered.forEach(r => {
      rows.push([
        getName(r.user_id),
        getEmail(r.user_id),
        r.date,
        r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        String(Array.isArray(r.pauses) ? r.pauses.length : 0),
        (Number(r.total_worked_minutes || 0) / 60).toFixed(2),
        r.status === 'checked_in' ? 'Working' : r.status === 'paused' ? 'Paused' : 'Completed',
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const empName = selectedEmployee !== 'all' ? `_${getName(selectedEmployee).replace(/\s+/g, '_')}` : '_all';
    a.download = `attendance${empName}_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const downloadAllBiweeklySheets = async () => {
    toast.loading('Generating biweekly sheets...', { id: 'biweekly' });

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

    const pStart = periodStart.toISOString().split('T')[0];
    const pEnd = periodEnd.toISOString().split('T')[0];

    const { data: allRecords } = await supabase.from('attendance_records').select('*')
      .gte('date', pStart).lte('date', pEnd).order('date', { ascending: true });

    if (!allRecords || allRecords.length === 0) {
      toast.dismiss('biweekly');
      toast.info('No records for current biweekly period');
      return;
    }

    const rows = [['Employee', 'Email', 'Date', 'Check In', 'Check Out', 'Breaks', 'Hours Worked', 'Status']];
    allRecords.forEach(r => {
      rows.push([
        getName(r.user_id),
        getEmail(r.user_id),
        r.date,
        r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        String(Array.isArray(r.pauses) ? r.pauses.length : 0),
        (Number(r.total_worked_minutes || 0) / 60).toFixed(2),
        r.status === 'checked_in' ? 'Working' : r.status === 'paused' ? 'Paused' : 'Completed',
      ]);
    });

    rows.push([]);
    rows.push(['--- SUMMARY ---', '', '', '', '', '', '', '']);
    const grouped = allRecords.reduce((acc: any, r) => {
      if (!acc[r.user_id]) acc[r.user_id] = { totalMinutes: 0, days: 0 };
      acc[r.user_id].totalMinutes += Number(r.total_worked_minutes || 0);
      acc[r.user_id].days += 1;
      return acc;
    }, {});
    Object.entries(grouped).forEach(([uid, data]: [string, any]) => {
      rows.push([getName(uid), getEmail(uid), '', '', '', '', (data.totalMinutes / 60).toFixed(2), `${data.days} days`]);
    });

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biweekly_attendance_${pStart}_to_${pEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.dismiss('biweekly');
    toast.success('Biweekly sheet downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-foreground">All Attendance</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fetchData()}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={downloadCSV} disabled={filtered.length === 0}>
            <Download className="size-3.5" /> Download CSV
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={downloadAllBiweeklySheets}>
            <Download className="size-3.5" /> Biweekly All Workers
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Clock className="size-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Total Hours</p><p className="text-xl font-bold text-foreground">{totalHours.toFixed(1)}h</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters</span>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All employees" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.user_id} value={emp.user_id}>{emp.full_name || emp.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Attendance Records ({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="animate-pulse text-primary py-8 text-center">Loading...</div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
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
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={r.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {getName(r.user_id).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-sm block">{getName(r.user_id)}</span>
                            <span className="text-2xs text-muted-foreground">{getEmail(r.user_id)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</TableCell>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => printEmployeeAttendance(r)} title="Print PDF">
                            <Printer className="size-4" />
                          </Button>
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
