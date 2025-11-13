import { useEffect, useState } from "react";
import { Users, Calendar, Package, ShoppingCart } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClientes: 0,
    aulasAgendadas: 0,
    equipamentosAlugados: 0,
    vendasMes: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [clientes, aulas, aluguel, pedidos] = await Promise.all([
        supabase.from("clientes").select("*", { count: "exact", head: true }),
        supabase
          .from("aulas")
          .select("*", { count: "exact", head: true })
          .eq("status", "agendada"),
        supabase
          .from("aluguel")
          .select("*", { count: "exact", head: true })
          .eq("status", "ativo"),
        supabase
          .from("pedidos_ecommerce")
          .select("valor_total")
          .gte("data_pedido", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      const vendasTotal = pedidos.data?.reduce((sum, p) => sum + Number(p.valor_total), 0) || 0;

      setStats({
        totalClientes: clientes.count || 0,
        aulasAgendadas: aulas.count || 0,
        equipamentosAlugados: aluguel.count || 0,
        vendasMes: vendasTotal,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua operação</p>
      </div>

      {/* Métricas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Aulas Hoje"
          value={stats.aulasHoje}
          icon={CalendarIcon}
        />
        <MetricCard
          title="Receita Hoje"
          value={`R$ ${stats.receitaHoje.toLocaleString('pt-BR')}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Aulas Pendentes"
          value={stats.aulasPendentes}
          icon={TrendingUp}
        />
      </div>

      {/* Próximas Aulas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Próximas Aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proximasAulas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma aula agendada
            </p>
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
                      <div className="font-medium">
                        {format(new Date(aula.data), 'dd/MM')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {aula.horario}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{aula.cliente_nome}</TableCell>
                    <TableCell className="capitalize">{aula.tipo_aula.replace('_', ' ')}</TableCell>
                    <TableCell className="capitalize">{aula.localizacao}</TableCell>
                    <TableCell>
                      <StatusBadge status={aula.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {aula.status === 'pendente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmarAula(aula.id)}
                          >
                            ✓ Confirmar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelarAula(aula.id)}
                          disabled={aula.status === 'cancelada'}
                        >
                          ✗ Cancelar
                        </Button>
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
