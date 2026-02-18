import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Shield, Database, Bell, Globe, Lock, Server } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">System Settings</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <SettingsIcon className="size-5 text-primary" />
            </div>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">App Name</span><Badge variant="secondary">My City Radius</Badge></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Version</span><Badge variant="secondary">1.0.0</Badge></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Pay Period</span><Badge variant="default">Biweekly</Badge></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Work Hours</span><Badge variant="secondary">8AM - 5PM</Badge></div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="size-5 text-primary" />
            </div>
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Authentication</span><Badge variant="default">Email + Password</Badge></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Row Level Security</span><Badge variant="default">Enabled</Badge></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Auto Admin</span><Badge variant="default">Active</Badge></div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Database className="size-5 text-primary" />
            </div>
            <CardTitle className="text-base">Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Database</span><Badge variant="default">Cloud</Badge></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Activity Logging</span><Badge variant="default">Enabled</Badge></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Backups</span><Badge variant="secondary">Automatic</Badge></div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="size-5 text-primary" />
            </div>
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Email Alerts</span><Badge variant="secondary">Coming Soon</Badge></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Push</span><Badge variant="secondary">Coming Soon</Badge></div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="size-5 text-primary" />
            </div>
            <CardTitle className="text-base">Localization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Timezone</span><Badge variant="secondary">Auto-detect</Badge></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Language</span><Badge variant="secondary">English</Badge></div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Server className="size-5 text-primary" />
            </div>
            <CardTitle className="text-base">Infrastructure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Platform</span><Badge variant="default">Lovable Cloud</Badge></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Status</span><Badge variant="default">Operational</Badge></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
