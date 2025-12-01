import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, Package } from "lucide-react";
import { Link } from "react-router-dom";

interface RoutineTask {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'important' | 'normal';
  link: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface DailyRoutineWidgetProps {
  tasks: RoutineTask[];
}

export function DailyRoutineWidget({ tasks }: DailyRoutineWidgetProps) {
  const priorityConfig = {
    urgent: { color: 'bg-destructive text-destructive-foreground', label: 'URGENTE' },
    important: { color: 'bg-warning text-warning-foreground', label: 'IMPORTANTE' },
    normal: { color: 'bg-muted text-muted-foreground', label: 'NORMAL' }
  };

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? '☀️ Bom dia' : currentHour < 18 ? '☀️ Boa tarde' : '🌙 Boa noite';

  if (tasks.length === 0) {
    return (
      <Card className="daily-routine-widget border-success/50 bg-success/5">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            {greeting}! Você está em dia 🎉
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Ótimo trabalho! Todas as tarefas urgentes foram concluídas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="daily-routine-widget border-primary/50 bg-gradient-to-br from-primary/5 to-transparent hover-lift">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span className="truncate">{greeting}! Sua Rotina</span>
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? 'tarefa precisa' : 'tarefas precisam'} da sua atenção
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-2 sm:space-y-3">
        {tasks.slice(0, 5).map((task, index) => {
          const Icon = task.icon;
          const config = priorityConfig[task.priority];
          
          return (
            <div key={task.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
              <div className="flex items-center justify-center h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary/10 text-primary shrink-0 text-xs sm:text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                  <Badge variant="secondary" className={`${config.color} text-[10px] sm:text-xs px-1.5 py-0`}>
                    {config.label}
                  </Badge>
                  {task.count > 0 && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0">
                      {task.count}
                    </Badge>
                  )}
                </div>
                <h4 className="font-medium text-xs sm:text-sm text-foreground mb-0.5 sm:mb-1 line-clamp-2">{task.title}</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 hidden sm:block">{task.description}</p>
              </div>
              <Button asChild size="sm" variant="ghost" className="shrink-0 h-7 sm:h-8 px-2 sm:px-3">
                <Link to={task.link}>
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Ir</span>
                </Link>
              </Button>
            </div>
          );
        })}
        
        {tasks.length > 5 && (
          <p className="text-[10px] sm:text-xs text-center text-muted-foreground pt-1 sm:pt-2">
            + {tasks.length - 5} tarefas adicionais
          </p>
        )}
      </CardContent>
    </Card>
  );
}
