import { useEffect, useState } from "react";
import { DollarSign, Calendar as CalendarIcon, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { localStorageService, type Agendamento } from "@/lib/localStorage";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";

export default function Dashboard() {
  const [stats, setStats] = useState({ aulasHoje: 0, receitaHoje: 0, aulasPendentes: 0 });
  const [proximasAulas, setProximasAulas] = useState<Agendamento[]>([]);
  const { toast } = useToast();

  useEffect(() => { loadStats(); }, []);

  const loadStats = () => {
    try {
      localStorageService.inicializarMock();
      setStats(localStorageService.getEstatisticas());
      const agendamentos = localStorageService.listarAgendamentos()
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        .slice(0, 5);
      setProximasAulas(agendamentos);
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    }
  };

  const confirmarAula = (id: string) => {
    if (localStorageService.atualizarStatus(id, 'confirmada')) {
      toast({ title: "Aula confirmada!" });
      loadStats();
    }
  };

  const cancelarAula = (id: string) => {
    if (localStorageService.atualizarStatus(id, 'cancelada')) {
      toast({ title: "Aula cancelada." });
      loadStats();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua operação</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Aulas Hoje" value={stats.aulasHoje} icon={CalendarIcon} />
        <MetricCard title="Receita Hoje" value={`R$ ${stats.receitaHoje.toLocaleString('pt-BR')}`} icon={DollarSign} />
        <MetricCard title="Aulas Pendentes" value={stats.aulasPendentes} icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Próximas Aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proximasAulas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma aula agendada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proximasAulas.map((aula) => (
                  <TableRow key={aula.id}>
                    <TableCell>
                      <div className="font-medium">{format(new Date(aula.data), 'dd/MM')}</div>
                      <div className="text-sm text-muted-foreground">{aula.horario}</div>
                    </TableCell>
                    <TableCell className="font-medium">{aula.cliente_nome}</TableCell>
                    <TableCell className="capitalize">{aula.tipo_aula.replace('_', ' ')}</TableCell>
                    <TableCell className="capitalize">{aula.localizacao}</TableCell>
                    <TableCell><StatusBadge status={aula.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {aula.status === 'pendente' && (
                          <Button size="sm" variant="outline" onClick={() => confirmarAula(aula.id)}>✓ Confirmar</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => cancelarAula(aula.id)} disabled={aula.status === 'cancelada'}>✗ Cancelar</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
