import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Agendamento } from "@/lib/localStorage";

interface WeeklyTimelineProps {
  aulas: Agendamento[];
  onAulaClick?: (aula: Agendamento) => void;
}

export function WeeklyTimeline({ aulas, onAulaClick }: WeeklyTimelineProps) {
  const hoje = new Date();
  const inicioDaSemana = startOfWeek(hoje, { locale: ptBR });
  const diasDaSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioDaSemana, i));

  const getAulasPorDia = (dia: Date) => {
    return aulas.filter(aula => {
      const dataAula = new Date(aula.data);
      return isSameDay(dataAula, dia);
    }).sort((a, b) => a.horario.localeCompare(b.horario));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmada':
        return <CheckCircle className="h-3 w-3 text-success" />;
      case 'cancelada':
        return <XCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Clock className="h-3 w-3 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmada':
        return 'bg-success/10 border-success/20 hover:bg-success/20';
      case 'cancelada':
        return 'bg-destructive/10 border-destructive/20 hover:bg-destructive/20';
      default:
        return 'bg-warning/10 border-warning/20 hover:bg-warning/20';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📅 Timeline Semanal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {diasDaSemana.map((dia) => {
            const aulasDoDia = getAulasPorDia(dia);
            const isHoje = isSameDay(dia, hoje);
            
            return (
              <div
                key={dia.toISOString()}
                className={`space-y-2 p-3 rounded-lg border ${
                  isHoje ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                }`}
              >
                <div className="text-center mb-3">
                  <div className={`text-xs font-medium ${isHoje ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(dia, 'EEE', { locale: ptBR }).toUpperCase()}
                  </div>
                  <div className={`text-lg font-bold ${isHoje ? 'text-primary' : 'text-foreground'}`}>
                    {format(dia, 'd', { locale: ptBR })}
                  </div>
                  {isHoje && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Hoje
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {aulasDoDia.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="text-xs text-muted-foreground">
                        Sem aulas
                      </div>
                    </div>
                  ) : (
                    aulasDoDia.map((aula) => (
                      <Button
                        key={aula.id}
                        variant="outline"
                        className={`w-full h-auto py-2 px-2 flex flex-col items-start gap-1 ${getStatusColor(aula.status)}`}
                        onClick={() => onAulaClick?.(aula)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold">
                            {aula.horario}
                          </span>
                          {getStatusIcon(aula.status)}
                        </div>
                        <div className="text-xs text-left line-clamp-1 w-full">
                          {aula.cliente_nome}
                        </div>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {aula.tipo_aula === 'kitesurf_iniciante' ? 'Init' :
                           aula.tipo_aula === 'kitesurf_intermediario' ? 'Inter' :
                           aula.tipo_aula === 'kitesurf_avancado' ? 'Avanç' :
                           aula.tipo_aula === 'wing_foil' ? 'Wing' :
                           aula.tipo_aula === 'foil' ? 'Foil' : 'Down'}
                        </Badge>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
