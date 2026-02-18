import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Play, Pause, Square, Clock } from 'lucide-react';

const CheckIn = () => {
  const { user } = useAuth();
  const [record, setRecord] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchToday = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    setRecord(data);
    setLoading(false);
  };

  useEffect(() => { fetchToday(); }, [user]);

  // Calculate worked seconds
  const calculateWorked = (rec: any): number => {
    if (!rec?.check_in) return 0;
    const checkIn = new Date(rec.check_in).getTime();
    const now = rec.status === 'checked_out' && rec.check_out
      ? new Date(rec.check_out).getTime()
      : Date.now();

    let pausedMs = 0;
    const pauses = Array.isArray(rec.pauses) ? rec.pauses : [];
    for (const p of pauses) {
      const start = new Date(p.start).getTime();
      const end = p.end ? new Date(p.end).getTime() : Date.now();
      pausedMs += end - start;
    }

    return Math.max(0, Math.floor((now - checkIn - pausedMs) / 1000));
  };

  useEffect(() => {
    if (record && (record.status === 'checked_in' || record.status === 'paused')) {
      const tick = () => setElapsed(calculateWorked(record));
      tick();
      timerRef.current = setInterval(tick, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else if (record) {
      setElapsed(calculateWorked(record));
    }
  }, [record]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCheckIn = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from('attendance_records').insert({
      user_id: user.id,
      date: today,
      check_in: now,
      status: 'checked_in',
      pauses: [],
    });
    if (error) { toast.error('Already checked in today or error occurred'); return; }
    toast.success('Checked in!');
    fetchToday();
  };

  const handlePause = async () => {
    if (!record) return;
    const pauses = Array.isArray(record.pauses) ? [...record.pauses] : [];
    pauses.push({ start: new Date().toISOString(), end: null });
    const workedMinutes = calculateWorked(record) / 60;
    const { error } = await supabase.from('attendance_records')
      .update({ pauses, status: 'paused', total_worked_minutes: workedMinutes })
      .eq('id', record.id);
    if (error) { toast.error('Error pausing'); return; }
    toast.success('Timer paused');
    fetchToday();
  };

  const handleResume = async () => {
    if (!record) return;
    const pauses = Array.isArray(record.pauses) ? [...record.pauses] : [];
    if (pauses.length > 0 && !pauses[pauses.length - 1].end) {
      pauses[pauses.length - 1].end = new Date().toISOString();
    }
    const { error } = await supabase.from('attendance_records')
      .update({ pauses, status: 'checked_in' })
      .eq('id', record.id);
    if (error) { toast.error('Error resuming'); return; }
    toast.success('Timer resumed');
    fetchToday();
  };

  const handleCheckOut = async () => {
    if (!record) return;
    const pauses = Array.isArray(record.pauses) ? [...record.pauses] : [];
    // Close any open pause
    if (pauses.length > 0 && !pauses[pauses.length - 1].end) {
      pauses[pauses.length - 1].end = new Date().toISOString();
    }
    const workedMinutes = calculateWorked({ ...record, pauses, check_out: new Date().toISOString(), status: 'checked_out' }) / 60;
    const { error } = await supabase.from('attendance_records')
      .update({
        check_out: new Date().toISOString(),
        status: 'checked_out',
        pauses,
        total_worked_minutes: workedMinutes,
      })
      .eq('id', record.id);
    if (error) { toast.error('Error checking out'); return; }
    toast.success('Checked out!');
    fetchToday();
  };

  if (loading) return <div className="animate-pulse text-primary">Loading...</div>;

  const status = record?.status;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Check In / Out</h2>

      <Card className="overflow-hidden">
        <CardHeader className="bg-primary/5 text-center">
          <CardTitle className="text-lg">Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 p-8">
          {/* Timer Display */}
          <div className="flex items-center gap-3">
            <Clock className="size-8 text-primary" />
            <span className="font-mono text-5xl font-bold text-foreground">{formatTime(elapsed)}</span>
          </div>

          <p className={`text-sm font-medium ${status === 'checked_in' ? 'text-primary' : status === 'paused' ? 'text-orange-500' : status === 'checked_out' ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            {status === 'checked_in' ? '● Working' : status === 'paused' ? '❚❚ Paused' : status === 'checked_out' ? '✓ Checked Out' : 'Ready to start'}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!record && (
              <Button onClick={handleCheckIn} size="lg" className="gap-2">
                <Play className="size-5" /> Check In
              </Button>
            )}
            {status === 'checked_in' && (
              <>
                <Button onClick={handlePause} variant="outline" size="lg" className="gap-2">
                  <Pause className="size-5" /> Pause
                </Button>
                <Button onClick={handleCheckOut} variant="destructive" size="lg" className="gap-2">
                  <Square className="size-5" /> Check Out
                </Button>
              </>
            )}
            {status === 'paused' && (
              <>
                <Button onClick={handleResume} size="lg" className="gap-2">
                  <Play className="size-5" /> Resume
                </Button>
                <Button onClick={handleCheckOut} variant="destructive" size="lg" className="gap-2">
                  <Square className="size-5" /> Check Out
                </Button>
              </>
            )}
          </div>

          {record?.check_in && (
            <div className="w-full rounded-lg border border-border/50 p-4 text-sm text-muted-foreground">
              <p>Checked in at: {new Date(record.check_in).toLocaleTimeString()}</p>
              {record.check_out && <p>Checked out at: {new Date(record.check_out).toLocaleTimeString()}</p>}
              {Array.isArray(record.pauses) && record.pauses.length > 0 && (
                <p>Breaks taken: {record.pauses.length}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckIn;
