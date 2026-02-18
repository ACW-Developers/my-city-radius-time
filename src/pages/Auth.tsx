import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/my_city_logo.png';
import bgImage from '@/assets/bg7.jpg';

const Auth = () => {
  const { session, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-lg">Loading...</div>
      </div>
    );
  }

  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen">
      {/* Left side - Image only */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden">
        <img src={bgImage} alt="Office Building" className="absolute inset-0 h-full w-full object-cover" />
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center bg-gradient-to-br from-background via-accent/10 to-background p-6 lg:w-1/2">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-3">
            <img src={logo} alt="My City Radius" className="h-16 w-auto" />
            <h1 className="text-2xl font-bold text-foreground">My City Radius</h1>
            <h2 className="text-xl font-semibold text-foreground">Welcome Back</h2>
            <p className="text-sm text-muted-foreground">Sign in to manage your workspace</p>
          </div>

          <Card className="border-border/50 shadow-xl backdrop-blur-sm">
            <Tabs defaultValue="login">
              <CardHeader className="pb-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="login">
                <LoginForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
              <TabsContent value="signup">
                <SignupForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};

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
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <PasswordInput id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
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
    if (error) toast.error(error.message);
    else toast.success('Account created! Check your email to verify your account.');
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-name">Full Name</Label>
          <Input id="signup-name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <PasswordInput id="signup-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </Button>
        <CardDescription className="text-center text-xs">
          First user to sign up becomes the admin
        </CardDescription>
      </CardContent>
    </form>
  );
}

export default Auth;
