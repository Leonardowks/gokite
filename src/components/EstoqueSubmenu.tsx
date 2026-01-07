import { NavLink, useLocation } from "react-router-dom";
import { Package, RefreshCw, Warehouse, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface EstoqueSubmenuProps {
  className?: string;
}

const menuItems = [
  { title: "Equipamentos", url: "/estoque", icon: Package, exact: true },
  { title: "Trade-ins", url: "/estoque/trade-ins", icon: RefreshCw },
  { title: "Duotone", url: "/estoque/duotone", icon: Cloud },
  { title: "Inventário", url: "/estoque/inventario", icon: Warehouse, disabled: true },
];

export function EstoqueSubmenu({ className }: EstoqueSubmenuProps) {
  const location = useLocation();

  const isActive = (url: string, exact?: boolean) => {
    if (exact) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      {menuItems.map((item) => {
        const active = isActive(item.url, item.exact);
        return (
          <NavLink
            key={item.url}
            to={item.disabled ? "#" : item.url}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]",
              active
                ? "bg-primary text-primary-foreground shadow-md"
                : item.disabled
                ? "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={(e) => item.disabled && e.preventDefault()}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
            {item.disabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                Em breve
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}
