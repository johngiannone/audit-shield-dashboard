import { Shield, FileText, AlertTriangle, Inbox, Briefcase, Home, FolderOpen, UserPlus, UsersRound, Palette, ShieldCheck, ScanSearch, Files, Bot, Eraser, FileSearch, Settings } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  { titleKey: 'nav.dashboard', url: '/dashboard', icon: Home },
  { titleKey: 'nav.myCases', url: '/my-cases', icon: FolderOpen },
  { titleKey: 'nav.myPlans', url: '/plans', icon: FileText },
  { titleKey: 'nav.reportNotice', url: '/report', icon: AlertTriangle },
  { titleKey: 'nav.auditRiskCheck', url: '/audit-risk', icon: ScanSearch },
  { titleKey: 'nav.penaltyEraser', url: '/penalty-eraser', icon: Eraser },
  { titleKey: 'nav.transcriptDecoder', url: '/transcript-decoder', icon: FileSearch },
];

const enrolledAgentNavItems = [
  { titleKey: 'nav.dashboard', url: '/dashboard', icon: Home },
  { titleKey: 'nav.caseQueue', url: '/queue', icon: Inbox },
  { titleKey: 'nav.myCaseload', url: '/caseload', icon: Briefcase },
  { titleKey: 'nav.riskAssessments', url: '/risk-assessments', icon: ScanSearch },
  { titleKey: 'nav.settings', url: '/agent-settings', icon: Settings },
];

const taxPreparerNavItems = [
  { titleKey: 'nav.dashboard', url: '/dashboard', icon: Home },
  { titleKey: 'nav.myClients', url: '/my-clients', icon: UsersRound },
  { titleKey: 'nav.bulkEnroll', url: '/bulk-enroll', icon: UserPlus },
  { titleKey: 'nav.batchRiskScan', url: '/batch-risk-scan', icon: Files },
  { titleKey: 'nav.branding', url: '/branding', icon: Palette },
];

const superAdminNavItems = [
  { titleKey: 'nav.compliance', url: '/compliance', icon: ShieldCheck },
  { titleKey: 'nav.aiModels', url: '/admin/model-config', icon: Bot },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const { role, user } = useAuth();
  const { branding, isWhiteLabeled } = useBranding();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkSuperAdmin();
    }
  }, [user]);

  const checkSuperAdmin = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('role', 'super_admin')
      .maybeSingle();
    
    setIsSuperAdmin(!!data);
  };

  const getNavItems = () => {
    let items = [];
    switch (role) {
      case 'enrolled_agent':
        items = [...enrolledAgentNavItems];
        break;
      case 'tax_preparer':
        items = [...taxPreparerNavItems];
        break;
      default:
        items = [...clientNavItems];
    }
    
    // Add super admin items if user is super admin
    if (isSuperAdmin) {
      items = [...items, ...superAdminNavItems];
    }
    
    return items;
  };

  const navItems = getNavItems();

  // Determine logo and firm name based on branding
  const showCustomLogo = role === 'client' && isWhiteLabeled && branding.logoUrl;
  const firmName = role === 'client' && isWhiteLabeled && branding.firmName 
    ? branding.firmName 
    : 'Return Shield';
  const tagline = role === 'client' && isWhiteLabeled 
    ? 'Client Portal' 
    : 'Tax Defense Portal';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {showCustomLogo ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
              <img 
                src={branding.logoUrl!} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-md">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-display text-lg font-semibold text-sidebar-foreground truncate max-w-[140px]">
                {firmName}
              </h1>
              <p className="text-xs text-sidebar-foreground/70">{tagline}</p>
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
                  <SidebarMenuItem key={item.titleKey}>
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
                        {!collapsed && <span>{t(item.titleKey)}</span>}
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
            {role === 'client' && isWhiteLabeled ? `Powered by Return Shield` : '© 2025 Return Shield'}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
