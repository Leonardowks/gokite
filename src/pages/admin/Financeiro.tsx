import { useEffect, useState, useMemo } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig 
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import { localStorageService, Agendamento, Aluguel } from "@/lib/localStorage";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinanceiroStats {
  receitaTotal: number;
  receitaAulas: number;
  receitaAluguel: number;
  ticketMedio: number;
  metaMensal: number;
  progressoMeta: number;
  receitaHoje: number;
  receitaSemana: number;
  receitaMes: number;
  crescimentoMes: number;
  transacoesHoje: number;
  aReceber: number;
}

interface Insight {
  tipo: 'sucesso' | 'alerta' | 'dica' | 'meta';
  titulo: string;
  descricao: string;
  acao?: string;
}

interface DailyRevenue {
  data: string;
  dataFormatada: string;
  aulas: number;
  aluguel: number;
  total: number;
}

const chartConfig = {
  aulas: {
    label: "Aulas",
    color: "hsl(var(--primary))",
  },
  aluguel: {
    label: "Aluguel",
    color: "hsl(var(--accent))",
  },
  total: {
    label: "Total",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const CORES_PIE = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted))"];

export default function Financeiro() {
  const [stats, setStats] = useState<FinanceiroStats>({
    receitaTotal: 0,
    receitaAulas: 0,
    receitaAluguel: 0,
    ticketMedio: 0,
    metaMensal: 15000,
    progressoMeta: 0,
    receitaHoje: 0,
    receitaSemana: 0,
    receitaMes: 0,
    crescimentoMes: 0,
    transacoesHoje: 0,
    aReceber: 0,
  });
  const [dailyData, setDailyData] = useState<DailyRevenue[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [alugueis, setAlugueis] = useState<Aluguel[]>([]);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = () => {
    const agendamentosData = localStorageService.listarAgendamentos();
    const alugueisData = localStorageService.listarAlugueis();
    
    setAgendamentos(agendamentosData);
    setAlugueis(alugueisData);

    const hoje = new Date();
    const inicioSemana = subDays(hoje, 7);
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);
    const mesPassadoInicio = startOfMonth(subDays(inicioMes, 1));
    const mesPassadoFim = endOfMonth(subDays(inicioMes, 1));

    // Receita de aulas confirmadas
    const aulasConfirmadas = agendamentosData.filter(a => a.status === 'confirmada');
    const receitaAulas = aulasConfirmadas.reduce((sum, a) => sum + a.valor, 0);

    // Receita de aluguéis ativos e concluídos
    const alugueisValidos = alugueisData.filter(a => a.status === 'ativo' || a.status === 'concluido');
    const receitaAluguel = alugueisValidos.reduce((sum, a) => sum + a.valor_total, 0);

    // Receita total
    const receitaTotal = receitaAulas + receitaAluguel;

    // Receita hoje
    const hojeStr = format(hoje, 'yyyy-MM-dd');
    const aulasHoje = aulasConfirmadas.filter(a => a.data.startsWith(hojeStr));
    const receitaAulasHoje = aulasHoje.reduce((sum, a) => sum + a.valor, 0);
    const alugueisHoje = alugueisValidos.filter(a => a.created_at.startsWith(hojeStr));
    const receitaAluguelHoje = alugueisHoje.reduce((sum, a) => sum + a.valor_total, 0);
    const receitaHoje = receitaAulasHoje + receitaAluguelHoje;

    // Receita semana
    const aulasSemana = aulasConfirmadas.filter(a => {
      const dataAula = parseISO(a.data);
      return dataAula >= inicioSemana && dataAula <= hoje;
    });
    const receitaAulasSemana = aulasSemana.reduce((sum, a) => sum + a.valor, 0);
    const alugueisSemana = alugueisValidos.filter(a => {
      const dataAluguel = parseISO(a.created_at);
      return dataAluguel >= inicioSemana && dataAluguel <= hoje;
    });
    const receitaAluguelSemana = alugueisSemana.reduce((sum, a) => sum + a.valor_total, 0);
    const receitaSemana = receitaAulasSemana + receitaAluguelSemana;

    // Receita mês atual
    const aulasMes = aulasConfirmadas.filter(a => {
      const dataAula = parseISO(a.data);
      return dataAula >= inicioMes && dataAula <= fimMes;
    });
    const receitaAulasMes = aulasMes.reduce((sum, a) => sum + a.valor, 0);
    const alugueisMes = alugueisValidos.filter(a => {
      const dataAluguel = parseISO(a.created_at);
      return dataAluguel >= inicioMes && dataAluguel <= fimMes;
    });
    const receitaAluguelMes = alugueisMes.reduce((sum, a) => sum + a.valor_total, 0);
    const receitaMes = receitaAulasMes + receitaAluguelMes;

    // Receita mês passado (para calcular crescimento)
    const aulasMesPassado = aulasConfirmadas.filter(a => {
      const dataAula = parseISO(a.data);
      return dataAula >= mesPassadoInicio && dataAula <= mesPassadoFim;
    });
    const receitaAulasMesPassado = aulasMesPassado.reduce((sum, a) => sum + a.valor, 0);
    const alugueisMesPassado = alugueisValidos.filter(a => {
      const dataAluguel = parseISO(a.created_at);
      return dataAluguel >= mesPassadoInicio && dataAluguel <= mesPassadoFim;
    });
    const receitaAluguelMesPassado = alugueisMesPassado.reduce((sum, a) => sum + a.valor_total, 0);
    const receitaMesPassado = receitaAulasMesPassado + receitaAluguelMesPassado;

    // Crescimento
    const crescimentoMes = receitaMesPassado > 0 
      ? ((receitaMes - receitaMesPassado) / receitaMesPassado) * 100 
      : 0;

    // Ticket médio
    const totalTransacoes = aulasConfirmadas.length + alugueisValidos.length;
    const ticketMedio = totalTransacoes > 0 ? receitaTotal / totalTransacoes : 0;

    // Transações hoje
    const transacoesHoje = aulasHoje.length + alugueisHoje.length;

    // A receber (aulas pendentes)
    const aulasPendentes = agendamentosData.filter(a => a.status === 'pendente');
    const aReceber = aulasPendentes.reduce((sum, a) => sum + a.valor, 0);

    // Meta mensal
    const metaMensal = 15000;
    const progressoMeta = (receitaMes / metaMensal) * 100;

    setStats({
      receitaTotal,
      receitaAulas,
      receitaAluguel,
      ticketMedio,
      metaMensal,
      progressoMeta: Math.min(progressoMeta, 100),
      receitaHoje,
      receitaSemana,
      receitaMes,
      crescimentoMes,
      transacoesHoje,
      aReceber,
    });

    // Gerar dados diários para gráfico (últimos 14 dias)
    const dias = eachDayOfInterval({
      start: subDays(hoje, 13),
      end: hoje,
    });

    const dadosDiarios: DailyRevenue[] = dias.map(dia => {
      const diaStr = format(dia, 'yyyy-MM-dd');
      const aulaDia = aulasConfirmadas.filter(a => a.data.startsWith(diaStr));
      const aluguelDia = alugueisValidos.filter(a => a.created_at.startsWith(diaStr));
      
      const receitaAulasDia = aulaDia.reduce((sum, a) => sum + a.valor, 0);
      const receitaAluguelDia = aluguelDia.reduce((sum, a) => sum + a.valor_total, 0);

      return {
        data: diaStr,
        dataFormatada: format(dia, 'dd/MM', { locale: ptBR }),
        aulas: receitaAulasDia,
        aluguel: receitaAluguelDia,
        total: receitaAulasDia + receitaAluguelDia,
      };
    });

    setDailyData(dadosDiarios);

    // Gerar insights
    generateInsights(
      receitaMes,
      metaMensal,
      crescimentoMes,
      aReceber,
      ticketMedio,
      agendamentosData,
      alugueisData
    );
  };

  const generateInsights = (
    receitaMes: number,
    metaMensal: number,
    crescimento: number,
    aReceber: number,
    ticketMedio: number,
    agendamentos: Agendamento[],
    alugueis: Aluguel[]
  ) => {
    const newInsights: Insight[] = [];
    const hoje = new Date();
    const diasRestantesMes = differenceInDays(endOfMonth(hoje), hoje);
    const progressoMeta = (receitaMes / metaMensal) * 100;

    // Insight de meta
    if (progressoMeta >= 100) {
      newInsights.push({
        tipo: 'sucesso',
        titulo: '🎉 Meta batida!',
        descricao: `Você alcançou ${progressoMeta.toFixed(0)}% da meta mensal. Parabéns pelo excelente resultado!`,
      });
    } else if (progressoMeta >= 80) {
      newInsights.push({
        tipo: 'meta',
        titulo: 'Quase lá!',
        descricao: `Faltam R$ ${(metaMensal - receitaMes).toLocaleString('pt-BR')} para bater a meta. Você consegue!`,
        acao: 'Confirmar aulas pendentes',
      });
    } else if (diasRestantesMes <= 7 && progressoMeta < 60) {
      newInsights.push({
        tipo: 'alerta',
        titulo: 'Atenção com a meta',
        descricao: `Restam ${diasRestantesMes} dias e você está em ${progressoMeta.toFixed(0)}% da meta. Considere ações promocionais.`,
        acao: 'Ver estratégias',
      });
    }

    // Insight de crescimento
    if (crescimento > 20) {
      newInsights.push({
        tipo: 'sucesso',
        titulo: 'Crescimento acelerado',
        descricao: `Receita +${crescimento.toFixed(0)}% vs. mês anterior. Seu negócio está decolando!`,
      });
    } else if (crescimento < -10) {
      newInsights.push({
        tipo: 'alerta',
        titulo: 'Queda de receita',
        descricao: `Receita ${crescimento.toFixed(0)}% vs. mês anterior. Analise o que mudou.`,
        acao: 'Ver comparativo',
      });
    }

    // Insight de valores a receber
    if (aReceber > 0) {
      newInsights.push({
        tipo: 'dica',
        titulo: `R$ ${aReceber.toLocaleString('pt-BR')} a confirmar`,
        descricao: `Você tem aulas pendentes que podem virar receita. Confirme agora!`,
        acao: 'Confirmar aulas',
      });
    }

    // Insight de ticket médio
    if (ticketMedio > 0 && ticketMedio < 300) {
      newInsights.push({
        tipo: 'dica',
        titulo: 'Aumente o ticket médio',
        descricao: `Seu ticket médio é R$ ${ticketMedio.toFixed(0)}. Ofereça pacotes para aumentar o valor por cliente.`,
        acao: 'Criar pacote',
      });
    }

    // Insight de aluguéis atrasados
    const alugueisAtrasados = alugueis.filter(a => {
      if (a.status !== 'ativo') return false;
      const dataFim = parseISO(a.data_fim);
      return dataFim < hoje;
    });

    if (alugueisAtrasados.length > 0) {
      const valorAtrasado = alugueisAtrasados.reduce((sum, a) => sum + a.valor_total, 0);
      newInsights.push({
        tipo: 'alerta',
        titulo: `${alugueisAtrasados.length} aluguel(éis) atrasado(s)`,
        descricao: `Total de R$ ${valorAtrasado.toLocaleString('pt-BR')} em equipamentos não devolvidos.`,
        acao: 'Cobrar devolução',
      });
    }

    setInsights(newInsights);
  };

  // Dados para gráfico de pizza
  const pieData = useMemo(() => [
    { name: 'Aulas', value: stats.receitaAulas, fill: 'hsl(var(--primary))' },
    { name: 'Aluguel', value: stats.receitaAluguel, fill: 'hsl(var(--accent))' },
  ].filter(item => item.value > 0), [stats]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  };

  const getInsightIcon = (tipo: Insight['tipo']) => {
    switch (tipo) {
      case 'sucesso': return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'alerta': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'dica': return <Lightbulb className="h-5 w-5 text-warning" />;
      case 'meta': return <Target className="h-5 w-5 text-primary" />;
    }
  };

  const getInsightBg = (tipo: Insight['tipo']) => {
    switch (tipo) {
      case 'sucesso': return 'bg-success/10 border-success/20';
      case 'alerta': return 'bg-destructive/10 border-destructive/20';
      case 'dica': return 'bg-warning/10 border-warning/20';
      case 'meta': return 'bg-primary/10 border-primary/20';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão Financeira</h1>
          <p className="text-muted-foreground">Acompanhe suas receitas, metas e insights do negócio</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Calendar className="h-4 w-4 mr-1" />
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </Badge>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita do Mês</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {formatCurrency(stats.receitaMes)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {stats.crescimentoMes >= 0 ? (
                <Badge variant="secondary" className="bg-success/20 text-success border-0">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{stats.crescimentoMes.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-destructive/20 text-destructive border-0">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {stats.crescimentoMes.toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">vs. mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Hoje</CardTitle>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {formatCurrency(stats.receitaHoje)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.transacoesHoje} transação(ões)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {formatCurrency(stats.ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Por transação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Receber</CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {formatCurrency(stats.aReceber)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Aulas pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Meta Mensal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Meta Mensal
              </CardTitle>
              <CardDescription>
                {formatCurrency(stats.receitaMes)} de {formatCurrency(stats.metaMensal)}
              </CardDescription>
            </div>
            <Badge 
              variant={stats.progressoMeta >= 100 ? "default" : stats.progressoMeta >= 70 ? "secondary" : "outline"}
              className={stats.progressoMeta >= 100 ? "bg-success" : ""}
            >
              {stats.progressoMeta.toFixed(0)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={stats.progressoMeta} className="h-3" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>R$ 0</span>
            <span className="font-medium text-foreground">
              Faltam {formatCurrency(Math.max(0, stats.metaMensal - stats.receitaMes))}
            </span>
            <span>{formatCurrency(stats.metaMensal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Insights Inteligentes */}
      {insights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight, index) => (
            <Card key={index} className={`border ${getInsightBg(insight.tipo)}`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.tipo)}
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{insight.titulo}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{insight.descricao}</p>
                    {insight.acao && (
                      <Badge variant="outline" className="mt-2 cursor-pointer hover:bg-muted">
                        {insight.acao}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Gráficos */}
      <Tabs defaultValue="evolucao" className="space-y-4">
        <TabsList>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="composicao">Composição</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="evolucao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receita Diária (Últimos 14 dias)</CardTitle>
              <CardDescription>Acompanhe a evolução das suas receitas por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="dataFormatada" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value) => `R$${value}`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value) => formatCurrency(Number(value))}
                    />} 
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    fill="url(#fillTotal)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="composicao" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Receita por Categoria</CardTitle>
                <CardDescription>Distribuição entre aulas e aluguéis</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value) => formatCurrency(Number(value))}
                      />} 
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhamento</CardTitle>
                <CardDescription>Valores por categoria</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="font-medium">Aulas</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(stats.receitaAulas)}</div>
                    <div className="text-xs text-muted-foreground">
                      {stats.receitaTotal > 0 
                        ? ((stats.receitaAulas / stats.receitaTotal) * 100).toFixed(0)
                        : 0}% do total
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-accent/10">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-accent" />
                    <span className="font-medium">Aluguel</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(stats.receitaAluguel)}</div>
                    <div className="text-xs text-muted-foreground">
                      {stats.receitaTotal > 0 
                        ? ((stats.receitaAluguel / stats.receitaTotal) * 100).toFixed(0)
                        : 0}% do total
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total Geral</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(stats.receitaTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparativo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receita por Tipo (Últimos 14 dias)</CardTitle>
              <CardDescription>Compare aulas vs. aluguéis ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="dataFormatada" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value) => `R$${value}`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value) => formatCurrency(Number(value))}
                    />} 
                  />
                  <Bar dataKey="aulas" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="aluguel" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resumo Rápido */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Semana Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.receitaSemana)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Média Diária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.receitaMes / new Date().getDate())}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Projeção Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency((stats.receitaMes / new Date().getDate()) * 30)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
