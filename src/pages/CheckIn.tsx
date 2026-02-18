import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Play, Pause, Square, Clock, User, CalendarDays, Coffee, Timer, CheckCircle2, Sun, Moon as MoonIcon } from 'lucide-react';

const BIWEEKLY_TARGET_HOURS = 80;

const CheckIn = () => {
  const { user, profile } = useAuth();
  const [record, setRecord] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [periodHours, setPeriodHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const greetingIcon = hour < 17 ? <Sun className="size-6 text-yellow-400" /> : <MoonIcon className="size-6 text-blue-300" />;

  const fetchToday = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    setRecord(data);

    // Fetch biweekly hours
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

    const { data: records } = await supabase
      .from('attendance_records')
      .select('total_worked_minutes')
      .eq('user_id', user.id)
      .gte('date', periodStart.toISOString().split('T')[0])
      .lte('date', periodEnd.toISOString().split('T')[0]);

    if (records) {
      setPeriodHours(records.reduce((sum: number, r: any) => sum + Number(r.total_worked_minutes || 0), 0) / 60);
    }
    setLoading(false);
  };

  useEffect(() => { fetchToday(); }, [user]);

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

  const logActivity = async (action: string, details?: string) => {
    if (!user) return;
    await supabase.from('activity_logs').insert({ user_id: user.id, action, details });
  };

  const handleCheckIn = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from('attendance_records').insert({
      user_id: user.id, date: today, check_in: now, status: 'checked_in', pauses: [],
    });
    if (error) { toast.error('Already checked in today or error occurred'); return; }
    toast.success('Welcome to work! Have a productive day! 🎉');
    await logActivity('check_in', `Checked in at ${new Date().toLocaleTimeString()}`);
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
    toast.success('Timer paused — enjoy your break! ☕');
    await logActivity('pause', 'Paused timer');
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
    toast.success('Back to work! 💪');
    await logActivity('resume', 'Resumed timer');
    fetchToday();
  };

  const handleCheckOut = async () => {
    if (!record) return;
    const pauses = Array.isArray(record.pauses) ? [...record.pauses] : [];
    if (pauses.length > 0 && !pauses[pauses.length - 1].end) {
      pauses[pauses.length - 1].end = new Date().toISOString();
    }
    const workedMinutes = calculateWorked({ ...record, pauses, check_out: new Date().toISOString(), status: 'checked_out' }) / 60;
    const { error } = await supabase.from('attendance_records')
      .update({ check_out: new Date().toISOString(), status: 'checked_out', pauses, total_worked_minutes: workedMinutes })
      .eq('id', record.id);
    if (error) { toast.error('Error checking out'); return; }
    toast.success('Great work today! See you tomorrow! 🌟');
    await logActivity('check_out', `Checked out. Worked ${workedMinutes.toFixed(1)} minutes`);
    fetchToday();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-primary text-lg">Loading...</div></div>;

  const status = record?.status;
  const todayHours = elapsed / 3600;
  const dailyTarget = 8;
  const dailyProgress = Math.min((todayHours / dailyTarget) * 100, 100);
  const biweeklyProgress = Math.min((periodHours / BIWEEKLY_TARGET_HOURS) * 100, 100);

  // Circular progress helper
  const CircularProgress = ({ progress, size = 120, strokeWidth = 8, children }: { progress: number; size?: number; strokeWidth?: number; children?: React.ReactNode }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth={strokeWidth} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--primary))" strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <Card className="border-border/50 bg-gradient-to-r from-primary/10 via-accent/20 to-primary/5">
        <CardContent className="flex items-center gap-4 p-6">
          {greetingIcon}
          <div>
            <h2 className="text-2xl font-bold text-foreground">{greeting}, {profile?.full_name?.split(' ')[0] || 'there'}!</h2>
            <p className="text-sm text-muted-foreground">
              {!record ? 'Ready to start your day? Check in to begin tracking.' :
                status === 'checked_in' ? 'You\'re doing great! Keep up the good work.' :
                  status === 'paused' ? 'Taking a well-deserved break. Recharge and come back strong!' :
                    'Great work today! You\'ve completed your shift.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Timer Card */}
        <Card className="md:col-span-2 lg:col-span-1 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-5 text-primary" /> Today's Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 py-6">
            <CircularProgress progress={dailyProgress} size={160} strokeWidth={10}>
              <span className="font-mono text-3xl font-bold text-foreground">{formatTime(elapsed)}</span>
              <span className="text-xs text-muted-foreground">{todayHours.toFixed(1)}h / {dailyTarget}h</span>
            </CircularProgress>

            <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
              status === 'checked_in' ? 'bg-primary/10 text-primary' :
              status === 'paused' ? 'bg-destructive/10 text-destructive' :
              status === 'checked_out' ? 'bg-muted text-muted-foreground' :
              'bg-accent text-accent-foreground'
            }`}>
              {status === 'checked_in' ? <><div className="size-2 rounded-full bg-primary animate-pulse" /> Working</> :
               status === 'paused' ? <><Coffee className="size-4" /> On Break</> :
               status === 'checked_out' ? <><CheckCircle2 className="size-4" /> Completed</> :
               <><Timer className="size-4" /> Not Started</>}
            </div>

            <div className="flex gap-3">
              {!record && (
                <Button onClick={handleCheckIn} size="lg" className="gap-2 rounded-full px-8">
                  <Play className="size-5" /> Check In
                </Button>
              )}
              {status === 'checked_in' && (
                <>
                  <Button onClick={handlePause} variant="outline" size="lg" className="gap-2 rounded-full">
                    <Pause className="size-5" /> Pause
                  </Button>
                  <Button onClick={handleCheckOut} variant="destructive" size="lg" className="gap-2 rounded-full">
                    <Square className="size-5" /> Check Out
                  </Button>
                </>
              )}
              {status === 'paused' && (
                <>
                  <Button onClick={handleResume} size="lg" className="gap-2 rounded-full">
                    <Play className="size-5" /> Resume
                  </Button>
                  <Button onClick={handleCheckOut} variant="destructive" size="lg" className="gap-2 rounded-full">
                    <Square className="size-5" /> Check Out
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Biweekly Progress */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-5 text-primary" /> Biweekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-6">
            <CircularProgress progress={biweeklyProgress} size={140} strokeWidth={10}>
              <span className="text-2xl font-bold text-foreground">{periodHours.toFixed(1)}h</span>
              <span className="text-xs text-muted-foreground">of {BIWEEKLY_TARGET_HOURS}h</span>
            </CircularProgress>
            <Progress value={biweeklyProgress} className="h-2 w-full" />
            <p className="text-xs text-muted-foreground text-center">
              {(BIWEEKLY_TARGET_HOURS - periodHours).toFixed(1)}h remaining this period
            </p>
          </CardContent>
        </Card>

        {/* Today's Details */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-5 text-primary" /> Today's Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <span className="text-sm text-muted-foreground">Check In</span>
                <span className="text-sm font-medium text-foreground">
                  {record?.check_in ? new Date(record.check_in).toLocaleTimeString() : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <span className="text-sm text-muted-foreground">Check Out</span>
                <span className="text-sm font-medium text-foreground">
                  {record?.check_out ? new Date(record.check_out).toLocaleTimeString() : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <span className="text-sm text-muted-foreground">Breaks</span>
                <span className="text-sm font-medium text-foreground">
                  {Array.isArray(record?.pauses) ? record.pauses.length : 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <span className="text-sm text-muted-foreground">Employee</span>
                <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                  {profile?.full_name || 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckIn;
