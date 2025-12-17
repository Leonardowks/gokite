import { useEffect, useState } from "react";
import { DollarSign, Calendar as CalendarIcon, TrendingUp, Users, CheckCircle, XCircle, Clock, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { localStorageService, type Agendamento } from "@/lib/localStorage";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DailyRoutineWidget } from "@/components/DailyRoutineWidget";
import { QuickActionsPanel } from "@/components/QuickActionsPanel";
import { OnboardingTour } from "@/components/OnboardingTour";
import { WindConditionsWidget } from "@/components/WindConditionsWidget";
import { useNavigate } from "react-router-dom";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";

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
  const navigate = useNavigate();

  useEffect(() => { loadStats(); }, []);

  const loadStats = () => {
    try {
      localStorageService.inicializarMock();
      const baseStats = localStorageService.getEstatisticas();
      const allAulas = localStorageService.listarAgendamentos();
      const clientes = localStorageService.listarClientes();
      
      const confirmadas = allAulas.filter(a => a.status === 'confirmada').length;
      const canceladas = allAulas.filter(a => a.status === 'cancelada').length;
      
      setStats({
        ...baseStats,
        totalClientes: clientes.length,
        aulasConfirmadas: confirmadas,
        aulasCanceladas: canceladas
      });

      const agendamentos = allAulas
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        .slice(0, 5);
      setProximasAulas(agendamentos);

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

  const routineTasks = [
    ...(stats.aulasPendentes > 0 ? [{
      id: 'aulas-pendentes',
      title: `Confirmar ${stats.aulasPendentes} aula(s) pendente(s)`,
      description: 'Aulas aguardando sua confirmação',
      priority: 'urgent' as const,
      link: '/admin/aulas',
      count: stats.aulasPendentes,
      icon: Clock
    }] : [])
  ];

  const quickActions = [
    ...(stats.aulasPendentes > 0 ? [{
      id: 'confirmar-proxima',
      title: 'Confirmar Próxima Aula',
      subtitle: 'Clique para confirmar',
      icon: CheckCircle,
      onClick: () => {
        const pendente = proximasAulas.find(a => a.status === 'pendente');
        if (pendente) confirmarAula(pendente.id);
      },
      badge: stats.aulasPendentes
    }] : [])
  ];

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fade-in">
      <OnboardingTour />
      
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">{saudacao}! 👋</span>
            <PremiumBadge variant="success" size="sm" icon={Sparkles}>
              Sistema Ativo
            </PremiumBadge>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Visão geral da sua operação
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, dd 'de' MMMM")}
        </div>
      </div>

      {/* Widgets Row 1 - Wind + Daily Routine */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-1">
          <WindConditionsWidget />
        </div>
        <div className="lg:col-span-2">
          <DailyRoutineWidget tasks={routineTasks} />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <QuickActionsPanel actions={quickActions} />
      </div>

      {/* KPIs Premium */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        <PremiumCard hover className="metric-card-hoje">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Aulas Hoje
                </p>
                <AnimatedNumber 
                  value={stats.aulasHoje} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container shrink-0">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Receita Hoje
                </p>
                <AnimatedNumber 
                  value={stats.receitaHoje} 
                  format="currency"
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container shrink-0">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover className="metric-card-pendentes">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Pendentes
                </p>
                <AnimatedNumber 
                  value={stats.aulasPendentes} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container bg-warning/10 shrink-0">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Total Clientes
                </p>
                <AnimatedNumber 
                  value={stats.totalClientes} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Secondary Stats Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Confirmadas</p>
              <AnimatedNumber 
                value={stats.aulasConfirmadas}
                className="text-2xl sm:text-3xl font-bold text-foreground"
              />
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Canceladas</p>
              <AnimatedNumber 
                value={stats.aulasCanceladas}
                className="text-2xl sm:text-3xl font-bold text-foreground"
              />
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Taxa de Conversão</p>
              <AnimatedNumber 
                value={stats.aulasConfirmadas + stats.aulasPendentes > 0 
                  ? Math.round((stats.aulasConfirmadas / (stats.aulasConfirmadas + stats.aulasPendentes)) * 100)
                  : 0}
                suffix="%"
                className="text-2xl sm:text-3xl font-bold text-foreground"
              />
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Charts Premium */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <PremiumCard>
          <CardHeader className="p-4 sm:p-5 pb-0">
            <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              Receita por Tipo de Aula
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
            <ResponsiveContainer width="100%" height={220} className="sm:!h-[280px]">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '13px',
                    boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.15)'
                  }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                />
                <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </PremiumCard>

        <PremiumCard>
          <CardHeader className="p-4 sm:p-5 pb-0">
            <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <CalendarIcon className="h-4 w-4 text-accent" />
              </div>
              Status das Aulas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
            <ResponsiveContainer width="100%" height={220} className="sm:!h-[280px]">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '13px',
                    boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.15)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Upcoming Classes Premium */}
      <PremiumCard>
        <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-display">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="h-4.5 w-4.5 text-primary" />
            </div>
            Próximas Aulas
          </CardTitle>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-primary" onClick={() => navigate('/admin/aulas')}>
            Ver todas
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          {proximasAulas.length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhuma aula agendada</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-3 sm:hidden">
                {proximasAulas.map((aula) => (
                  <div key={aula.id} className="p-4 border border-border/50 rounded-xl bg-muted/20 space-y-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{aula.cliente_nome}</div>
                      <StatusBadge status={aula.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{format(new Date(aula.data), 'dd/MM')} às {aula.horario}</span>
                      <span className="capitalize">• {aula.tipo_aula.replace('_', ' ')}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {aula.status === 'pendente' && (
                        <Button size="sm" className="flex-1 h-10" onClick={() => confirmarAula(aula.id)}>
                          Confirmar
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 h-10"
                        onClick={() => cancelarAula(aula.id)} 
                        disabled={aula.status === 'cancelada'}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto -mx-2 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="text-muted-foreground font-medium">Data/Hora</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Tipo</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Local</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                      <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proximasAulas.map((aula) => (
                      <TableRow key={aula.id} className="border-border/50 hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium">{format(new Date(aula.data), 'dd/MM')}</div>
                          <div className="text-sm text-muted-foreground">{aula.horario}</div>
                        </TableCell>
                        <TableCell className="font-medium">{aula.cliente_nome}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{aula.tipo_aula.replace('_', ' ')}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{aula.localizacao}</TableCell>
                        <TableCell><StatusBadge status={aula.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {aula.status === 'pendente' && (
                              <Button size="sm" onClick={() => confirmarAula(aula.id)}>
                                Confirmar
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
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
            </>
          )}
        </CardContent>
      </PremiumCard>
    </div>
  );
}
