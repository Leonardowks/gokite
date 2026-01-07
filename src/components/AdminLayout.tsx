import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Home, Users, Calendar, Package, ShoppingCart, BarChart3, Settings, TrendingUp, DollarSign, Waves, MoreHorizontal, Mic, Sparkles, Brain, MessageCircle } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NavLink } from "@/components/NavLink";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { UserMenu } from "@/components/UserMenu";
import { QuickStats } from "@/components/QuickStats";
import { VoiceAssistantBar } from "@/components/VoiceAssistantBar";
import { VoiceAssistantSheet } from "@/components/VoiceAssistantSheet";
import { Badge } from "@/components/ui/badge";
import { useMensagensNaoLidas, useConversasRealtime } from "@/hooks/useConversasPage";
import { toast } from "sonner";
import gokiteLogo from "@/assets/gokite-logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

// All menu items
const allMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Jarvis", url: "/assistente", icon: Sparkles, highlight: true },
  { title: "Conversas", url: "/conversas", icon: MessageCircle, showBadge: true },
  { title: "Inteligência", url: "/inteligencia", icon: Brain, highlight: true },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Aulas", url: "/aulas", icon: Calendar },
  { title: "Vendas", url: "/vendas", icon: TrendingUp },
  { title: "Estoque", url: "/estoque", icon: Package },
  { title: "Trade-ins", url: "/estoque/trade-ins", icon: TrendingUp },
  { title: "Aluguel", url: "/aluguel", icon: Package },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "E-commerce", url: "/ecommerce", icon: ShoppingCart },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

// Bottom nav: 4 main items + "Mais"
const bottomNavItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Aulas", url: "/aulas", icon: Calendar },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
];

