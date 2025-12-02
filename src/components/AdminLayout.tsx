import { ReactNode, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, ExternalLink, Menu } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";

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
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="lg:hidden min-h-[44px] min-w-[44px]">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Admin
                </Badge>
                <span className="hidden sm:inline text-sm text-muted-foreground">Painel Administrativo</span>
              </div>
              <div className="flex items-center gap-2">
                <NotificationCenter />
                
                <Button 
                  asChild
                  variant="ghost" 
                  size="sm"
                  className="gap-2"
                >
                  <Link to="/">
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden sm:inline">Ver Site</span>
                  </Link>
                </Button>
                
                <span className="hidden sm:inline text-xs text-muted-foreground">{user?.email}</span>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </div>
          <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
