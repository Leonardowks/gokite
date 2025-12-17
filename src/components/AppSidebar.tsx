import { Home, Users, Calendar, Package, ShoppingCart, BarChart3, Settings, TrendingUp, DollarSign, Waves } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import gokiteLogo from "@/assets/gokite-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

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

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <Sidebar className={`${open ? "w-64" : "w-20"} sidebar-ocean`} collapsible="icon">
      {/* Logo Section with Ocean Glow */}
      <div className="flex items-center justify-center p-4 sm:p-5 border-b border-sidebar-border/30">
        <div className="flex items-center gap-3 relative">
          <div className="absolute inset-0 bg-cyan/20 blur-xl rounded-full opacity-60" />
          <img 
            src={gokiteLogo} 
            alt="GoKite" 
            className={`${open ? "h-9 sm:h-10" : "h-8"} w-auto transition-all duration-200 relative drop-shadow-lg`}
          />
        </div>
      </div>

      <SidebarContent className="scrollbar-thin px-2 sm:px-3 py-4">
        <SidebarGroup>
          {open && (
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs font-semibold uppercase tracking-wider px-3 mb-3 flex items-center gap-2">
              <Waves className="h-3 w-3" />
              Menu Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = currentPath === item.url || (item.url !== '/' && currentPath.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 sm:py-3 rounded-xl transition-all duration-200 min-h-[44px] group relative overflow-hidden
                          ${isActive 
                            ? 'bg-gradient-to-r from-sidebar-primary/90 to-cyan/80 text-sidebar-primary-foreground shadow-lg shadow-cyan/20' 
                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
                          }
                        `}
                        activeClassName=""
                      >
                        {/* Active indicator line */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                        )}
                        <item.icon className={`h-5 w-5 sm:h-[22px] sm:w-[22px] flex-shrink-0 transition-all duration-200 ${!isActive && 'group-hover:scale-110 group-hover:text-cyan'}`} />
                        {open && (
                          <span className="text-sm sm:text-[15px] font-medium">{item.title}</span>
                        )}
                        {isActive && open && (
                          <Waves className="h-3.5 w-3.5 ml-auto opacity-70 animate-wave" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Ocean Theme */}
      {open && (
        <div className="p-4 border-t border-sidebar-border/30 mt-auto">
          <div className="flex items-center gap-2 text-sidebar-foreground/40 text-xs">
            <div className="w-2 h-2 rounded-full bg-cyan animate-pulse-soft shadow-lg shadow-cyan/50" />
            <span>Sistema ativo</span>
          </div>
        </div>
      )}
    </Sidebar>
  );
}
