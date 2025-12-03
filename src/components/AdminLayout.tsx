import { ReactNode, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, ExternalLink, Menu, User } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import gokiteLogo from "@/assets/gokite-logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/admin/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          {/* Premium Header */}
          <header className="sticky top-0 z-40 glass border-b border-border/50">
            <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
              {/* Left: Menu trigger + Logo on mobile */}
              <div className="flex items-center gap-3">
                <SidebarTrigger className="lg:hidden min-h-[44px] min-w-[44px] rounded-lg hover:bg-muted transition-colors">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
                
                {/* Mobile logo */}
                <img 
                  src={gokiteLogo} 
                  alt="GoKite" 
                  className="h-7 w-auto lg:hidden"
                />
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <NotificationCenter />
                
                <Button 
                  asChild
                  variant="ghost" 
                  size="sm"
                  className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Link to="/">
                    <ExternalLink className="h-4 w-4" />
                    <span>Ver Site</span>
                  </Link>
                </Button>

                {/* User Menu */}
                <div className="hidden sm:flex items-center gap-2 pl-2 ml-2 border-l border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground max-w-[120px] truncate">{user?.email}</span>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="gap-2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] sm:min-w-fit"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
