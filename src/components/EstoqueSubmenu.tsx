import { NavLink, useLocation } from "react-router-dom";
import { Package, RefreshCw, Cloud, ScanLine, Warehouse, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEquipamentosListagem } from "@/hooks/useSupabaseEquipamentos";
import { useTradeInsSummary } from "@/hooks/useTradeIns";
import { useMovimentacoesRecentes } from "@/hooks/useReceberMercadoria";

interface EstoqueSubmenuProps {
  className?: string;
}

export function EstoqueSubmenu({ className }: EstoqueSubmenuProps) {
  const location = useLocation();
  
  // Fetch counts for badges
  const { data: equipamentos = [] } = useEquipamentosListagem({});
  const { data: tradeInsSummary } = useTradeInsSummary();
  const { data: movimentacoes = [] } = useMovimentacoesRecentes(100);

  // Calculate recent entries (last 24h)
  const recentEntries = movimentacoes.filter((m: any) => {
    const hoursAgo = (Date.now() - new Date(m.created_at).getTime()) / 3600000;
    return hoursAgo < 24;
  }).length;

  const menuItems = [
    { 
      title: "Equipamentos", 
      url: "/estoque", 
      icon: Package, 
      exact: true,
      count: equipamentos.length,
      showCount: true,
    },
    { 
      title: "Trade-ins", 
      url: "/estoque/trade-ins", 
      icon: RefreshCw,
      count: tradeInsSummary?.qtdEmEstoque || 0,
      showCount: true,
      highlight: (tradeInsSummary?.qtdEmEstoque || 0) > 0,
    },
    { 
      title: "Duotone", 
      url: "/estoque/duotone", 
      icon: Cloud,
      statusIcon: true,
    },
    { 
      title: "Receber", 
      url: "/estoque/receber-mercadoria", 
      icon: ScanLine,
      pulse: true,
      recentCount: recentEntries,
    },
    { 
      title: "Inventário", 
      url: "/estoque/inventario", 
      icon: Warehouse, 
      disabled: false,
    },
  ];

  const isActive = (url: string, exact?: boolean) => {
    if (exact) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex gap-2 flex-wrap", className)}>
        {menuItems.map((item) => {
          const active = isActive(item.url, item.exact);
          
          const content = (
            <NavLink
              key={item.url}
              to={item.disabled ? "#" : item.url}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] group",
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : item.disabled
                  ? "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:shadow-sm"
              )}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              {/* Icon with optional pulse animation */}
              <div className="relative">
                <item.icon className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  !item.disabled && !active && "group-hover:scale-110",
                  item.pulse && !active && "animate-pulse"
                )} />
                
                {/* Status indicator for Duotone sync */}
                {item.statusIcon && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-success animate-pulse" />
                )}
              </div>
              
              {item.title}
              
              {/* Badge with count */}
              {item.showCount && item.count !== undefined && item.count > 0 && (
                <Badge 
                  variant={active ? "secondary" : item.highlight ? "default" : "outline"}
                  className={cn(
                    "ml-1 h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                    active && "bg-primary-foreground/20 text-primary-foreground",
                    item.highlight && !active && "bg-primary text-primary-foreground"
                  )}
                >
                  {item.count}
                </Badge>
              )}
              
              {/* Recent activity indicator */}
              {item.recentCount !== undefined && item.recentCount > 0 && (
                <span className={cn(
                  "flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-bold rounded-full",
                  active 
                    ? "bg-primary-foreground/20 text-primary-foreground" 
                    : "bg-success/20 text-success"
                )}>
                  +{item.recentCount}
                </span>
              )}
              
              {/* Disabled badge */}
              {item.disabled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/70">
                  Em breve
                </span>
              )}
            </NavLink>
          );

          // Wrap with tooltip if has tooltip text
          if ('tooltip' in item && item.tooltip) {
            return (
              <Tooltip key={item.url}>
                <TooltipTrigger asChild>
                  {content}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs">{String(item.tooltip)}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return content;
        })}
      </div>
    </TooltipProvider>
  );
}
