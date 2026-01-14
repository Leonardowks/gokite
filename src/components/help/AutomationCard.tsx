import { Automation } from "@/lib/helpContent";
import { ArrowRight } from "lucide-react";

interface AutomationCardProps {
  automation: Automation;
}

export function AutomationCard({ automation }: AutomationCardProps) {
  const Icon = automation.icone;
  
  return (
    <div className="group p-4 rounded-xl border border-border/50 bg-card hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
          <Icon className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground text-sm">{automation.nome}</h4>
        </div>
      </div>
      
      {/* Details */}
      <div className="space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground w-16 flex-shrink-0">Quando:</span>
          <span className="text-foreground">{automation.quando}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground w-16 flex-shrink-0">Como:</span>
          <span className="text-foreground">{automation.como}</span>
        </div>
        <div className="flex items-start gap-2 pt-2 border-t border-border/50">
          <ArrowRight className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{automation.resultado}</span>
        </div>
      </div>
    </div>
  );
}
