import { Shield, FileText, AlertTriangle, Inbox, Briefcase, Home, FolderOpen, BarChart3, Users, Handshake, UserPlus, UsersRound } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const clientNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'My Cases', url: '/my-cases', icon: FolderOpen },
  { title: 'My Plans', url: '/plans', icon: FileText },
  { title: 'Report a Notice', url: '/report', icon: AlertTriangle },
];

const agentNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Case Queue', url: '/queue', icon: Inbox },
  { title: 'My Caseload', url: '/caseload', icon: Briefcase },
  { title: 'My Clients', url: '/my-clients', icon: UsersRound },
  { title: 'Bulk Enroll', url: '/bulk-enroll', icon: UserPlus },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Affiliates', url: '/admin/affiliates', icon: Users },
  { title: 'Partner Program', url: '/partner-program', icon: Handshake },
];

export function AppSidebar() {
  const { role } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const navItems = role === 'agent' ? agentNavItems : clientNavItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-md">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-display text-lg font-semibold text-sidebar-foreground">
                Return Shield
              </h1>
              <p className="text-xs text-sidebar-foreground/70">Tax Defense Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs uppercase tracking-wider px-3 mb-2">
            {!collapsed && 'Navigation'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        <item.icon className={cn(
                          'h-5 w-5 transition-colors',
                          isActive ? 'text-sidebar-primary' : ''
                        )} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!collapsed && (
          <div className="text-xs text-sidebar-foreground/60 text-center">
            © 2024 Return Shield
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
