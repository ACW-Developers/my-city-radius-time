import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Save } from 'lucide-react';

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
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success('Password updated'); setPassword(''); setConfirm(''); }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Change Password</h2>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-5 text-primary" /> Update Your Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PasswordField label="New Password" value={password} onChange={setPassword} />
          <PasswordField label="Confirm Password" value={confirm} onChange={setConfirm} />
          <Button onClick={handleChange} disabled={saving} className="w-full gap-2">
            <Save className="size-4" /> {saving ? 'Updating...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
