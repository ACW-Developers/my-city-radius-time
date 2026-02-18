import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const ROLES = ['admin', 'caregiver', 'it_support', 'driver', 'manager'] as const;

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at');
    const { data: roles } = await supabase.from('user_roles').select('*');
    
    const merged = (profiles || []).map(p => ({
      ...p,
      roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
    }));
    setEmployees(merged);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const assignRole = async (userId: string, role: string) => {
    const { error } = await supabase.from('user_roles').insert(
      { user_id: userId, role: role as any }
    );
    if (error) toast.error('Error assigning role');
    else { toast.success('Role assigned'); fetchEmployees(); }
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as any);
    if (error) toast.error('Error removing role');
    else { toast.success('Role removed'); fetchEmployees(); }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_active: !isActive }).eq('user_id', userId);
    if (error) toast.error('Error updating status');
    else { toast.success('Status updated'); fetchEmployees(); }
  };

  
  if (loading) return <div className="animate-pulse text-primary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Employee Management</h2>
      <Card>
        <CardHeader><CardTitle>All Employees</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Assign Role</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.full_name || 'N/A'}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {emp.roles.map((role: string) => (
                          <Badge key={role} variant="secondary" className="cursor-pointer capitalize" onClick={() => removeRole(emp.user_id, role)}>
                            {role.replace('_', ' ')} ×
                          </Badge>
                        ))}
                        {emp.roles.length === 0 && <span className="text-xs text-muted-foreground">Unassigned</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select onValueChange={(v) => assignRole(emp.user_id, v)}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Add role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.filter(r => !emp.roles.includes(r)).map(r => (
                            <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch checked={emp.is_active} onCheckedChange={() => toggleActive(emp.user_id, emp.is_active)} />
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

export default EmployeeManagement;