// Items shown in "Mais" sheet
const moreMenuItems = [
  { title: "Conversas", url: "/conversas", icon: MessageCircle },
  { title: "Inteligência", url: "/inteligencia", icon: Brain },
  { title: "Vendas", url: "/vendas", icon: TrendingUp },
  { title: "Estoque", url: "/estoque", icon: Package },
  { title: "Trade-ins", url: "/estoque/trade-ins", icon: TrendingUp },
  { title: "Aluguel", url: "/aluguel", icon: Package },
  { title: "E-commerce", url: "/ecommerce", icon: ShoppingCart },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Jarvis", url: "/assistente", icon: Sparkles },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);

  // Badge de mensagens não lidas
  const { data: mensagensNaoLidas = 0 } = useMensagensNaoLidas();

  // Realtime para novas mensagens (toast global)
  useConversasRealtime((mensagem) => {
    if (!mensagem.is_from_me && location.pathname !== '/conversas') {
      toast.info('Nova mensagem recebida', {
        description: mensagem.conteudo?.slice(0, 50),
        action: {
          label: 'Ver',
          onClick: () => navigate('/conversas'),
        },
      });
    }
  });

  // SEGURANÇA DESATIVADA PARA WEB SCRAPING
  // Bloco de redirecionamento removido para permitir acesso total
  // Para reativar, descomente:
  // useEffect(() => {
  //   if (!isAuthenticated) {
  //     navigate("/login");
  //   }
  // }, [isAuthenticated, navigate]);
  // if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentPath = location.pathname;
  const isActive = (url: string) => currentPath === url || (url !== '/' && currentPath.startsWith(url));

  return (
    <div className="min-h-screen flex bg-ocean-pattern">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar border-r border-sidebar-border/30">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-sidebar-border/30">
          <div className="flex items-center gap-3 relative">
            <div className="absolute inset-0 bg-cyan/20 blur-xl rounded-full opacity-60" />
            <img 
              src={gokiteLogo} 
              alt="GoKite" 
              className="h-10 w-auto relative drop-shadow-lg"
            />
          </div>
        </div>
        
        {/* Sidebar Navigation */}
        <div className="px-3 py-4 flex-1 overflow-y-auto">
          <div className="text-sidebar-foreground/40 text-xs font-semibold uppercase tracking-wider px-3 mb-3 flex items-center gap-2">
            <Waves className="h-3 w-3" />
            Menu Principal
          </div>
          <nav className="space-y-1">
            {allMenuItems.map((item) => {
              const active = isActive(item.url);
              const isHighlight = 'highlight' in item && item.highlight;
              const showBadge = 'showBadge' in item && item.showBadge && mensagensNaoLidas > 0;
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end={item.url === '/'}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 min-h-[44px] group relative overflow-hidden
                    ${isHighlight && !active
                      ? 'bg-gradient-to-r from-primary/20 to-cyan/20 text-primary hover:from-primary/30 hover:to-cyan/30 border border-primary/20'
                      : active 
                        ? 'bg-gradient-to-r from-sidebar-primary/90 to-cyan/80 text-sidebar-primary-foreground shadow-lg shadow-cyan/20' 
                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
                    }
                  `}
                  activeClassName=""
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                  )}
                  <div className="relative">
                    <item.icon className={`h-5 w-5 flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${isHighlight ? 'text-primary' : 'group-hover:text-cyan'}`} />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                        {mensagensNaoLidas > 9 ? '9+' : mensagensNaoLidas}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{item.title}</span>
                  {showBadge && (
                    <Badge variant="default" className="ml-auto h-5 px-1.5 text-[10px] animate-pulse">
                      {mensagensNaoLidas}
                    </Badge>
                  )}
                  {active && !showBadge && (
                    <Waves className="h-3.5 w-3.5 ml-auto opacity-70 animate-wave" />
                  )}
                  {isHighlight && !active && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">AI</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-sidebar-border/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-cyan/20 flex items-center justify-center border border-primary/20">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">Admin</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-accent hover:bg-accent/10 min-h-[44px]"
          >
            <LogOut className="h-4 w-4" />
            Sair do Sistema
          </Button>
          <div className="flex items-center gap-2 text-sidebar-foreground/40 text-xs mt-3">
            <div className="w-2 h-2 rounded-full bg-cyan animate-pulse-soft shadow-lg shadow-cyan/50" />
            <span>Sistema ativo</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 glass-premium border-b border-primary/10 md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan/20 blur-lg rounded-full" />
              <img 
                src={gokiteLogo} 
                alt="GoKite" 
                className="h-8 w-auto relative"
              />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationCenter />
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="sticky top-0 z-40 glass-premium border-b border-primary/10 hidden md:block">
          <div className="px-6 py-3 flex items-center gap-4">
            {/* Voice Assistant Bar */}
            <VoiceAssistantBar />
            
            <div className="flex items-center gap-3">
              <QuickStats />
              <ThemeToggle />
              <NotificationCenter />
              <div className="pl-3 border-l border-primary/20">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pb-20 md:pb-0">
          <div className="px-4 py-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-premium border-t border-primary/10 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {bottomNavItems.map((item) => {
            const active = isActive(item.url);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.url === '/'}
                className={`
                  flex flex-col items-center justify-center flex-1 min-h-[48px] min-w-[48px] py-2 relative transition-all duration-200
                  ${active 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
                activeClassName=""
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-primary to-cyan rounded-b-full" />
                )}
                <item.icon className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`} />
                <span className="text-[10px] mt-1 font-medium">{item.title}</span>
              </NavLink>
            );
          })}
          {/* Voice Assistant Button - Central */}
          <button
            onClick={() => setVoiceSheetOpen(true)}
            className="flex flex-col items-center justify-center flex-1 min-h-[48px] min-w-[48px] py-2 transition-all duration-200 relative"
          >
            <div className="absolute -top-4 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-background">
              <Mic className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-[10px] mt-6 font-medium text-primary">Assistente</span>
          </button>
          {/* "Mais" Button */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={`
              flex flex-col items-center justify-center flex-1 min-h-[48px] min-w-[48px] py-2 transition-all duration-200
              ${moreMenuItems.some(item => isActive(item.url))
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* "Mais" Menu Sheet */}
      <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh]">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle className="text-left">Mais Opções</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-1">
            {moreMenuItems.map((item) => {
              const active = isActive(item.url);
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  onClick={() => setMoreMenuOpen(false)}
                  className={`
                    flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 min-h-[56px]
                    ${active 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-foreground hover:bg-muted/50'
                    }
                  `}
                  activeClassName=""
                >
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                    ${active ? 'bg-primary/20' : 'bg-muted/50'}
                  `}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{item.title}</span>
                  {active && (
                    <Waves className="h-4 w-4 ml-auto text-primary/60" />
                  )}
                </NavLink>
              );
            })}
          </div>
          {/* Logout in More Menu */}
          <div className="pt-4 border-t border-border/50">
            <button
              onClick={() => {
                setMoreMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-4 px-4 py-4 rounded-xl w-full text-left text-destructive hover:bg-destructive/10 min-h-[56px] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <LogOut className="h-5 w-5" />
              </div>
              <span className="font-medium">Sair do Sistema</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Voice Assistant Sheet for Mobile */}
      <VoiceAssistantSheet open={voiceSheetOpen} onOpenChange={setVoiceSheetOpen} />
    </div>
  );
}
