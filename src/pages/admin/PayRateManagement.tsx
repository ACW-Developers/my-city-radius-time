import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ROLES = ['admin', 'caregiver', 'it_support', 'driver', 'manager'] as const;

const PayRateManagement = () => {
  const { isAdmin } = useAuth();
  const [roleRates, setRoleRates] = useState<Record<string, string>>({});
  const [employeeRates, setEmployeeRates] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    // Role defaults
    const { data: rates } = await supabase.from('pay_rates').select('*').is('user_id', null);
    const rateMap: Record<string, string> = {};
    (rates || []).forEach((r: any) => { rateMap[r.role] = String(r.hourly_rate); });
    setRoleRates(rateMap);

    // Employee overrides
    const { data: empRates } = await supabase.from('pay_rates').select('*').not('user_id', 'is', null);
    setEmployeeRates(empRates || []);

    // Employees
    const { data: profiles } = await supabase.from('profiles').select('*');
    setEmployees(profiles || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  const saveRoleRate = async (role: string) => {
    const rate = parseFloat(roleRates[role] || '0');
    await supabase.from('pay_rates').delete().eq('role', role as any).is('user_id', null);
    const { error } = await supabase.from('pay_rates').insert({ role: role as any, hourly_rate: rate });
    if (error) { toast.error('Error saving'); return; }
    toast.success('Role rate saved');
    fetchData();
  };

  const saveEmployeeRate = async (userId: string, rate: string) => {
    const val = parseFloat(rate || '0');
    await supabase.from('pay_rates').delete().eq('user_id', userId);
    const { error } = await supabase.from('pay_rates').insert({ user_id: userId, hourly_rate: val });
    if (error) { toast.error('Error saving'); return; }
    toast.success('Employee rate saved');
    fetchData();
  };

  if (!isAdmin) return <p className="text-destructive">Access denied</p>;
  if (loading) return <div className="animate-pulse text-primary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Pay Rate Management</h2>

      <Card>
        <CardHeader><CardTitle>Default Rates by Role</CardTitle></CardHeader>
        <CardContent>
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
                <TableRow key={role}>
                  <TableCell className="capitalize font-medium">{role.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={roleRates[role] || ''}
                      onChange={e => setRoleRates(prev => ({ ...prev, [role]: e.target.value }))}
                      placeholder="0.00"
                      className="w-28"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => saveRoleRate(role)}>Save</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Individual Employee Overrides</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Custom Rate ($)</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => {
                const existing = employeeRates.find((r: any) => r.user_id === emp.user_id);
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.full_name || emp.email}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={existing?.hourly_rate || ''}
                        placeholder="Use role default"
                        className="w-28"
                        id={`rate-${emp.user_id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => {
                        const input = document.getElementById(`rate-${emp.user_id}`) as HTMLInputElement;
                        saveEmployeeRate(emp.user_id, input?.value || '0');
                      }}>Save</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayRateManagement;
