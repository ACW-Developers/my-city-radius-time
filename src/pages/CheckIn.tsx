import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Play, Pause, Square, Clock, User, CalendarDays, Coffee, Timer,
  CheckCircle2, Sun, Moon as MoonIcon, QrCode, ScanLine,
  ArrowRight, Zap, Activity, Camera,
} from 'lucide-react';
import { getTodayDateStringAZ, getCurrentHourAZ, formatTimeAZ, formatDateAZ } from '@/lib/timezone';
import { QRScanner } from '@/components/QRScanner';

const BIWEEKLY_TARGET_HOURS = 80;
const PAUSE_REASONS = ['Lunch Break', 'Appointment', 'Personal Break', 'Meeting', 'Other'];

const CheckIn = () => {
  const { user, profile } = useAuth();
  const [record, setRecord] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [periodHours, setPeriodHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pause reason dialog
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  // QR Scanner state
  const [scannerActive, setScannerActive] = useState(false);

  // QR checkout confirmation dialog
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [qrScannedUser, setQrScannedUser] = useState<any>(null);
  const [dismissedCheckout, setDismissedCheckout] = useState(false);

  // Badge code manual entry
  const [badgeCode, setBadgeCode] = useState('');
  const [badgeLoading, setBadgeLoading] = useState(false);

  const today = getTodayDateStringAZ();
  const hour = getCurrentHourAZ();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const greetingIcon = hour < 17 ? <Sun className="size-4 text-warning" /> : <MoonIcon className="size-4 text-primary" />;

  const fetchToday = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    setRecord(data);

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

  // Auto-stop at 5pm Arizona
  useEffect(() => {
    if (!record || record.status === 'checked_out') return;
    const check = () => {
      if (getCurrentHourAZ() >= 17) autoCheckOut();
    };
    const interval = setInterval(check, 60000);
    check();
    return () => clearInterval(interval);
  }, [record]);

  const autoCheckOut = async () => {
    if (!record || record.status === 'checked_out') return;
    const pauses = Array.isArray(record.pauses) ? [...record.pauses] : [];
    if (pauses.length > 0 && !pauses[pauses.length - 1].end) {
      pauses[pauses.length - 1].end = new Date().toISOString();
    }
    const workedMinutes = calculateWorked({ ...record, pauses, check_out: new Date().toISOString(), status: 'checked_out' }) / 60;
    await supabase.from('attendance_records')
      .update({ check_out: new Date().toISOString(), status: 'checked_out', pauses, total_worked_minutes: workedMinutes })
      .eq('id', record.id);
    if (user) await supabase.from('activity_logs').insert({ user_id: user.id, action: 'auto_checkout', details: 'Automatically checked out at 5:00 PM Arizona time' });
    toast.info('Your timer was automatically stopped at 5:00 PM');
    fetchToday();
  };

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

  const performCheckIn = async (method: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from('attendance_records').insert({
      user_id: user.id, date: today, check_in: now, status: 'checked_in', pauses: [],
    });
    if (error) { toast.error('Already checked in today or error occurred'); return; }
    toast.success('Welcome to work! Have a productive day! 🎉');
    await logActivity('check_in', `Checked in via ${method} at ${formatTimeAZ(new Date())}`);
    fetchToday();
  };

  const handleCheckIn = () => performCheckIn('manual');

  const handleBadgeCheckIn = async () => {
    if (!badgeCode.trim()) { toast.error('Please enter a badge code'); return; }
    setBadgeLoading(true);
    try {
      const { data: matchedProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, badge_code')
        .eq('badge_code', badgeCode.trim().toUpperCase())
        .maybeSingle();

      if (!matchedProfile) { toast.error('Invalid badge code'); return; }
      if (matchedProfile.user_id !== user?.id) { toast.error('This badge does not belong to you'); return; }

      await performCheckIn('badge');
      setBadgeCode('');
    } finally {
      setBadgeLoading(false);
    }
  };

  const handleQRScan = async (data: string) => {
    // Expected QR format: MCR:<user_id>:<badge_code>
    if (!data.startsWith('MCR:')) {
      toast.error('Invalid QR code format');
      return;
    }

    const parts = data.split(':');
    if (parts.length !== 3) {
      toast.error('Invalid QR code');
      return;
    }

    const [, scannedUserId, scannedBadge] = parts;

    // Verify the badge belongs to the user
    if (scannedUserId !== user?.id) {
      toast.error('This QR code does not belong to you');
      return;
    }

    // Verify badge code matches
    const { data: matchedProfile } = await supabase
      .from('profiles')
      .select('user_id, full_name, badge_code')
      .eq('user_id', scannedUserId)
      .eq('badge_code', scannedBadge)
      .maybeSingle();

    if (!matchedProfile) {
      toast.error('QR code verification failed');
      return;
    }

    setScannerActive(false);

    // Check current attendance status
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', scannedUserId)
      .eq('date', today)
      .maybeSingle();

    if (!existingRecord) {
      // No record today — check in
      await performCheckIn('qr_code');
    } else if (existingRecord.status === 'checked_in' || existingRecord.status === 'paused') {
      // Already checked in — prompt checkout only if not previously dismissed
      if (!dismissedCheckout) {
        setQrScannedUser(matchedProfile);
        setCheckoutDialog(true);
      }
    } else {
      toast.info('You have already completed your shift today');
    }
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

  const handleQRCheckOut = async () => {
    setCheckoutDialog(false);
    setDismissedCheckout(false);
    await handleCheckOut();
  };

  const handleDismissCheckoutDialog = () => {
    setCheckoutDialog(false);
    setDismissedCheckout(true);
  };

  const handlePauseClick = () => {
    setPauseReason('');
    setCustomReason('');
    setPauseOpen(true);
  };

  const handlePauseConfirm = async () => {
    if (!record) return;
    const reason = pauseReason === 'Other' ? customReason : pauseReason;
    if (!reason.trim()) { toast.error('Please select or enter a reason'); return; }

    const pauses = Array.isArray(record.pauses) ? [...record.pauses] : [];
    pauses.push({ start: new Date().toISOString(), end: null, reason });
    const workedMinutes = calculateWorked(record) / 60;
    const { error } = await supabase.from('attendance_records')
      .update({ pauses, status: 'paused', total_worked_minutes: workedMinutes })
      .eq('id', record.id);
    if (error) { toast.error('Error pausing'); return; }
    setPauseOpen(false);
    toast.success(`Timer paused — ${reason} ☕`);
    await logActivity('pause', `Paused: ${reason}`);
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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-pulse text-primary text-sm">Loading...</div>
    </div>
  );

  const status = record?.status;
  const todayHours = elapsed / 3600;
  const dailyTarget = 8;
  const dailyProgress = Math.min((todayHours / dailyTarget) * 100, 100);
  const biweeklyProgress = Math.min((periodHours / BIWEEKLY_TARGET_HOURS) * 100, 100);

  const CircularProgress = ({ progress, size = 100, strokeWidth = 6, children }: { progress: number; size?: number; strokeWidth?: number; children?: React.ReactNode }) => {
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

  const StatusBadge = () => {
    const config = {
      checked_in: { icon: <Activity className="size-3" />, text: 'Working', cls: 'bg-primary/10 text-primary' },
      paused: { icon: <Coffee className="size-3" />, text: 'On Break', cls: 'bg-warning/10 text-warning' },
      checked_out: { icon: <CheckCircle2 className="size-3" />, text: 'Completed', cls: 'bg-muted text-muted-foreground' },
    };
    const current = config[status as keyof typeof config] || { icon: <Timer className="size-3" />, text: 'Not Started', cls: 'bg-accent text-accent-foreground' };
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium ${current.cls}`}>
        {status === 'checked_in' && <span className="size-1.5 rounded-full bg-primary animate-pulse" />}
        {status !== 'checked_in' && current.icon}
        {current.text}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Pause Reason Dialog */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Pause Timer</DialogTitle>
            <DialogDescription className="text-xs">Select a reason for your break</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Select value={pauseReason} onValueChange={setPauseReason}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a reason..." /></SelectTrigger>
              <SelectContent>
                {PAUSE_REASONS.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {pauseReason === 'Other' && (
              <Input value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Enter your reason..." className="h-8 text-xs" />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setPauseOpen(false)}>Cancel</Button>
            <Button size="sm" className="text-xs gap-1.5" onClick={handlePauseConfirm} disabled={!pauseReason || (pauseReason === 'Other' && !customReason.trim())}>
              <Pause className="size-3" /> Pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Checkout Confirmation Dialog */}
      <Dialog open={checkoutDialog} onOpenChange={(open) => { if (!open) handleDismissCheckoutDialog(); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <QrCode className="size-4 text-primary" />
              Confirm Check Out
            </DialogTitle>
            <DialogDescription className="text-xs">
              QR code verified for {qrScannedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <Square className="size-7 text-destructive" />
            </div>
            <p className="text-xs text-center text-foreground">
              You are currently checked in. Do you want to end your shift now?
            </p>
            <p className="text-2xs text-muted-foreground text-center">
              Time worked: <span className="font-mono font-bold">{formatTime(elapsed)}</span>
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={handleDismissCheckoutDialog}>Cancel</Button>
            <Button variant="destructive" size="sm" className="text-xs gap-1.5" onClick={handleQRCheckOut}>
              <ArrowRight className="size-3" /> Confirm Check Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top Bar: Greeting + Date + Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {greetingIcon}
          <div>
            <h2 className="text-lg font-semibold text-foreground">{greeting}, {profile?.full_name?.split(' ')[0] || 'there'}</h2>
            <p className="text-2xs text-muted-foreground">{formatDateAZ(new Date())} · Arizona Time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge />
        </div>
      </div>

      {/* Quick Check-In Methods */}
      {!record && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              <Zap className="size-3.5 text-primary" /> Quick Check-In
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Tabs defaultValue="qr" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="qr" className="gap-1.5 text-2xs"><Camera className="size-3" /> QR Scan</TabsTrigger>
                <TabsTrigger value="manual" className="gap-1.5 text-2xs"><Play className="size-3" /> Manual</TabsTrigger>
                <TabsTrigger value="badge" className="gap-1.5 text-2xs"><QrCode className="size-3" /> Badge</TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="mt-3">
                <div className="flex flex-col items-center gap-3 py-2">
                  {!scannerActive ? (
                    <>
                      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                        <Camera className="size-8 text-primary" />
                      </div>
                      <p className="text-2xs text-muted-foreground text-center">Open camera to scan your QR code and check in</p>
                      <Button onClick={() => { setDismissedCheckout(false); setScannerActive(true); }} size="sm" className="gap-1.5 rounded-full px-6 text-xs">
                        <Camera className="size-3.5" /> Open Camera
                      </Button>
                    </>
                  ) : (
                    <>
                      <QRScanner onScan={handleQRScan} scanning={scannerActive} />
                      <Button onClick={() => setScannerActive(false)} variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Square className="size-3" /> Close Camera
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="manual" className="mt-3">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                    <Play className="size-7 text-primary" />
                  </div>
                  <p className="text-2xs text-muted-foreground text-center">Tap to start your shift</p>
                  <Button onClick={handleCheckIn} size="sm" className="gap-1.5 rounded-full px-6 text-xs">
                    <Play className="size-3.5" /> Check In
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="badge" className="mt-3">
                <div className="flex flex-col items-center gap-3 py-3">
                  <div className="flex w-full max-w-xs gap-2">
                    <div className="relative flex-1">
                      <ScanLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Enter badge code..."
                        value={badgeCode}
                        onChange={e => setBadgeCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && handleBadgeCheckIn()}
                        className="pl-8 h-8 font-mono tracking-wider uppercase text-xs"
                        maxLength={8}
                      />
                    </div>
                    <Button onClick={handleBadgeCheckIn} disabled={badgeLoading} size="sm" className="text-xs">
                      {badgeLoading ? '...' : 'Go'}
                    </Button>
                  </div>
                  <p className="text-2xs text-muted-foreground">Type your badge code manually</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* QR Scanner for checkout when already checked in */}
      {record && (record.status === 'checked_in' || record.status === 'paused') && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              <Camera className="size-3.5 text-primary" /> QR Check Out
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {!scannerActive ? (
              <Button onClick={() => { setDismissedCheckout(false); setScannerActive(true); }} variant="outline" size="sm" className="gap-1.5 text-xs w-full">
                <Camera className="size-3.5" /> Scan QR to Check Out
              </Button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <QRScanner onScan={handleQRScan} scanning={scannerActive} />
                <Button onClick={() => setScannerActive(false)} variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Square className="size-3" /> Close Camera
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Timer Card */}
        <Card className="sm:col-span-2 lg:col-span-1 border-border/50">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
              <Clock className="size-3.5 text-primary" /> Today's Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 px-4 pb-4 pt-2">
            <CircularProgress progress={dailyProgress} size={130} strokeWidth={8}>
              <span className="font-mono text-xl font-bold text-foreground">{formatTime(elapsed)}</span>
              <span className="text-2xs text-muted-foreground">{todayHours.toFixed(1)}h / {dailyTarget}h</span>
            </CircularProgress>

            <StatusBadge />

            <div className="flex gap-2 flex-wrap justify-center">
              {status === 'checked_in' && (
                <>
                  <Button onClick={handlePauseClick} variant="outline" size="sm" className="gap-1.5 rounded-full text-xs">
                    <Pause className="size-3.5" /> Pause
                  </Button>
                  <Button onClick={handleCheckOut} variant="destructive" size="sm" className="gap-1.5 rounded-full text-xs">
                    <Square className="size-3.5" /> Check Out
                  </Button>
                </>
              )}
              {status === 'paused' && (
                <>
                  <Button onClick={handleResume} size="sm" className="gap-1.5 rounded-full text-xs">
                    <Play className="size-3.5" /> Resume
                  </Button>
                  <Button onClick={handleCheckOut} variant="destructive" size="sm" className="gap-1.5 rounded-full text-xs">
                    <Square className="size-3.5" /> Check Out
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Biweekly Progress */}
        <Card className="border-border/50">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
              <CalendarDays className="size-3.5 text-primary" /> Biweekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 px-4 pb-4 pt-2">
            <CircularProgress progress={biweeklyProgress} size={110} strokeWidth={7}>
              <span className="text-lg font-bold text-foreground">{periodHours.toFixed(1)}h</span>
              <span className="text-2xs text-muted-foreground">of {BIWEEKLY_TARGET_HOURS}h</span>
            </CircularProgress>
            <Progress value={biweeklyProgress} className="h-1.5 w-full" />
            <p className="text-2xs text-muted-foreground text-center">
              {(BIWEEKLY_TARGET_HOURS - periodHours).toFixed(1)}h remaining
            </p>
          </CardContent>
        </Card>

        {/* Today's Details */}
        <Card className="border-border/50">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
              <User className="size-3.5 text-primary" /> Today's Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-2">
            <div className="text-center pb-1">
              <p className="text-xs font-medium text-foreground">{formatDateAZ(new Date())}</p>
              <p className="text-2xs text-muted-foreground">Arizona Time (MST)</p>
            </div>
            <Separator />
            <div className="space-y-1.5">
              {[
                { label: 'Check In', value: record?.check_in ? formatTimeAZ(record.check_in) : '—' },
                { label: 'Check Out', value: record?.check_out ? formatTimeAZ(record.check_out) : '—' },
                { label: 'Breaks', value: String(Array.isArray(record?.pauses) ? record.pauses.length : 0) },
                { label: 'Employee', value: profile?.full_name || 'N/A' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-1.5">
                  <span className="text-2xs text-muted-foreground">{item.label}</span>
                  <span className="text-2xs font-medium text-foreground truncate max-w-[120px]">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Break History */}
      {record && Array.isArray(record.pauses) && record.pauses.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
              <Coffee className="size-3.5 text-warning" /> Break History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {record.pauses.map((p: any, i: number) => {
                const start = new Date(p.start);
                const end = p.end ? new Date(p.end) : null;
                const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;
                return (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-border/50 px-2.5 py-2">
                    <Coffee className="size-3 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-2xs font-medium text-foreground truncate">{p.reason || 'Break'}</p>
                      <p className="text-2xs text-muted-foreground">
                        {formatTimeAZ(start)} {end ? `→ ${formatTimeAZ(end)}` : '→ ongoing'}
                        {duration != null && ` · ${duration}m`}
                      </p>
                    </div>
                    <Badge variant={end ? 'secondary' : 'default'} className="text-2xs shrink-0">
                      {end ? 'Done' : 'Active'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CheckIn;
