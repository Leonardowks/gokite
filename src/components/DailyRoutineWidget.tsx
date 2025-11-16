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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            {greeting}! Você está em dia 🎉
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ótimo trabalho! Todas as tarefas urgentes foram concluídas. 
            Continue monitorando para não perder nenhuma oportunidade.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="daily-routine-widget border-primary/50 bg-gradient-to-br from-primary/5 to-transparent hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {greeting}! Sua Rotina do Dia
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? 'tarefa precisa' : 'tarefas precisam'} da sua atenção
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.slice(0, 5).map((task, index) => {
          const Icon = task.icon;
          const config = priorityConfig[task.priority];
          
          return (
            <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className={`${config.color} text-xs`}>
                    {config.label}
                  </Badge>
                  {task.count > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {task.count}
                    </Badge>
                  )}
                </div>
                <h4 className="font-medium text-sm text-foreground mb-1">{task.title}</h4>
                <p className="text-xs text-muted-foreground">{task.description}</p>
              </div>
              <Button asChild size="sm" variant="ghost" className="shrink-0">
                <Link to={task.link}>
                  <Icon className="h-4 w-4 mr-1" />
                  Ir
                </Link>
              </Button>
            </div>
          );
        })}
        
        {tasks.length > 5 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            + {tasks.length - 5} tarefas adicionais
          </p>
        )}
      </CardContent>
    </Card>
  );
}
