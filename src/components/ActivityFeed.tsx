import { useState, useEffect } from "react";
import { 
  Calendar, 
  Users, 
  Package, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PremiumCard } from "@/components/ui/premium-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { localStorageService } from "@/lib/localStorage";

interface Activity {
  id: string;
  type: "aula_confirmada" | "aula_agendada" | "aula_cancelada" | "novo_cliente" | "aluguel" | "pagamento" | "lead";
  title: string;
  description: string;
  timestamp: Date;
  icon: typeof Calendar;
  iconColor: string;
  iconBg: string;
}

const iconMap = {
  aula_confirmada: { icon: CheckCircle, iconColor: "text-success", iconBg: "bg-success/10" },
  aula_agendada: { icon: Calendar, iconColor: "text-primary", iconBg: "bg-primary/10" },
  aula_cancelada: { icon: XCircle, iconColor: "text-destructive", iconBg: "bg-destructive/10" },
  novo_cliente: { icon: Users, iconColor: "text-primary", iconBg: "bg-primary/10" },
  aluguel: { icon: Package, iconColor: "text-accent", iconBg: "bg-accent/10" },
  pagamento: { icon: DollarSign, iconColor: "text-success", iconBg: "bg-success/10" },
  lead: { icon: TrendingUp, iconColor: "text-warning", iconBg: "bg-warning/10" },
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Generate mock activities from localStorage data
    const aulas = localStorageService.listarAgendamentos();
    const clientes = localStorageService.listarClientes();
    
    const mockActivities: Activity[] = [];
    
    // Recent confirmed classes
    aulas
      .filter(a => a.status === 'confirmada')
      .slice(0, 3)
      .forEach((aula, i) => {
        mockActivities.push({
          id: `aula-conf-${aula.id}`,
          type: "aula_confirmada",
          title: "Aula confirmada",
          description: `${aula.cliente_nome} - ${aula.tipo_aula}`,
          timestamp: new Date(Date.now() - (i + 1) * 1800000), // 30min intervals
          ...iconMap.aula_confirmada
        });
      });

    // Recent pending classes
    aulas
      .filter(a => a.status === 'pendente')
      .slice(0, 2)
      .forEach((aula, i) => {
        mockActivities.push({
          id: `aula-pend-${aula.id}`,
          type: "aula_agendada",
          title: "Nova aula agendada",
          description: `${aula.cliente_nome} aguardando confirmação`,
          timestamp: new Date(Date.now() - (i + 4) * 1800000),
          ...iconMap.aula_agendada
        });
      });

    // Recent clients (mock as new)
    clientes.slice(0, 2).forEach((cliente, i) => {
      mockActivities.push({
        id: `cliente-${cliente.email}-${i}`,
        type: "novo_cliente",
        title: "Novo cliente cadastrado",
        description: cliente.nome,
        timestamp: new Date(Date.now() - (i + 6) * 3600000), // hours ago
        ...iconMap.novo_cliente
      });
    });

    // Sort by timestamp
    mockActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setActivities(mockActivities.slice(0, 8));
  }, []);

  return (
    <PremiumCard className="h-full">
      <CardHeader className="p-4 sm:p-5 pb-0">
        <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div 
                  key={activity.id}
                  className="flex gap-3 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-9 h-9 rounded-xl ${activity.iconBg} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${activity.iconColor}`} />
                    </div>
                    {index < activities.length - 1 && (
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(activity.timestamp, { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </PremiumCard>
  );
}
