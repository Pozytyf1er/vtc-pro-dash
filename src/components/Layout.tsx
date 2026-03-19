import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Car, TrendingUp, TrendingDown, Wrench, BarChart3, LogOut, Menu, Sun, Moon, Users, Timer, PieChart, Settings, UserCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { AlertsBanner } from "@/components/AlertsBanner";
import OfflineIndicator from "@/components/OfflineIndicator";
import { SyncIndicator } from "@/components/SyncIndicator";
import { LanguageToggle } from "@/components/LanguageToggle";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin, isDriver, role } = useUserRole();
  const isMobile = useIsMobile();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Menu items - original menu for all users
  const baseMenuItems = [
    { icon: BarChart3, label: t('nav.dashboard'), path: "/" },
    { icon: TrendingUp, label: t('nav.incomes'), path: "/incomes" },
    { icon: TrendingDown, label: t('nav.expenses'), path: "/expenses" },
    { icon: Car, label: t('nav.vehicles'), path: "/vehicle" },
    { icon: Users, label: t('nav.drivers'), path: "/drivers" },
    { icon: Wrench, label: t('nav.maintenance'), path: "/maintenance" },
  ];

  // Additional menu items for new features
  const additionalItems = [
    { icon: Timer, label: t('nav.shifts'), path: "/shifts" },
    { icon: UserCircle, label: t('nav.myDashboard'), path: "/driver-dashboard" },
    { icon: PieChart, label: t('nav.profitability'), path: "/profitability", adminOnly: true },
  ];

  // Combine all items, filtering admin-only if not admin
  const menuItems = [
    ...baseMenuItems,
    ...additionalItems.filter(item => !item.adminOnly || isAdmin),
  ];

  const NavContent = () => (
    <>
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Car className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground">VTC Manager</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => (
          <Button
            key={item.path}
            variant={location.pathname === item.path ? "secondary" : "ghost"}
            className="w-full justify-start gap-3"
            onClick={() => navigate(item.path)}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Button>
        ))}
      </nav>
      <div className="space-y-2 border-t border-border p-4">
        <Button
          variant={location.pathname === "/settings" ? "secondary" : "ghost"}
          className="w-full justify-start gap-3"
          onClick={() => navigate("/settings")}
        >
          <Settings className="h-5 w-5" />
          {t('nav.settings')}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={toggleTheme}
        >
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          {theme === "light" ? t('nav.darkMode') : t('nav.lightMode')}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          {t('nav.logout')}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
          <div className="flex h-full flex-col">
            <NavContent />
          </div>
        </aside>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold">VTC Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <SyncIndicator />
            <AlertsBanner />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-full flex-col">
                  <NavContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${!isMobile ? "ml-64" : "mt-14"}`}>
        {/* Desktop top bar with alerts */}
        {!isMobile && (
          <div className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3">
            <LanguageToggle />
            <SyncIndicator />
            <AlertsBanner />
          </div>
        )}
        <div className="container mx-auto p-6">{children}</div>
        <OfflineIndicator />
      </main>
    </div>
  );
};

export default Layout;