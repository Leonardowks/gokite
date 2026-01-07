import { useState } from "react";
import { Plus, X, Package, DollarSign, Calendar, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { TradeInRapidoDrawer } from "./TradeInRapidoDrawer";
import { useNavigate } from "react-router-dom";

interface FloatingActionButtonProps {
  className?: string;
}

export function FloatingActionButton({ className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tradeInOpen, setTradeInOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    {
      icon: Package,
      label: "Trade-in",
      color: "bg-primary",
      onClick: () => {
        setIsOpen(false);
        setTradeInOpen(true);
      },
    },
    {
      icon: DollarSign,
      label: "Nova Venda",
      color: "bg-success",
      onClick: () => {
        setIsOpen(false);
        navigate("/vendas");
      },
    },
    {
      icon: Calendar,
      label: "Nova Aula",
      color: "bg-accent",
      onClick: () => {
        setIsOpen(false);
        navigate("/aulas");
      },
    },
    {
      icon: ShoppingCart,
      label: "Estoque",
      color: "bg-warning",
      onClick: () => {
        setIsOpen(false);
        navigate("/estoque/trade-ins");
      },
    },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div className={cn("fixed bottom-20 right-4 z-50 md:hidden", className)}>
        {/* Action Buttons */}
        <div
          className={cn(
            "absolute bottom-16 right-0 flex flex-col-reverse gap-3 transition-all duration-300",
            isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {actions.map((action, index) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={cn(
                "flex items-center gap-3 pl-4 pr-2 py-2 rounded-full shadow-lg transition-all duration-200",
                "bg-card border border-border hover:scale-105",
                "animate-in fade-in slide-in-from-bottom-2"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", action.color)}>
                <action.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            </button>
          ))}
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
            "bg-primary text-primary-foreground hover:scale-105 active:scale-95",
            isOpen && "rotate-45 bg-muted text-muted-foreground"
          )}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {/* Trade-in Drawer */}
      <TradeInRapidoDrawer open={tradeInOpen} onOpenChange={setTradeInOpen} />
    </>
  );
}
