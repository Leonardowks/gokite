import { Link, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  FileText, 
  FileWarning, 
  Landmark, 
  Settings2,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceiroSubmenuProps {
  className?: string;
}

const menuItems = [
  { path: "/financeiro", label: "Dashboard", icon: Home },
  { path: "/financeiro/dre", label: "DRE", icon: FileText },
  { path: "/financeiro/contas", label: "Contas a Pagar", icon: FileWarning },
  { path: "/financeiro/impostos", label: "Impostos", icon: Landmark },
  { path: "/financeiro/configuracoes", label: "Configurações", icon: Settings2 },
];

export function FinanceiroSubmenu({ className }: FinanceiroSubmenuProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className={cn(
      "flex items-center gap-1.5 overflow-x-auto pb-2 -mb-2 scroll-container-x scroll-fade-right",
      className
    )}>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.path || 
          (item.path !== "/financeiro" && currentPath.startsWith(item.path));
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all min-h-[40px] shrink-0 touch-active",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/80"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
