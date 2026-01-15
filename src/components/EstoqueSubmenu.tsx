import { NavLink, useLocation } from "react-router-dom";
import { Store, Cloud, Recycle, ScanLine, Warehouse, Smartphone, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEquipamentosListagem } from "@/hooks/useSupabaseEquipamentos";
import { useTradeInsSummary } from "@/hooks/useTradeIns";
import { useMovimentacoesRecentes } from "@/hooks/useReceberMercadoria";
import { useSupplierStats } from "@/hooks/useSupplierCatalog";

interface EstoqueSubmenuProps {
  className?: string;
}

export function EstoqueSubmenu({ className }: EstoqueSubmenuProps) {
  const location = useLocation();
  
  // Fetch counts for badges
  const { data: equipamentos = [] } = useEquipamentosListagem({});
  const { data: tradeInsSummary } = useTradeInsSummary();
  const { data: movimentacoes = [] } = useMovimentacoesRecentes(100);
  const { data: supplierStats } = useSupplierStats();

  // Calculate recent entries (last 24h)
  const recentEntries = movimentacoes.filter((m: any) => {
    const hoursAgo = (Date.now() - new Date(m.created_at).getTime()) / 3600000;
    return hoursAgo < 24;
  }).length;

  // Produtos próprios (excluindo virtuais do fornecedor)
  const produtosProprios = equipamentos.filter(e => e.source_type !== 'virtual_supplier').length;
  
  // Produtos sob encomenda (catálogo do fornecedor)
  const produtosSobEncomenda = supplierStats?.totalSupplier || 0;

  const menuItems = [
    { 
      title: "Minha Loja", 
      url: "/estoque/loja", 
      icon: Store, 
      count: produtosProprios,
      showCount: true,
      description: "Produtos físicos em estoque",
    },
    { 
      title: "Sob Encomenda", 
      url: "/estoque/sob-encomenda", 
      icon: Cloud,
      count: produtosSobEncomenda,
      showCount: produtosSobEncomenda > 0,
      statusIcon: true,
      description: "Catálogo Duotone para pedidos",
    },
    { 
      title: "Usados", 
      url: "/estoque/usados", 
      icon: Recycle,
      count: tradeInsSummary?.qtdEmEstoque || 0,
      showCount: true,
      highlight: (tradeInsSummary?.qtdEmEstoque || 0) > 0,
      description: "Trade-ins para revenda",
    },
    { 
      title: "Entrada", 
      url: "/estoque/entrada", 
      icon: ScanLine,
      pulse: true,
      recentCount: recentEntries,
      description: "Entrada de mercadoria via câmera ou código",
    },
    { 
      title: "Importar NF-e", 
      url: "/estoque/importar-nfe", 
      icon: FileText, 
      description: "Upload de XML de nota fiscal",
    },
    { 
      title: "Inventário", 
      url: "/estoque/inventario", 
      icon: Warehouse, 
      disabled: false,
      description: "Contagem física",
    },
  ];

  const isActive = (url: string) => {
    // Check if current path matches exactly or is the /estoque dashboard
    if (location.pathname === "/estoque" && url === "/estoque/loja") {
      return false; // Don't highlight "Minha Loja" when on dashboard
    }
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  // Check if we're on the main dashboard
  const isOnDashboard = location.pathname === "/estoque";

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn(
        "flex gap-2 overflow-x-auto pb-2 -mb-2 scroll-container-x scroll-fade-right",
        className
      )}>
        {menuItems.map((item) => {
          const active = isActive(item.url);
          
          const content = (
            <NavLink
              key={item.url}
              to={item.disabled ? "#" : item.url}
              className={cn(
                "relative flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] shrink-0 group touch-active no-select",
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : item.disabled
                  ? "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80 hover:shadow-sm"
              )}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              {/* Icon with optional pulse animation */}
              <div className="relative">
                <item.icon className={cn(
                  "h-4 w-4 transition-transform duration-200 shrink-0",
                  !item.disabled && !active && "group-hover:scale-110",
                  item.pulse && !active && "animate-pulse"
                )} />
                
                {/* Status indicator for cloud sync */}
                {item.statusIcon && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-success animate-pulse" />
                )}
              </div>
              
              <span className="hidden sm:inline">{item.title}</span>
              
              {/* Badge with count */}
              {item.showCount && item.count !== undefined && item.count > 0 && (
                <Badge 
                  variant={active ? "secondary" : item.highlight ? "default" : "outline"}
                  className={cn(
                    "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
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
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/70 hidden sm:inline">
                  Em breve
                </span>
              )}
            </NavLink>
          );

          // Wrap with tooltip
          return (
            <Tooltip key={item.url}>
              <TooltipTrigger asChild>
                {content}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs">{item.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
