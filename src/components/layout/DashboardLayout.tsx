import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const { t, i18n } = useTranslation();

  const roleLabel = role ? t(`roles.${role}`) : '';
  const dashboardTitle = role 
    ? t(`dashboardTitles.${role}`) 
    : t('dashboardTitles.default');

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language?.startsWith('es') ? 'es' : 'en';

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
              <NotificationBell />
              
              {/* Language Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline uppercase">{currentLanguage}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
                  <DropdownMenuLabel>{t('common.language')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => changeLanguage('en')}
                    className={currentLanguage === 'en' ? 'bg-accent' : ''}
                  >
                    {t('common.english')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => changeLanguage('es')}
                    className={currentLanguage === 'es' ? 'bg-accent' : ''}
                  >
                    {t('common.spanish')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                <span className="hidden sm:inline">{t('common.signOut')}</span>
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
