import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function getBiweeklyRange() {
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
  return { start: periodStart, end: periodEnd };
}

const Payroll = () => {
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      
      const { start, end } = getBiweeklyRange();

      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: roles } = await supabase.from('user_roles').select('*');
      const { data: payRates } = await supabase.from('pay_rates').select('*');
      const { data: records } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0]);

      const result = (profiles || []).map(p => {
        const userRoles = (roles || []).filter((r: any) => r.user_id === p.user_id);
        const userRecords = (records || []).filter((r: any) => r.user_id === p.user_id);
        const totalHours = userRecords.reduce((sum: number, r: any) => sum + Number(r.total_worked_minutes || 0), 0) / 60;

        // Get rate: individual override first, then role default
        const individualRate = (payRates || []).find((r: any) => r.user_id === p.user_id);
        let rate = individualRate ? Number(individualRate.hourly_rate) : 0;
        if (!individualRate && userRoles.length > 0) {
          const roleRate = (payRates || []).find((r: any) => r.role === userRoles[0].role && !r.user_id);
          rate = roleRate ? Number(roleRate.hourly_rate) : 0;
        }

        return {
          ...p,
          roles: userRoles.map((r: any) => r.role),
          totalHours,
          hourlyRate: rate,
          totalPay: rate * totalHours,
        };
      });

      setData(result);
      setLoading(false);
    };
    fetch();
  }, []);

  

  const { start, end } = getBiweeklyRange();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Payroll Report</h2>
      <p className="text-sm text-muted-foreground">
        Period: {start.toLocaleDateString()} — {end.toLocaleDateString()}
      </p>

      {loading ? <div className="animate-pulse text-primary">Loading...</div> : (
        <Card>
          <CardHeader><CardTitle>Biweekly Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Rate ($/hr)</TableHead>
                    <TableHead>Total Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.full_name || emp.email}</TableCell>
                      <TableCell className="capitalize">{emp.roles.join(', ').replace(/_/g, ' ') || 'Unassigned'}</TableCell>
                      <TableCell>{emp.totalHours.toFixed(2)}h</TableCell>
                      <TableCell>${emp.hourlyRate.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold text-primary">${emp.totalPay.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={4} className="font-bold">Total</TableCell>
                    <TableCell className="font-bold text-primary">
                      ${data.reduce((sum, e) => sum + e.totalPay, 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Payroll;
