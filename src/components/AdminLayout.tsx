import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Menu, User, Home, Users, Calendar, Package, ShoppingCart, BarChart3, Settings, TrendingUp, DollarSign, Waves, X } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NavLink } from "@/components/NavLink";
import gokiteLogo from "@/assets/gokite-logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Aulas", url: "/aulas", icon: Calendar },
  { title: "Vendas", url: "/vendas", icon: TrendingUp },
  { title: "Estoque", url: "/estoque", icon: Package },
  { title: "Aluguel", url: "/aluguel", icon: Package },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "E-commerce", url: "/ecommerce", icon: ShoppingCart },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen flex flex-col w-full bg-ocean-pattern">
      {/* Menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r border-sidebar-border/30">
          <SheetHeader className="p-4 sm:p-5 border-b border-sidebar-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 relative">
                <div className="absolute inset-0 bg-cyan/20 blur-xl rounded-full opacity-60" />
                <img 
                  src={gokiteLogo} 
                  alt="GoKite" 
                  className="h-9 sm:h-10 w-auto relative drop-shadow-lg"
                />
              </div>
            </div>
          </SheetHeader>
          
          <div className="px-2 sm:px-3 py-4 flex-1 overflow-y-auto">
            <div className="text-sidebar-foreground/40 text-xs font-semibold uppercase tracking-wider px-3 mb-3 flex items-center gap-2">
              <Waves className="h-3 w-3" />
              Menu Principal
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = currentPath === item.url || (item.url !== '/' && currentPath.startsWith(item.url));
                return (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    end={item.url === '/'}
                    onClick={() => setMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 sm:py-3 rounded-xl transition-all duration-200 min-h-[44px] group relative overflow-hidden
                      ${isActive 
                        ? 'bg-gradient-to-r from-sidebar-primary/90 to-cyan/80 text-sidebar-primary-foreground shadow-lg shadow-cyan/20' 
                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
                      }
                    `}
                    activeClassName=""
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                    )}
                    <item.icon className="h-5 w-5 sm:h-[22px] sm:w-[22px] flex-shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:text-cyan" />
                    <span className="text-sm sm:text-[15px] font-medium">{item.title}</span>
                    {isActive && (
                      <Waves className="h-3.5 w-3.5 ml-auto opacity-70 animate-wave" />
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-sidebar-border/30 mt-auto">
            <div className="flex items-center gap-2 text-sidebar-foreground/40 text-xs">
              <div className="w-2 h-2 rounded-full bg-cyan animate-pulse-soft shadow-lg shadow-cyan/50" />
              <span>Sistema ativo</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Header */}
      <header className="sticky top-0 z-40 glass-premium border-b border-primary/10">
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex items-center justify-between gap-3">
          {/* Left: Hamburger Menu + Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(true)}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-gradient-to-br from-primary to-cyan text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 bg-cyan/20 blur-lg rounded-full" />
              <img 
                src={gokiteLogo} 
                alt="GoKite" 
                className="h-8 w-auto relative"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <NotificationCenter />

            <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-primary/20">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-cyan/20 flex items-center justify-center border border-primary/20">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-medium text-foreground truncate max-w-[100px]">Admin</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{user?.email}</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="gap-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 min-h-[40px] min-w-[40px] sm:min-w-fit rounded-xl text-xs"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}