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
    <header className="sticky top-0 z-30 flex h-11 items-center gap-2 border-b border-border/40 bg-card/90 px-3 backdrop-blur-xl">
      <SidebarTrigger />

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full h-7 w-7">
          {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 rounded-full px-1.5 h-8">
              <Avatar className="h-6 w-6 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-2xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs font-medium text-foreground leading-tight">
                  {profile?.full_name || 'User'}
                </span>
                <span className="text-2xs text-muted-foreground leading-tight">
                  {roles.length > 0 ? roles.map(r => r.replace(/_/g, ' ')).join(', ') : 'Unassigned'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal py-1.5">
              <p className="text-xs font-medium">{profile?.full_name}</p>
              <p className="text-2xs text-muted-foreground">{profile?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard/profile')} className="text-xs">
              <User className="mr-2 size-3.5" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/dashboard/change-password')} className="text-xs">
              <KeyRound className="mr-2 size-3.5" /> Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-xs text-destructive focus:text-destructive">
              <LogOut className="mr-2 size-3.5" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
