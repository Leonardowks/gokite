import { CommercialFlow } from "@/lib/helpContent";
import { ArrowDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlowDiagramProps {
  flow: CommercialFlow;
}

export function FlowDiagram({ flow }: FlowDiagramProps) {
  const Icon = flow.icone;
  
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border/50">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{flow.nome}</h4>
          <p className="text-xs text-muted-foreground">{flow.descricao}</p>
        </div>
      </div>
      
      {/* Flow Steps */}
      <div className="relative pl-4">
        {flow.passos.map((passo, index) => (
          <div key={index} className="relative">
            {/* Connector line */}
            {index < flow.passos.length - 1 && (
              <div className="absolute left-[7px] top-8 w-0.5 h-6 bg-border" />
            )}
            
            {/* Step */}
            <div className="flex items-start gap-3 pb-4">
              {/* Dot/Icon */}
              <div className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                passo.isAutomatic 
                  ? "bg-amber-500/20 ring-2 ring-amber-500/50" 
                  : "bg-muted ring-2 ring-border"
              )}>
                {passo.isAutomatic && (
                  <Zap className="h-2.5 w-2.5 text-amber-500" />
                )}
              </div>
              
              {/* Content */}
              <div className={cn(
                "flex-1 text-sm",
                passo.isAutomatic && "font-medium"
              )}>
                <span className={cn(
                  passo.isAutomatic ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                )}>
                  {passo.isAutomatic && (
                    <span className="text-[10px] uppercase tracking-wider mr-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                      Auto
                    </span>
                  )}
                  {passo.text}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Automations involved */}
      {flow.automacoes.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Automações envolvidas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {flow.automacoes.map((auto, idx) => (
              <span 
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              >
                {auto.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
