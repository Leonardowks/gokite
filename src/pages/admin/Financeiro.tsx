import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
  Wallet,
  Sparkles,
  Trophy,
  Zap,
  CreditCard,
  Landmark,
  Package,
  Receipt,
  ChevronRight,
  Settings2,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle, PremiumCardDescription } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
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
import { useTransacoes, useTransacoesSummary, Transacao } from "@/hooks/useTransacoes";
import { TransacaoDetalheDialog } from "@/components/TransacaoDetalheDialog";

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
    color: "hsl(var(--chart-1))",
  },
  aluguel: {
    label: "Aluguel",
    color: "hsl(var(--chart-2))",
  },
  total: {
    label: "Total",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransacao, setSelectedTransacao] = useState<Transacao | null>(null);
  const [isDetalheOpen, setIsDetalheOpen] = useState(false);

  // Fetch transações from Supabase
  const { data: transacoes = [], isLoading: isLoadingTransacoes } = useTransacoes({ limit: 10 });
  const { data: transacoesSummary } = useTransacoesSummary('mes');

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = () => {
    setIsLoading(true);
    
    // Simulate loading for premium feel
    setTimeout(() => {
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

      // Receita mês passado
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
      
      setIsLoading(false);
    }, 300);
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

    if (progressoMeta >= 100) {
      newInsights.push({
        tipo: 'sucesso',
        titulo: 'Meta batida!',
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
        descricao: `Restam ${diasRestantesMes} dias e você está em ${progressoMeta.toFixed(0)}% da meta.`,
        acao: 'Ver estratégias',
      });
    }

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

    if (aReceber > 0) {
      newInsights.push({
        tipo: 'dica',
        titulo: `R$ ${aReceber.toLocaleString('pt-BR')} a confirmar`,
        descricao: `Você tem aulas pendentes que podem virar receita. Confirme agora!`,
        acao: 'Confirmar aulas',
      });
    }

    if (ticketMedio > 0 && ticketMedio < 300) {
      newInsights.push({
        tipo: 'dica',
        titulo: 'Aumente o ticket médio',
        descricao: `Seu ticket médio é R$ ${ticketMedio.toFixed(0)}. Ofereça pacotes para aumentar o valor.`,
        acao: 'Criar pacote',
      });
    }

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
    { name: 'Aulas', value: stats.receitaAulas, fill: 'hsl(var(--chart-1))' },
    { name: 'Aluguel', value: stats.receitaAluguel, fill: 'hsl(var(--chart-2))' },
  ].filter(item => item.value > 0), [stats]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  };

  const getInsightIcon = (tipo: Insight['tipo']) => {
    switch (tipo) {
      case 'sucesso': return CheckCircle2;
      case 'alerta': return AlertTriangle;
      case 'dica': return Lightbulb;
      case 'meta': return Target;
    }
  };

  const getInsightVariant = (tipo: Insight['tipo']): "success" | "urgent" | "warning" | "info" => {
    switch (tipo) {
      case 'sucesso': return 'success';
      case 'alerta': return 'urgent';
      case 'dica': return 'warning';
      case 'meta': return 'info';
    }
  };

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {greeting}, Léo!
            </h1>
            {stats.progressoMeta >= 100 && (
              <Trophy className="h-6 w-6 text-accent animate-float" />
            )}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Aqui está o resumo financeiro da sua escola
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link to="/financeiro/dre">
            <PremiumBadge variant="success" icon={FileText} className="cursor-pointer hover:scale-105 transition-transform">
              Relatório DRE
            </PremiumBadge>
          </Link>
          <Link to="/financeiro/configuracoes">
            <PremiumBadge variant="neutral" icon={Settings2} className="cursor-pointer hover:scale-105 transition-transform">
              Configurar Taxas
            </PremiumBadge>
          </Link>
          <PremiumBadge variant="info" icon={Calendar}>
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </PremiumBadge>
        </div>
      </div>

      {/* KPIs Premium - Grid Responsivo */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Receita do Mês - Destaque */}
        <PremiumCard featured gradient="primary" className="col-span-2 lg:col-span-1">
          <PremiumCardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
            <PremiumCardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Receita Mês
            </PremiumCardTitle>
            <div className="icon-container icon-container-primary h-10 w-10 sm:h-12 sm:w-12">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </PremiumCardHeader>
          <PremiumCardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="number-display text-2xl sm:text-3xl lg:text-4xl text-foreground">
              <AnimatedNumber value={stats.receitaMes} format="currency" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {stats.crescimentoMes >= 0 ? (
                <PremiumBadge variant="success" icon={ArrowUpRight} size="sm">
                  +{stats.crescimentoMes.toFixed(0)}% vs mês anterior
                </PremiumBadge>
              ) : (
                <PremiumBadge variant="urgent" icon={ArrowDownRight} size="sm">
                  {stats.crescimentoMes.toFixed(0)}% vs mês anterior
                </PremiumBadge>
              )}
            </div>
          </PremiumCardContent>
        </PremiumCard>

        {/* Receita Hoje */}
        <PremiumCard>
          <PremiumCardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
            <PremiumCardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Hoje
            </PremiumCardTitle>
            <div className="icon-container icon-container-accent h-9 w-9 sm:h-10 sm:w-10">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </PremiumCardHeader>
          <PremiumCardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="number-display text-xl sm:text-2xl lg:text-3xl text-foreground">
              <AnimatedNumber value={stats.receitaHoje} format="currency" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.transacoesHoje} transação(ões)
            </p>
          </PremiumCardContent>
        </PremiumCard>

        {/* Ticket Médio */}
        <PremiumCard>
          <PremiumCardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
            <PremiumCardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Ticket Médio
            </PremiumCardTitle>
            <div className="icon-container icon-container-success h-9 w-9 sm:h-10 sm:w-10">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </PremiumCardHeader>
          <PremiumCardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="number-display text-xl sm:text-2xl lg:text-3xl text-foreground">
              <AnimatedNumber value={stats.ticketMedio} format="currency" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por transação
            </p>
          </PremiumCardContent>
        </PremiumCard>

        {/* A Receber */}
        <PremiumCard className={stats.aReceber > 0 ? "border-warning/30" : ""}>
          <PremiumCardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
            <PremiumCardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              A Receber
            </PremiumCardTitle>
            <div className="icon-container icon-container-warning h-9 w-9 sm:h-10 sm:w-10">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </PremiumCardHeader>
          <PremiumCardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className={`number-display text-xl sm:text-2xl lg:text-3xl ${stats.aReceber > 0 ? 'text-warning' : 'text-foreground'}`}>
              <AnimatedNumber value={stats.aReceber} format="currency" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendentes
            </p>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      {/* Meta Mensal Premium */}
      <PremiumCard featured={stats.progressoMeta >= 100}>
        <PremiumCardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`icon-container h-10 w-10 sm:h-12 sm:w-12 ${
                stats.progressoMeta >= 100 ? 'icon-container-success' : 'icon-container-primary'
              }`}>
                <Target className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <PremiumCardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  Meta Mensal
                  {stats.progressoMeta >= 100 && (
                    <Sparkles className="h-4 w-4 text-accent animate-pulse-soft" />
                  )}
                </PremiumCardTitle>
                <PremiumCardDescription className="text-sm">
                  {formatCurrency(stats.receitaMes)} de {formatCurrency(stats.metaMensal)}
                </PremiumCardDescription>
              </div>
            </div>
            <PremiumBadge 
              variant={stats.progressoMeta >= 100 ? "success" : stats.progressoMeta >= 70 ? "info" : "neutral"}
              glow={stats.progressoMeta >= 100}
              size="lg"
            >
              {stats.progressoMeta.toFixed(0)}%
            </PremiumBadge>
          </div>
        </PremiumCardHeader>
        <PremiumCardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-3">
            <div className="progress-premium h-3 sm:h-4">
              <div 
                className="progress-premium-bar" 
                style={{ width: `${stats.progressoMeta}%` }}
              />
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
              <span>R$ 0</span>
              <span className="font-medium text-foreground">
                {stats.progressoMeta < 100 
                  ? `Falta ${formatCurrency(Math.max(0, stats.metaMensal - stats.receitaMes))}`
                  : 'Meta alcançada! 🎉'
                }
              </span>
              <span>{formatCurrency(stats.metaMensal)}</span>
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Insights Premium */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold font-display flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            Insights Inteligentes
          </h2>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight, index) => {
              const Icon = getInsightIcon(insight.tipo);
              return (
                <PremiumCard 
                  key={index} 
                  className={`hover-lift stagger-${index + 1}`}
                  style={{ animationFillMode: 'both' }}
                >
                  <PremiumCardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`icon-container h-10 w-10 shrink-0 ${
                        insight.tipo === 'sucesso' ? 'icon-container-success' :
                        insight.tipo === 'alerta' ? 'bg-destructive/10 text-destructive' :
                        insight.tipo === 'dica' ? 'icon-container-warning' :
                        'icon-container-primary'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm sm:text-base">
                          {insight.titulo}
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                          {insight.descricao}
                        </p>
                        {insight.acao && (
                          <PremiumBadge 
                            variant={getInsightVariant(insight.tipo)} 
                            size="sm" 
                            className="mt-3 cursor-pointer hover:scale-105 transition-transform"
                          >
                            {insight.acao}
                          </PremiumBadge>
                        )}
                      </div>
                    </div>
                  </PremiumCardContent>
                </PremiumCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráficos Premium */}
      <Tabs defaultValue="evolucao" className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="evolucao" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Evolução
          </TabsTrigger>
          <TabsTrigger value="composicao" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Composição
          </TabsTrigger>
          <TabsTrigger value="comparativo" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Comparativo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evolucao" className="space-y-4 animate-fade-in">
          <PremiumCard>
            <PremiumCardHeader>
              <PremiumCardTitle>Receita Diária</PremiumCardTitle>
              <PremiumCardDescription>Últimos 14 dias</PremiumCardDescription>
            </PremiumCardHeader>
            <PremiumCardContent>
              <ChartContainer config={chartConfig} className="h-[220px] sm:h-[300px] w-full">
                <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="dataFormatada" 
                    className="text-[10px] sm:text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    className="text-[10px] sm:text-xs fill-muted-foreground"
                    tickFormatter={(value) => `R$${value}`}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value) => formatCurrency(Number(value))}
                    />} 
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--chart-1))"
                    fill="url(#fillTotal)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ChartContainer>
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="composicao" className="space-y-4 animate-fade-in">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <PremiumCard>
              <PremiumCardHeader>
                <PremiumCardTitle>Receita por Categoria</PremiumCardTitle>
                <PremiumCardDescription>Aulas vs Aluguéis</PremiumCardDescription>
              </PremiumCardHeader>
              <PremiumCardContent>
                <ChartContainer config={chartConfig} className="h-[200px] sm:h-[260px] w-full">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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
              </PremiumCardContent>
            </PremiumCard>

            <PremiumCard>
              <PremiumCardHeader>
                <PremiumCardTitle>Detalhamento</PremiumCardTitle>
                <PremiumCardDescription>Valores por categoria</PremiumCardDescription>
              </PremiumCardHeader>
              <PremiumCardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="font-medium">Aulas</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      <AnimatedNumber value={stats.receitaAulas} format="currency" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stats.receitaTotal > 0 
                        ? ((stats.receitaAulas / stats.receitaTotal) * 100).toFixed(0)
                        : 0}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/10">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-accent" />
                    <span className="font-medium">Aluguel</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      <AnimatedNumber value={stats.receitaAluguel} format="currency" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stats.receitaTotal > 0 
                        ? ((stats.receitaAluguel / stats.receitaTotal) * 100).toFixed(0)
                        : 0}%
                    </div>
                  </div>
                </div>
                <div className="divider-premium" />
                <div className="flex items-center justify-between pt-2">
                  <span className="font-semibold">Total Geral</span>
                  <span className="text-xl sm:text-2xl font-bold text-gradient">
                    <AnimatedNumber value={stats.receitaTotal} format="currency" />
                  </span>
                </div>
              </PremiumCardContent>
            </PremiumCard>
          </div>
        </TabsContent>

        <TabsContent value="comparativo" className="space-y-4 animate-fade-in">
          <PremiumCard>
            <PremiumCardHeader>
              <PremiumCardTitle>Receita por Tipo</PremiumCardTitle>
              <PremiumCardDescription>Últimos 14 dias</PremiumCardDescription>
            </PremiumCardHeader>
            <PremiumCardContent>
              <ChartContainer config={chartConfig} className="h-[220px] sm:h-[300px] w-full">
                <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="dataFormatada" 
                    className="text-[10px] sm:text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    className="text-[10px] sm:text-xs fill-muted-foreground"
                    tickFormatter={(value) => `R$${value}`}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value) => formatCurrency(Number(value))}
                    />} 
                  />
                  <Bar dataKey="aulas" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="aluguel" stackId="a" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>
      </Tabs>

      {/* Resumo Rápido Premium */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <PremiumCard>
          <PremiumCardHeader className="pb-2 p-4 sm:p-6">
            <PremiumCardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              <span className="hidden sm:inline">Semana Atual</span>
              <span className="sm:hidden">Semana</span>
            </PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="number-display text-base sm:text-xl lg:text-2xl">
              <AnimatedNumber value={stats.receitaSemana} format="currency" />
            </div>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardHeader className="pb-2 p-4 sm:p-6">
            <PremiumCardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Média Diária</span>
              <span className="sm:hidden">Média</span>
            </PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="number-display text-base sm:text-xl lg:text-2xl">
              <AnimatedNumber 
                value={stats.receitaMes / Math.max(1, new Date().getDate())} 
                format="currency" 
              />
            </div>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardHeader className="pb-2 p-4 sm:p-6">
            <PremiumCardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Projeção Mensal</span>
              <span className="sm:hidden">Projeção</span>
            </PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="number-display text-base sm:text-xl lg:text-2xl">
              <AnimatedNumber 
                value={(stats.receitaMes / Math.max(1, new Date().getDate())) * 30} 
                format="currency" 
              />
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      {/* Transações Recentes - From Supabase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-display flex items-center gap-2">
            <Receipt className="h-5 w-5 text-accent" />
            Transações Recentes
          </h2>
          {transacoesSummary && (
            <div className="flex gap-3">
              <PremiumBadge variant="success" size="sm">
                Margem: {transacoesSummary.margemMedia.toFixed(0)}%
              </PremiumBadge>
              <PremiumBadge variant="warning" size="sm" icon={Landmark}>
                Impostos: R${transacoesSummary.totalImpostos.toFixed(0)}
              </PremiumBadge>
            </div>
          )}
        </div>

        {isLoadingTransacoes ? (
          <PremiumCard>
            <PremiumCardContent className="p-6 text-center text-muted-foreground">
              Carregando transações...
            </PremiumCardContent>
          </PremiumCard>
        ) : transacoes.length === 0 ? (
          <PremiumCard>
            <PremiumCardContent className="p-6 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma transação registrada ainda.</p>
              <p className="text-sm mt-1">Use o assistente de voz para registrar vendas!</p>
            </PremiumCardContent>
          </PremiumCard>
        ) : (
          <div className="space-y-2">
            {transacoes.map((transacao) => {
              const isReceita = transacao.tipo === 'receita';
              return (
                <PremiumCard 
                  key={transacao.id}
                  className="hover-lift cursor-pointer"
                  onClick={() => {
                    setSelectedTransacao(transacao);
                    setIsDetalheOpen(true);
                  }}
                >
                  <PremiumCardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl ${isReceita ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {isReceita ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {transacao.descricao || transacao.origem}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(transacao.data_transacao), "dd/MM")}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {transacao.centro_de_custo}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={`font-bold ${isReceita ? 'text-success' : 'text-destructive'}`}>
                            {isReceita ? '+' : '-'}R$ {transacao.valor_bruto.toLocaleString('pt-BR')}
                          </p>
                          {isReceita && transacao.lucro_liquido > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Lucro: R$ {transacao.lucro_liquido.toFixed(0)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </PremiumCardContent>
                </PremiumCard>
              );
            })}
          </div>
        )}
      </div>

      {/* KPIs Contábeis Extras */}
      {transacoesSummary && (transacoesSummary.totalTaxasCartao > 0 || transacoesSummary.totalImpostos > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <PremiumCard>
            <PremiumCardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Taxas de Cartão</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                R$ {transacoesSummary.totalTaxasCartao.toFixed(0)}
              </p>
            </PremiumCardContent>
          </PremiumCard>
          <PremiumCard>
            <PremiumCardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Impostos Prov.</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                R$ {transacoesSummary.totalImpostos.toFixed(0)}
              </p>
            </PremiumCardContent>
          </PremiumCard>
          <PremiumCard>
            <PremiumCardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">Margem Média</span>
              </div>
              <p className="text-lg font-bold text-success">
                {transacoesSummary.margemMedia.toFixed(1)}%
              </p>
            </PremiumCardContent>
          </PremiumCard>
          <PremiumCard>
            <PremiumCardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-accent" />
                <span className="text-xs text-muted-foreground">Lucro Líquido</span>
              </div>
              <p className={`text-lg font-bold ${transacoesSummary.lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                R$ {transacoesSummary.lucroLiquido.toFixed(0)}
              </p>
            </PremiumCardContent>
          </PremiumCard>
        </div>
      )}

      {/* Transaction Detail Dialog */}
      <TransacaoDetalheDialog 
        transacao={selectedTransacao}
        open={isDetalheOpen}
        onOpenChange={setIsDetalheOpen}
      />
    </div>
  );
}
