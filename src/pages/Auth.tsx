import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Camera, Square, QrCode, CheckCircle2, ArrowRight, Clock, Fingerprint, Shield } from 'lucide-react';
import { QRScanner } from '@/components/QRScanner';
import logo from '@/assets/my_city_logo.png';
import bgImage from '@/assets/bg7.jpg';

const Auth = () => {
  const { session, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Clock className="size-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left branding panel — hidden on mobile */}
      <div className="relative hidden lg:flex lg:w-[45%] overflow-hidden">
        <img src={bgImage} alt="Office Building" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.85)] via-[hsl(var(--primary)/0.6)] to-background/80" />
        <div className="relative z-10 flex flex-col justify-between p-10 h-full">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg shadow-lg" />
            <span className="text-lg font-bold text-white drop-shadow">My City Radius</span>
          </div>
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white leading-tight drop-shadow-lg">
              Smart Employee<br />Attendance Tracking
            </h2>
            <p className="text-sm text-white/80 mt-3 leading-relaxed">
              Biometric verification, real-time monitoring, QR badge scanning, and integrated payroll — all in one platform.
            </p>
            <div className="flex gap-4 mt-6">
              {[
                { icon: Fingerprint, label: 'Biometric' },
                { icon: QrCode, label: 'QR Scan' },
                { icon: Shield, label: 'Secure' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-white/70 text-xs">
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-2xs text-white/40">© 2026 My City Radius. All rights reserved.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center p-4 sm:p-6 lg:w-[55%]">
        <div className="w-full max-w-[380px] space-y-6">
          {/* Mobile header */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="My City Radius" className="h-10 w-10 rounded-lg shadow-sm" />
              <div>
                <h1 className="text-base font-bold text-foreground">My City Radius</h1>
                <p className="text-2xs text-muted-foreground">Employee Attendance System</p>
              </div>
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block text-center">
            <h1 className="text-lg font-bold text-foreground">Welcome back</h1>
            <p className="text-xs text-muted-foreground mt-1">Sign in to your account to continue</p>
          </div>

          <Card className="border-border/50 shadow-lg bg-card/80 backdrop-blur-sm">
            <Tabs defaultValue="login">
              <CardHeader className="pb-3 px-5 pt-5">
                <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/50 rounded-lg p-0.5">
                  <TabsTrigger value="login" className="text-xs rounded-md data-[state=active]:shadow-sm">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs rounded-md data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
                  <TabsTrigger value="qr" className="text-xs rounded-md gap-1 data-[state=active]:shadow-sm">
                    <Camera className="size-3" /> QR
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="login">
                <LoginForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
              <TabsContent value="signup">
                <SignupForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
              <TabsContent value="qr">
                <QRAttendancePanel />
              </TabsContent>
            </Tabs>
          </Card>

          <p className="text-center text-2xs text-muted-foreground/60 lg:hidden">
            © 2026 My City Radius
          </p>
        </div>
      </div>
    </div>
  );
};

function QRAttendancePanel() {
  const [scannerActive, setScannerActive] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{ employee: string; record_id: string; check_in: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ action: string; employee: string; worked_minutes?: number } | null>(null);
  const [dismissedRecordId, setDismissedRecordId] = useState<string | null>(null);

  const handleScan = async (data: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('qr-attendance', { body: { qr_data: data } });
      if (error || result?.error) { toast.error(result?.error || 'QR scan failed'); setProcessing(false); return; }
      if (result.action === 'checked_in') {
        setScannerActive(false); setLastResult(result);
        toast.success(`${result.employee} checked in! ✅`);
      } else if (result.action === 'prompt_checkout') {
        if (dismissedRecordId === result.record_id) { setProcessing(false); return; }
        setScannerActive(false); setPendingCheckout(result); setCheckoutDialog(true);
      } else if (result.action === 'already_completed') {
        toast.info(`${result.employee} has already completed their shift today`);
      }
    } catch { toast.error('Failed to process QR code'); }
    setProcessing(false);
  };

  const handleConfirmCheckout = async () => {
    if (!pendingCheckout) return;
    setProcessing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('qr-attendance', { body: { action: 'confirm_checkout', record_id: pendingCheckout.record_id } });
      if (error || result?.error) { toast.error(result?.error || 'Checkout failed'); }
      else { setLastResult(result); toast.success(`${result.employee} checked out! 🌟`); }
    } catch { toast.error('Checkout failed'); }
    setCheckoutDialog(false); setPendingCheckout(null); setDismissedRecordId(null); setProcessing(false);
  };

  const handleDismissCheckout = () => {
    if (pendingCheckout) setDismissedRecordId(pendingCheckout.record_id);
    setCheckoutDialog(false); setPendingCheckout(null);
  };

  const formatWorkedTime = (minutes: number) => { const h = Math.floor(minutes / 60); const m = Math.round(minutes % 60); return `${h}h ${m}m`; };

  return (
    <>
      <Dialog open={checkoutDialog} onOpenChange={(open) => { if (!open) handleDismissCheckout(); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2"><QrCode className="size-4 text-primary" />Confirm Check Out</DialogTitle>
            <DialogDescription className="text-xs">QR verified for {pendingCheckout?.employee}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10"><Square className="size-7 text-destructive" /></div>
            <p className="text-xs text-center text-foreground">End shift for {pendingCheckout?.employee}?</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={handleDismissCheckout}>Cancel</Button>
            <Button variant="destructive" size="sm" className="text-xs gap-1.5" onClick={handleConfirmCheckout} disabled={processing}>
              <ArrowRight className="size-3" /> Confirm Check Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CardContent className="px-5 pb-5">
        {lastResult ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-[hsl(var(--success)/0.1)]">
              <CheckCircle2 className="size-8 text-[hsl(var(--success))]" />
            </div>
            <p className="text-sm font-medium text-foreground">{lastResult.employee}</p>
            <p className="text-xs text-muted-foreground">
              {lastResult.action === 'checked_in' ? 'Successfully checked in' : `Checked out — ${formatWorkedTime(lastResult.worked_minutes || 0)}`}
            </p>
            <Button onClick={() => { setLastResult(null); setDismissedRecordId(null); }} variant="outline" size="sm" className="text-xs mt-2">
              Scan Another
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            {!scannerActive ? (
              <>
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/8 ring-1 ring-primary/15">
                  <Camera className="size-8 text-primary" />
                </div>
                <p className="text-xs font-medium text-foreground">Quick Attendance</p>
                <p className="text-2xs text-muted-foreground text-center max-w-[240px]">
                  Scan your QR code to check in or out without signing in
                </p>
                <Button onClick={() => setScannerActive(true)} size="sm" className="gap-1.5 rounded-full px-6 text-xs shadow-sm">
                  <Camera className="size-3.5" /> Open Camera
                </Button>
              </>
            ) : (
              <>
                <QRScanner onScan={handleScan} scanning={scannerActive} />
                {processing && <p className="text-2xs text-primary animate-pulse">Processing...</p>}
                <Button onClick={() => setScannerActive(false)} variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Square className="size-3" /> Close Camera
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </>
  );
}

function PasswordInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} placeholder={placeholder || '••••••••'} value={value} onChange={onChange} required className="pr-10 h-9 text-xs" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  );
}

function LoginForm({ isSubmitting, setIsSubmitting }: { isSubmitting: boolean; setIsSubmitting: (v: boolean) => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    if (error) toast.error(error.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-xs font-medium">Email address</Label>
          <Input id="login-email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="login-password" className="text-xs font-medium">Password</Label>
          <PasswordInput id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full h-9 text-xs font-medium shadow-sm" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </CardContent>
    </form>
  );
}

function SignupForm({ isSubmitting, setIsSubmitting }: { isSubmitting: boolean; setIsSubmitting: (v: boolean) => void }) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName);
    setIsSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Account created! You can now sign in.');
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="space-y-1.5">
          <Label htmlFor="signup-name" className="text-xs font-medium">Full Name</Label>
          <Input id="signup-name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-9 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-email" className="text-xs font-medium">Email address</Label>
          <Input id="signup-email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-password" className="text-xs font-medium">Password</Label>
          <PasswordInput id="signup-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full h-9 text-xs font-medium shadow-sm" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </Button>
        <CardDescription className="text-center text-2xs">
          First user to sign up becomes the admin
        </CardDescription>
      </CardContent>
    </form>
  );
}

export default Auth;
