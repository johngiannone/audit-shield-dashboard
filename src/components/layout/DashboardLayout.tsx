import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  enrolled_agent: 'Enrolled Agent',
  tax_preparer: 'Tax Preparer',
};

const DASHBOARD_TITLES: Record<string, string> = {
  client: 'Client Portal',
  enrolled_agent: 'Agent Dashboard',
  tax_preparer: 'Tax Preparer Portal',
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();

  const roleLabel = role ? ROLE_LABELS[role] || role : '';
  const dashboardTitle = role ? DASHBOARD_TITLES[role] || 'Dashboard' : 'Dashboard';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-foreground hover:bg-secondary" />
              <div className="hidden md:block">
                <h2 className="text-lg font-semibold text-foreground">
                  {dashboardTitle}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user?.email}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">
                  {roleLabel}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-6 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
