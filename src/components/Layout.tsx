import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Car, TrendingUp, TrendingDown, Wrench, BarChart3, LogOut, Menu, Sun, Moon, Users, Timer, PieChart, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { AlertsBanner } from "@/components/AlertsBanner";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
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
    { icon: BarChart3, label: "Tableau de bord", path: "/" },
    { icon: TrendingUp, label: "Recettes", path: "/incomes" },
    { icon: TrendingDown, label: "Dépenses", path: "/expenses" },
    { icon: Car, label: "Véhicules", path: "/vehicle" },
    { icon: Users, label: "Conducteurs", path: "/drivers" },
    { icon: Wrench, label: "Maintenance", path: "/maintenance" },
  ];

  // Additional menu items for new features
  const additionalItems = [
    { icon: Timer, label: "Shifts", path: "/shifts" },
    { icon: PieChart, label: "Rentabilité", path: "/profitability", adminOnly: true },
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
          Paramètres
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={toggleTheme}
        >
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          {theme === "light" ? "Mode sombre" : "Mode clair"}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          Déconnexion
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
          <div className="sticky top-0 z-30 flex justify-end border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3">
            <AlertsBanner />
          </div>
        )}
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
