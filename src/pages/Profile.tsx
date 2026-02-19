import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Mail, Shield, Save, Camera, Calendar, Clock, Briefcase } from 'lucide-react';
import { formatDateAZ, formatTimeAZ } from '@/lib/timezone';

const Profile = () => {
  const { user, profile, roles, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = (profile?.full_name || 'U').split(' ').map(n => n.charAt(0).toUpperCase()).slice(0, 2).join('');

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', profile.user_id);
    setSaving(false);
    if (error) toast.error('Error updating profile');
    else { toast.success('Profile updated'); refreshProfile(); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Upload failed'); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', user.id);
    toast.success('Avatar updated');
    setUploading(false);
    refreshProfile();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold text-foreground">My Profile</h2>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar & Quick Info */}
        <Card className="border-border/50 md:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-primary/30">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={uploading}
              >
                <Camera className="size-6 text-foreground" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">{profile?.full_name || 'User'}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {roles.map(r => <Badge key={r} variant="secondary" className="capitalize text-xs">{r.replace('_', ' ')}</Badge>)}
              </div>
            </div>
            <Separator />
            <div className="w-full space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-4" />
                <span>Joined {(profile as any)?.created_at ? formatDateAZ((profile as any).created_at) : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="size-4" />
                <span className="capitalize">{roles.length > 0 ? roles.join(', ').replace(/_/g, ' ') : 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full ${profile?.is_active ? 'bg-primary' : 'bg-destructive'}`} />
                <span className="text-muted-foreground">{profile?.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="border-border/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><User className="size-5 text-primary" /> Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> Email Address</Label>
              <Input value={profile?.email || ''} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><User className="size-4 text-muted-foreground" /> Full Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Shield className="size-4 text-muted-foreground" /> Roles</Label>
              <Input value={roles.length > 0 ? roles.map(r => r.replace('_', ' ')).join(', ') : 'Unassigned'} disabled className="bg-muted/50 capitalize" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" /> Account ID</Label>
              <Input value={user?.id || ''} disabled className="bg-muted/50 font-mono text-xs" />
            </div>
            <Separator />
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="size-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
