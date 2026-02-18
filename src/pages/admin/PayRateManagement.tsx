import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DollarSign, Users, Save, Search } from 'lucide-react';

const ROLES = ['admin', 'caregiver', 'it_support', 'driver', 'manager'] as const;

const PayRateManagement = () => {
  const { user } = useAuth();
  const [roleRates, setRoleRates] = useState<Record<string, string>>({});
  const [employeeRates, setEmployeeRates] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    const { data: rates } = await supabase.from('pay_rates').select('*').is('user_id', null);
    const rateMap: Record<string, string> = {};
    (rates || []).forEach((r: any) => { rateMap[r.role] = String(r.hourly_rate); });
    setRoleRates(rateMap);
    const { data: empRates } = await supabase.from('pay_rates').select('*').not('user_id', 'is', null);
    setEmployeeRates(empRates || []);
    const { data: profiles } = await supabase.from('profiles').select('*');
    setEmployees(profiles || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const logActivity = async (action: string, details?: string) => {
    if (!user) return;
    await supabase.from('activity_logs').insert({ user_id: user.id, action, details });
  };

  const saveRoleRate = async (role: string) => {
    const rate = parseFloat(roleRates[role] || '0');
    await supabase.from('pay_rates').delete().eq('role', role as any).is('user_id', null);
    const { error } = await supabase.from('pay_rates').insert({ role: role as any, hourly_rate: rate });
    if (error) { toast.error('Error saving'); return; }
    toast.success('Role rate saved');
    await logActivity('update_pay_rate', `Set ${role} rate to $${rate}`);
    fetchData();
  };

  const saveEmployeeRate = async (userId: string, rate: string) => {
    const val = parseFloat(rate || '0');
    await supabase.from('pay_rates').delete().eq('user_id', userId);
    const { error } = await supabase.from('pay_rates').insert({ user_id: userId, hourly_rate: val });
    if (error) { toast.error('Error saving'); return; }
    toast.success('Employee rate saved');
    await logActivity('update_employee_rate', `Set employee rate to $${val}`);
    fetchData();
  };

  const filteredEmployees = employees.filter(e =>
    !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-primary text-lg">Loading...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-2xl font-bold text-foreground">Pay Rate Management</h2>
        <Badge variant="secondary" className="gap-1"><DollarSign className="size-3" /> {ROLES.length} roles configured</Badge>
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="size-5 text-primary" /> Default Rates by Role</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Hourly Rate ($)</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLES.map(role => (
                  <TableRow key={role} className="hover:bg-accent/30 transition-colors">
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{role.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={roleRates[role] || ''} onChange={e => setRoleRates(prev => ({ ...prev, [role]: e.target.value }))} placeholder="0.00" className="w-28 h-8" />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => saveRoleRate(role)}>
                        <Save className="size-3" /> Save
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="size-5 text-primary" /> Individual Employee Overrides</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Current Override</TableHead>
                  <TableHead>Custom Rate ($)</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map(emp => {
                  const existing = employeeRates.find((r: any) => r.user_id === emp.user_id);
                  return (
                    <TableRow key={emp.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {(emp.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{emp.full_name || emp.email}</p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {existing ? <Badge variant="default">${Number(existing.hourly_rate).toFixed(2)}/hr</Badge> : <span className="text-xs text-muted-foreground italic">Using role default</span>}
                      </TableCell>
                      <TableCell>
                        <Input type="number" defaultValue={existing?.hourly_rate || ''} placeholder="Use role default" className="w-28 h-8" id={`rate-${emp.user_id}`} />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => {
                          const input = document.getElementById(`rate-${emp.user_id}`) as HTMLInputElement;
                          saveEmployeeRate(emp.user_id, input?.value || '0');
                        }}>
                          <Save className="size-3" /> Save
                        </Button>
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

export default PayRateManagement;
