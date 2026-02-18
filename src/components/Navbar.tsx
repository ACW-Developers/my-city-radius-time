import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Moon, Sun, User, KeyRound, LogOut } from 'lucide-react';
import logo from '@/assets/my_city_logo.png';

export function Navbar() {
  const { profile, roles, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/40 bg-card/80 px-4 backdrop-blur-xl">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <img src={logo} alt="My City Radius" className="h-7 w-7 rounded" />
        <h1 className="text-base font-bold text-foreground tracking-tight hidden sm:block">
          My City Radius
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 rounded-full px-2">
              <Avatar className="h-8 w-8 border border-primary/30">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground leading-tight">
                  {profile?.full_name || 'User'}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {profile?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
              <p className="text-xs capitalize text-primary mt-0.5">
                {roles.length > 0 ? roles.join(', ').replace(/_/g, ' ') : 'Unassigned'}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
              <User className="mr-2 size-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/dashboard/change-password')}>
              <KeyRound className="mr-2 size-4" /> Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 size-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
