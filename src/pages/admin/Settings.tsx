import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Shield, Database, Bell } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">System Settings</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <SettingsIcon className="size-5 text-primary" />
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>App Name</span><Badge variant="secondary">My City Radius</Badge></div>
            <div className="flex justify-between"><span>Version</span><Badge variant="secondary">1.0.0</Badge></div>
            <div className="flex justify-between"><span>Biweekly Pay Period</span><Badge variant="secondary">Active</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Shield className="size-5 text-primary" />
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>Authentication</span><Badge variant="secondary">Email + Password</Badge></div>
            <div className="flex justify-between"><span>Row Level Security</span><Badge className="bg-primary/10 text-primary">Enabled</Badge></div>
            <div className="flex justify-between"><span>Auto Admin (1st User)</span><Badge className="bg-primary/10 text-primary">Active</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Database className="size-5 text-primary" />
            <CardTitle className="text-base">Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>Database</span><Badge variant="secondary">Cloud</Badge></div>
            <div className="flex justify-between"><span>Activity Logging</span><Badge className="bg-primary/10 text-primary">Enabled</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Bell className="size-5 text-primary" />
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>Email Alerts</span><Badge variant="secondary">Coming Soon</Badge></div>
            <div className="flex justify-between"><span>Push Notifications</span><Badge variant="secondary">Coming Soon</Badge></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
