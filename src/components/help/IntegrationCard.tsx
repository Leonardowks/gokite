import { Integration } from "@/lib/helpContent";
import { CheckCircle2, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface IntegrationCardProps {
  integration: Integration;
  onClose?: () => void;
}

export function IntegrationCard({ integration, onClose }: IntegrationCardProps) {
  const Icon = integration.icone;
  const navigate = useNavigate();
  
  const statusConfig = {
    ativo: { 
      label: "Ativo", 
      icon: CheckCircle2, 
      className: "text-emerald-500 bg-emerald-500/10" 
    },
    configurar: { 
      label: "Configurar", 
      icon: Settings, 
      className: "text-amber-500 bg-amber-500/10" 
    },
    opcional: { 
      label: "Opcional", 
      icon: Sparkles, 
      className: "text-blue-500 bg-blue-500/10" 
    }
  };
  
  const status = statusConfig[integration.status || "opcional"];
  const StatusIcon = status.icon;
  
  const handleNavigate = () => {
    if (integration.configuracao.startsWith("/")) {
      onClose?.();
      navigate(integration.configuracao.split(" ")[0]);
    }
  };
  
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm">{integration.nome}</h4>
            <p className="text-xs text-muted-foreground">{integration.funcao}</p>
          </div>
        </div>
        
        {/* Status badge */}
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium",
          status.className
        )}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </div>
      </div>
      
      {/* Config link */}
      {integration.configuracao !== "Automático" && (
        <button
          onClick={handleNavigate}
          className="text-xs text-primary hover:underline mb-3 flex items-center gap-1"
        >
          <Settings className="h-3 w-3" />
          {integration.configuracao}
        </button>
      )}
      
      {/* Funcionalidades */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Funcionalidades
        </p>
        <ul className="space-y-1">
          {integration.funcionalidades.map((func, idx) => (
            <li key={idx} className="flex items-center gap-2 text-xs text-foreground">
              <div className="w-1 h-1 rounded-full bg-primary/50" />
              {func}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
