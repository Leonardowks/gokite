import { Home, Users, Calendar, Package, ShoppingCart, BarChart3, Menu, Settings, TrendingUp, DollarSign } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: Home },
  { title: "Clientes", url: "/admin/clientes", icon: Users },
  { title: "Aulas", url: "/admin/aulas", icon: Calendar },
  { title: "Vendas", url: "/admin/vendas", icon: TrendingUp },
  { title: "Estoque", url: "/admin/estoque", icon: Package },
  { title: "Aluguel", url: "/admin/aluguel", icon: Package },
  { title: "Financeiro", url: "/admin/financeiro", icon: DollarSign },
  { title: "E-commerce", url: "/admin/ecommerce", icon: ShoppingCart },
  { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <Sidebar className={open ? "w-64" : "w-20"} collapsible="icon">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">G</span>
          </div>
          {open && <span className="font-bold text-lg text-sidebar-foreground">Gokite CRM</span>}
        </div>
      </div>

      <SidebarContent>
        <SidebarGroup>
          {open && <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-sidebar-accent min-h-[44px]"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-6 w-6 flex-shrink-0" />
                      {open && <span className="text-base">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
