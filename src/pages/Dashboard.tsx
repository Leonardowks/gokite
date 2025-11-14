import { useEffect, useState } from "react";
import { DollarSign, Calendar as CalendarIcon, TrendingUp, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { localStorageService, type Agendamento } from "@/lib/localStorage";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    aulasHoje: 0, 
    receitaHoje: 0, 
    aulasPendentes: 0,
    totalClientes: 0,
    aulasConfirmadas: 0,
    aulasCanceladas: 0
  });
  const [proximasAulas, setProximasAulas] = useState<Agendamento[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => { loadStats(); }, []);

  const loadStats = () => {
    try {
      localStorageService.inicializarMock();
      const baseStats = localStorageService.getEstatisticas();
      const allAulas = localStorageService.listarAgendamentos();
      const clientes = localStorageService.listarClientes();
      
      // Estatísticas adicionais
      const confirmadas = allAulas.filter(a => a.status === 'confirmada').length;
      const canceladas = allAulas.filter(a => a.status === 'cancelada').length;
      
      setStats({
        ...baseStats,
        totalClientes: clientes.length,
        aulasConfirmadas: confirmadas,
        aulasCanceladas: canceladas
      });

      // Próximas aulas
      const agendamentos = allAulas
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        .slice(0, 5);
      setProximasAulas(agendamentos);

      // Dados para gráfico de barras - Receita por tipo de aula
      const receitaPorTipo = allAulas
        .filter(a => a.status === 'confirmada')
        .reduce((acc, aula) => {
          const tipo = aula.tipo_aula;
          if (!acc[tipo]) acc[tipo] = 0;
          acc[tipo] += aula.valor;
          return acc;
        }, {} as Record<string, number>);

      const barData = Object.entries(receitaPorTipo).map(([tipo, valor]) => ({
        name: tipo === 'iniciante' ? 'Iniciante' : 
              tipo === 'intermediario' ? 'Intermediário' : 
              tipo === 'avancado' ? 'Avançado' : 'Wing Foil',
        receita: valor
      }));
      setChartData(barData);

      // Dados para gráfico de pizza - Status das aulas
      const statusCount = allAulas.reduce((acc, aula) => {
        if (!acc[aula.status]) acc[aula.status] = 0;
        acc[aula.status]++;
        return acc;
      }, {} as Record<string, number>);

      const pieChartData = Object.entries(statusCount).map(([status, count]) => ({
        name: status === 'pendente' ? 'Pendentes' : 
              status === 'confirmada' ? 'Confirmadas' : 'Canceladas',
        value: count
      }));
      setPieData(pieChartData);

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

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua operação</p>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
          title="Pendentes" 
          value={stats.aulasPendentes} 
          icon={Clock}
        />
        <MetricCard 
          title="Total Clientes" 
          value={stats.totalClientes} 
          icon={Users}
        />
      </div>

      {/* Estatísticas Secundárias */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmadas</CardTitle>
            <CheckCircle className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.aulasConfirmadas}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas</CardTitle>
            <XCircle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.aulasCanceladas}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats.aulasConfirmadas + stats.aulasPendentes > 0 
                ? Math.round((stats.aulasConfirmadas / (stats.aulasConfirmadas + stats.aulasPendentes)) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita por Tipo de Aula</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status das Aulas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Próximas Aulas */}
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
            <div className="overflow-x-auto">
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
                            <Button size="sm" variant="outline" onClick={() => confirmarAula(aula.id)}>
                              Confirmar
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => cancelarAula(aula.id)} 
                            disabled={aula.status === 'cancelada'}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
