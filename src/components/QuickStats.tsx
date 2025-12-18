import { useState, useEffect } from "react";
import { Bell, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { localStorageService } from "@/lib/localStorage";

interface QuickStatsProps {
  className?: string;
}

export function QuickStats({ className = "" }: QuickStatsProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    const loadStats = () => {
      try {
        const aulas = localStorageService.listarAgendamentos();
        const pending = aulas.filter(a => a.status === 'pendente').length;
        
        // Count urgent (classes today/tomorrow that are pending)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const urgent = aulas.filter(a => {
          const aulaDate = new Date(a.data);
          return a.status === 'pendente' && 
            (aulaDate <= tomorrow);
        }).length;

        setPendingCount(pending);
        setUrgentCount(urgent);
      } catch (error) {
        console.error("Error loading quick stats:", error);
      }
    };

    loadStats();
    
    // Refresh every minute
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const totalAlerts = pendingCount + urgentCount;

  if (totalAlerts === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative flex items-center ${className}`}>
            <div 
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium
                ${urgentCount > 0 
                  ? 'bg-destructive/10 text-destructive' 
                  : 'bg-warning/10 text-warning'
                }
                ${urgentCount > 0 ? 'animate-pulse-soft' : ''}
              `}
            >
              {urgentCount > 0 ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              <span>{pendingCount}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <div className="space-y-1">
            <p className="font-medium">Ações Pendentes</p>
            {pendingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingCount} aula(s) aguardando confirmação
              </p>
            )}
            {urgentCount > 0 && (
              <p className="text-xs text-destructive">
                {urgentCount} requer(em) ação urgente
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
