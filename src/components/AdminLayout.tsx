import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Menu, User, Waves } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import gokiteLogo from "@/assets/gokite-logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-ocean-pattern">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          {/* Ocean-themed Header */}
          <header className="sticky top-0 z-40 glass-premium border-b border-primary/10">
            <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
              {/* Left: Menu trigger + Logo on mobile */}
              <div className="flex items-center gap-3">
                <SidebarTrigger className="lg:hidden min-h-[44px] min-w-[44px] rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200 border border-primary/20">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
                
                {/* Mobile logo with ocean glow */}
                <div className="lg:hidden relative">
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

                {/* User Menu with Ocean Theme */}
                <div className="hidden sm:flex items-center gap-3 pl-3 ml-2 border-l border-primary/20">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-cyan/20 flex items-center justify-center border border-primary/20 shadow-ocean">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-sm font-medium text-foreground truncate max-w-[120px]">Admin</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">{user?.email}</p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="gap-2 text-muted-foreground hover:text-accent hover:bg-accent/10 min-h-[44px] min-w-[44px] sm:min-w-fit rounded-xl"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content with Ocean Background */}
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
