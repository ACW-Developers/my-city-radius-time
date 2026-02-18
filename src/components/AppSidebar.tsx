import { useAuth } from '@/hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Clock, LayoutDashboard, CalendarDays, DollarSign, Users, LogOut, Shield,
  Settings, Activity, BarChart3, FileText,
} from 'lucide-react';
import logo from '@/assets/my_city_logo.png';

const employeeNav = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { title: 'Check In', icon: Clock, path: '/dashboard/checkin' },
  { title: 'Attendance', icon: CalendarDays, path: '/dashboard/attendance' },
  { title: 'Pay & Hours', icon: DollarSign, path: '/dashboard/pay' },
];

const adminNav = [
  { title: 'Employees', icon: Users, path: '/dashboard/admin/employees' },
  { title: 'Pay Rates', icon: DollarSign, path: '/dashboard/admin/pay-rates' },
  { title: 'All Attendance', icon: CalendarDays, path: '/dashboard/admin/attendance' },
  { title: 'Payroll', icon: Shield, path: '/dashboard/admin/payroll' },
  { title: 'Reports', icon: BarChart3, path: '/dashboard/admin/reports' },
  { title: 'Activity Log', icon: Activity, path: '/dashboard/activity-log' },
  { title: 'Settings', icon: Settings, path: '/dashboard/settings' },
];

export function AppSidebar() {
  const { profile, roles, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const roleLabel = roles.length > 0 ? roles.map(r => r.replace('_', ' ')).join(', ') : 'Unassigned';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="My City Radius" className="h-10 w-10 rounded-md" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-foreground">My City Radius</h2>
            <p className="truncate text-xs capitalize text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {employeeNav.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    tooltip={item.title}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Show admin nav to ALL users (role checks suspended) */}
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    tooltip={item.title}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {(profile?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{profile?.full_name || 'User'}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0">
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
