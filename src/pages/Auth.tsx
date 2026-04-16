import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Fingerprint, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import logo from '@/assets/my_city_logo.png';
import bgImage from '@/assets/bg7.jpg';

const Auth = () => {
  const { session, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-sm">Loading...</div>
      </div>
    );
  }

  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden">
        <img src={bgImage} alt="Office Building" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background/60" />
        <div className="relative z-10 flex flex-col justify-end p-10">
          <h2 className="text-3xl font-bold text-primary-foreground drop-shadow-lg">My City Radius</h2>
          <p className="text-sm text-primary-foreground/80 mt-2 max-w-md drop-shadow">
            Employee attendance tracking with biometric verification, real-time monitoring, and payroll integration.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-4 sm:p-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-5">
          <div className="flex flex-col items-center gap-2">
            <img src={logo} alt="My City Radius" className="h-12 w-auto" />
            <h1 className="text-lg font-bold text-foreground">My City Radius</h1>
            <p className="text-xs text-muted-foreground">Sign in to manage your workspace</p>
          </div>

          <Card className="border-border/50 shadow-md">
            <Tabs defaultValue="login">
              <CardHeader className="pb-2 px-4 pt-4">
                <TabsList className="grid w-full grid-cols-3 h-8">
                  <TabsTrigger value="login" className="text-xs">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs">Sign Up</TabsTrigger>
                  <TabsTrigger value="fingerprint" className="text-xs gap-1"><Fingerprint className="size-3" /> Attend</TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="login">
                <LoginForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
              <TabsContent value="signup">
                <SignupForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
              <TabsContent value="fingerprint">
                <FingerprintAttendancePanel />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function FingerprintAttendancePanel() {
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ action: string; employee: string; worked_minutes?: number } | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);

  const handleFingerprintAttendance = async () => {
    setProcessing(true);
    setNotRegistered(false);

    try {
      // Use discoverable credentials — no email needed.
      // The browser will show all registered credentials for this RP.
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          userVerification: 'required',
          timeout: 60000,
          rpId: window.location.hostname,
        },
      }) as PublicKeyCredential | null;

      if (!assertion) {
        setProcessing(false);
        return;
      }

      // Match credential_id back to a user
      const credentialId = bufferToBase64(assertion.rawId);

      const { data: credential } = await supabase
        .from('webauthn_credentials')
        .select('user_id')
        .eq('credential_id', credentialId)
        .maybeSingle();

      if (!credential) {
        setNotRegistered(true);
        setProcessing(false);
        return;
      }

      // Fingerprint verified — call edge function for attendance
      const { data: result, error } = await supabase.functions.invoke('qr-attendance', {
        body: { fingerprint_user_id: credential.user_id },
      });

      if (error || result?.error) {
        toast.error(result?.error || 'Attendance failed');
        setProcessing(false);
        return;
      }

      if (result.action === 'checked_in') {
        setLastResult(result);
        toast.success(`${result.employee} checked in! ✅`);
      } else if (result.action === 'checked_out') {
        setLastResult(result);
        toast.success(`${result.employee} checked out! 🌟`);
      } else if (result.action === 'already_completed') {
        toast.info(`${result.employee} has already completed their shift today`);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User cancelled — do nothing
      } else if (err.name === 'SecurityError' || err.message?.includes('discoverable')) {
        setNotRegistered(true);
      } else {
        toast.error(err.message || 'Fingerprint verification failed');
      }
    }

    setProcessing(false);
  };

  const formatWorkedTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  return (
    <CardContent className="px-4 pb-4">
      {lastResult ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-8 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">{lastResult.employee}</p>
          <p className="text-xs text-muted-foreground">
            {lastResult.action === 'checked_in' ? 'Successfully checked in' : `Checked out — ${formatWorkedTime(lastResult.worked_minutes || 0)}`}
          </p>
          <Button onClick={() => { setLastResult(null); setNotRegistered(false); }} variant="outline" size="sm" className="text-xs mt-2">
            Next Employee
          </Button>
        </div>
      ) : notRegistered ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <p className="text-xs font-medium text-foreground">Fingerprint Not Registered</p>
          <p className="text-2xs text-muted-foreground text-center">
            Please sign in and register your fingerprint in your Profile page first.
          </p>
          <Button onClick={() => setNotRegistered(false)} variant="outline" size="sm" className="text-xs mt-2">
            Try Again
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4">
          <button
            onClick={handleFingerprintAttendance}
            disabled={processing}
            className="group flex size-24 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-all duration-300 active:scale-95 disabled:opacity-50"
          >
            <Fingerprint className={`size-12 text-primary transition-transform duration-300 group-hover:scale-110 ${processing ? 'animate-pulse' : ''}`} />
          </button>
          <p className="text-sm font-medium text-foreground">{processing ? 'Verifying...' : 'Tap to Sign In'}</p>
          <p className="text-2xs text-muted-foreground text-center max-w-[220px]">
            Place your finger on the sensor to check in or out — no login needed
          </p>
        </div>
      )}
    </CardContent>
  );
}

function PasswordInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder || '••••••••'}
        value={value}
        onChange={onChange}
        required
        className="pr-10 h-8 text-xs"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
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
      <CardContent className="space-y-3 px-4 pb-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-xs">Email</Label>
          <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-8 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="login-password" className="text-xs">Password</Label>
          <PasswordInput id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full h-8 text-xs" disabled={isSubmitting}>
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
      <CardContent className="space-y-3 px-4 pb-4">
        <div className="space-y-1.5">
          <Label htmlFor="signup-name" className="text-xs">Full Name</Label>
          <Input id="signup-name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-8 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-email" className="text-xs">Email</Label>
          <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-8 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-password" className="text-xs">Password</Label>
          <PasswordInput id="signup-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full h-8 text-xs" disabled={isSubmitting}>
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
