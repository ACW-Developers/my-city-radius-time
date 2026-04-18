import { useAuth } from '@/hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Clock, LayoutDashboard, CalendarDays, Banknote, Users, LogOut, Shield,
  Settings, Activity, BarChart3, User, KeyRound,
} from 'lucide-react';
import logo from '@/assets/my_city_logo.png';

const employeeNav = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { title: 'Check In', icon: Clock, path: '/dashboard/checkin' },
  { title: 'Attendance', icon: CalendarDays, path: '/dashboard/attendance' },
  { title: 'Pay & Hours', icon: Banknote, path: '/dashboard/pay' },
];

const accountNav = [
  { title: 'Profile', icon: User, path: '/dashboard/profile' },
  { title: 'Security', icon: KeyRound, path: '/dashboard/change-password' },
];

const adminNav = [
  { title: 'Employees', icon: Users, path: '/dashboard/admin/employees' },
  { title: 'Pay Rates', icon: Banknote, path: '/dashboard/admin/pay-rates' },
  { title: 'All Attendance', icon: CalendarDays, path: '/dashboard/admin/attendance' },
  { title: 'Payroll', icon: Shield, path: '/dashboard/admin/payroll' },
  { title: 'Reports', icon: BarChart3, path: '/dashboard/admin/reports' },
  { title: 'Activity Log', icon: Activity, path: '/dashboard/activity-log' },
  { title: 'Settings', icon: Settings, path: '/dashboard/settings' },
];

export function AppSidebar() {
  const { profile, roles, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const roleLabel = roles.length > 0 ? roles.map(r => r.replace('_', ' ')).join(', ') : 'Unassigned';

  const renderGroup = (label: string, items: typeof employeeNav) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-2xs uppercase tracking-wider font-medium text-muted-foreground/70 px-3">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                isActive={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                tooltip={item.title}
                className="text-xs h-8"
              >
                <item.icon className="size-3.5" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/50 p-3">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="My City Radius" className="h-8 w-8 min-w-[2rem] rounded-md object-contain" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xs font-bold text-foreground">My City Radius</h2>
            <p className="truncate text-2xs capitalize text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup('Menu', employeeNav)}
        {renderGroup('Account', accountNav)}
        {isAdmin && renderGroup('Admin', adminNav)}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xs font-semibold">
            {(profile?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{profile?.full_name || 'User'}</p>
            <p className="truncate text-2xs text-muted-foreground">{profile?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0 h-7 w-7">
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
