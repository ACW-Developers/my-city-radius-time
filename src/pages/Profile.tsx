import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Mail, Shield, Save } from 'lucide-react';

const Profile = () => {
  const { profile, roles, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', profile.user_id);
    setSaving(false);
    if (error) toast.error('Error updating profile');
    else { toast.success('Profile updated'); refreshProfile(); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-foreground">My Profile</h2>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {(profile?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-lg">{profile?.full_name || 'User'}</CardTitle>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="flex gap-1 mt-1">
                {roles.map(r => <Badge key={r} variant="secondary" className="capitalize text-xs">{r.replace('_', ' ')}</Badge>)}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> Email</Label>
            <Input value={profile?.email || ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><User className="size-4 text-muted-foreground" /> Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Shield className="size-4 text-muted-foreground" /> Roles</Label>
            <Input value={roles.length > 0 ? roles.map(r => r.replace('_', ' ')).join(', ') : 'Unassigned'} disabled className="bg-muted/50 capitalize" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="size-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
