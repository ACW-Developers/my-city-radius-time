import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Save, Shield, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

function PasswordField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || '••••••••'} className="pr-10" />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

const ChangePassword = () => {
  const { profile, user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 4 : 3;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-destructive', 'bg-yellow-500', 'bg-primary', 'bg-green-500'][strength];

  const handleChange = async () => {
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success('Password updated successfully'); setPassword(''); setConfirm(''); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Security</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Change Password */}
        <Card className="border-border/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-5 text-primary" /> Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PasswordField label="New Password" value={password} onChange={setPassword} />
            {password.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength ? strengthColor : 'bg-muted'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{strengthLabel}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-1 ${password.length >= 6 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {password.length >= 6 ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />} At least 6 characters
                  </div>
                  <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-primary' : 'text-muted-foreground'}`}>
                    {/[A-Z]/.test(password) ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />} Uppercase letter
                  </div>
                  <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-primary' : 'text-muted-foreground'}`}>
                    {/[0-9]/.test(password) ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />} Number
                  </div>
                  <div className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(password) ? 'text-primary' : 'text-muted-foreground'}`}>
                    {/[^A-Za-z0-9]/.test(password) ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />} Special character
                  </div>
                </div>
              </div>
            )}
            <PasswordField label="Confirm Password" value={confirm} onChange={setConfirm} />
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="size-3" /> Passwords do not match</p>
            )}
            <Button onClick={handleChange} disabled={saving || password.length < 6 || password !== confirm} className="w-full gap-2">
              <Save className="size-4" /> {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>

        {/* Security Info */}
        <Card className="border-border/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Shield className="size-5 text-primary" /> Account Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{profile?.email}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Account Status</span>
              <Badge variant={profile?.is_active ? 'default' : 'destructive'}>{profile?.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Authentication</span>
              <Badge variant="secondary">Email + Password</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{user?.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChangePassword;
