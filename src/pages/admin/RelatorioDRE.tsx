import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  CreditCard,
  Landmark,
  Package,
  Building2,
  GraduationCap,
  Home,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  User,
  BookOpen,
  Loader2
} from "lucide-react";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle, PremiumCardDescription } from "@/components/ui/premium-card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend
} from "recharts";
import { useTransacoes, useConfigFinanceiro, Transacao } from "@/hooks/useTransacoes";
import { useAulasStatsByInstrutor, useAulasStatsByTipo, getTipoAulaLabel, getTipoAulaColor } from "@/hooks/useAulasStats";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const chartConfig = {
  receitas: {
    label: "Receitas",
    color: "hsl(var(--success))",
  },
  custos: {
    label: "Custos",
    color: "hsl(var(--destructive))",
  },
  lucro: {
    label: "Lucro",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const CENTRO_CUSTO_CONFIG = {
  Escola: { icon: GraduationCap, color: "hsl(var(--chart-1))" },
  Loja: { icon: Package, color: "hsl(var(--chart-2))" },
  Administrativo: { icon: Briefcase, color: "hsl(var(--chart-3))" },
  Pousada: { icon: Home, color: "hsl(var(--chart-4))" },
};

const INSTRUTOR_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
];

interface DREData {
  receitaBruta: number;
  custosProdutos: number;
  taxasCartao: number;
  impostosProvisionados: number;
  lucroOperacional: number;
  margemBruta: number;
  margemLiquida: number;
  qtdTransacoes: number;
  ticketMedio: number;
  porCentroCusto: Record<string, {
    receitas: number;
    custos: number;
    lucro: number;
    qtd: number;
  }>;
  porFormaPagamento: Record<string, number>;
  insights: Array<{
    tipo: 'sucesso' | 'alerta' | 'dica';
    titulo: string;
    descricao: string;
  }>;
}

export default function RelatorioDRE() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { data: config } = useConfigFinanceiro();

  const startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

  const { data: transacoes = [], isLoading } = useTransacoes({
    startDate,
    endDate,
  });

  // Stats by instrutor and tipo
  const { data: statsByInstrutor = [] } = useAulasStatsByInstrutor(startDate, endDate);
  const { data: statsByTipo = [] } = useAulasStatsByTipo(startDate, endDate);

  // Previous month for comparison
  const prevMonthStart = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd');
  const prevMonthEnd = format(endOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd');
  const { data: transacoesPrevMonth = [] } = useTransacoes({
    startDate: prevMonthStart,
    endDate: prevMonthEnd,
  });

  const dreData = useMemo((): DREData => {
    const receitas = transacoes.filter(t => t.tipo === 'receita');
    const despesas = transacoes.filter(t => t.tipo === 'despesa');

    const receitaBruta = receitas.reduce((sum, t) => sum + t.valor_bruto, 0);
    const custosProdutos = receitas.reduce((sum, t) => sum + (t.custo_produto || 0), 0);
    const taxasCartao = receitas.reduce((sum, t) => sum + (t.taxa_cartao_estimada || 0), 0);
    const impostosProvisionados = receitas.reduce((sum, t) => sum + (t.imposto_provisionado || 0), 0);
    const despesasTotal = despesas.reduce((sum, t) => sum + t.valor_bruto, 0);
    
    const lucroOperacional = receitaBruta - custosProdutos - taxasCartao - impostosProvisionados - despesasTotal;
    const margemBruta = receitaBruta > 0 ? ((receitaBruta - custosProdutos) / receitaBruta) * 100 : 0;
    const margemLiquida = receitaBruta > 0 ? (lucroOperacional / receitaBruta) * 100 : 0;

    // Por centro de custo
    const porCentroCusto: DREData['porCentroCusto'] = {
      Escola: { receitas: 0, custos: 0, lucro: 0, qtd: 0 },
      Loja: { receitas: 0, custos: 0, lucro: 0, qtd: 0 },
      Administrativo: { receitas: 0, custos: 0, lucro: 0, qtd: 0 },
      Pousada: { receitas: 0, custos: 0, lucro: 0, qtd: 0 },
    };

    transacoes.forEach(t => {
      const cc = t.centro_de_custo || 'Escola';
      if (!porCentroCusto[cc]) {
        porCentroCusto[cc] = { receitas: 0, custos: 0, lucro: 0, qtd: 0 };
      }
      if (t.tipo === 'receita') {
        porCentroCusto[cc].receitas += t.valor_bruto;
        porCentroCusto[cc].lucro += t.lucro_liquido;
      } else {
        porCentroCusto[cc].custos += t.valor_bruto;
        porCentroCusto[cc].lucro -= t.valor_bruto;
      }
      porCentroCusto[cc].qtd += 1;
    });

    // Por forma de pagamento
    const porFormaPagamento: Record<string, number> = {};
    receitas.forEach(t => {
      const forma = t.forma_pagamento || 'dinheiro';
      porFormaPagamento[forma] = (porFormaPagamento[forma] || 0) + t.valor_bruto;
    });

    // Insights
    const insights: DREData['insights'] = [];
    
    if (margemLiquida >= 30) {
      insights.push({
        tipo: 'sucesso',
        titulo: 'Margem saudável',
        descricao: `Sua margem líquida de ${margemLiquida.toFixed(1)}% está excelente. Continue assim!`,
      });
    } else if (margemLiquida < 15 && receitaBruta > 0) {
      insights.push({
        tipo: 'alerta',
        titulo: 'Margem baixa',
        descricao: `Margem de ${margemLiquida.toFixed(1)}% está abaixo do ideal. Revise custos ou preços.`,
      });
    }

    if (taxasCartao > receitaBruta * 0.05) {
      insights.push({
        tipo: 'dica',
        titulo: 'Taxas de cartão altas',
        descricao: `R$${taxasCartao.toFixed(0)} em taxas. Considere incentivar PIX para economizar.`,
      });
    }

    const lojaLucro = porCentroCusto.Loja?.lucro || 0;
    const escolaLucro = porCentroCusto.Escola?.lucro || 0;
    if (lojaLucro > escolaLucro && lojaLucro > 0) {
      insights.push({
        tipo: 'sucesso',
        titulo: 'Loja em destaque',
        descricao: `A Loja gerou mais lucro que a Escola este mês. Foque em vendas de equipamentos!`,
      });
    }

    if (impostosProvisionados > 0) {
      insights.push({
        tipo: 'dica',
        titulo: 'Provisão de impostos',
        descricao: `Separe R$${impostosProvisionados.toFixed(0)} para pagamento de impostos.`,
      });
    }

    return {
      receitaBruta,
      custosProdutos,
      taxasCartao,
      impostosProvisionados,
      lucroOperacional,
      margemBruta,
      margemLiquida,
      qtdTransacoes: transacoes.length,
      ticketMedio: receitas.length > 0 ? receitaBruta / receitas.length : 0,
      porCentroCusto,
      porFormaPagamento,
      insights,
    };
  }, [transacoes]);

  // Previous month comparison
  const prevDreData = useMemo(() => {
    const receitas = transacoesPrevMonth.filter(t => t.tipo === 'receita');
    const receitaBruta = receitas.reduce((sum, t) => sum + t.valor_bruto, 0);
    const lucro = transacoesPrevMonth.reduce((sum, t) => sum + t.lucro_liquido, 0);
    return { receitaBruta, lucro };
  }, [transacoesPrevMonth]);

  const crescimentoReceita = prevDreData.receitaBruta > 0 
    ? ((dreData.receitaBruta - prevDreData.receitaBruta) / prevDreData.receitaBruta) * 100 
    : 0;

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getFormaPagamentoLabel = (forma: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      cartao_credito: 'Cartão Crédito',
      cartao_debito: 'Cartão Débito',
      dinheiro: 'Dinheiro',
      trade_in: 'Trade-in',
    };
    return labels[forma] || forma;
  };

  // Chart data
  const centroCustoChartData = Object.entries(dreData.porCentroCusto)
    .filter(([_, data]) => data.receitas > 0 || data.custos > 0)
    .map(([name, data]) => ({
      name,
      receitas: data.receitas,
      custos: data.custos + (dreData.custosProdutos * (data.receitas / Math.max(dreData.receitaBruta, 1))),
      lucro: data.lucro,
    }));

  const formaPagamentoChartData = Object.entries(dreData.porFormaPagamento)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name: getFormaPagamentoLabel(name),
      value,
      fill: name === 'pix' ? 'hsl(var(--success))' : 
            name === 'cartao_credito' ? 'hsl(var(--chart-1))' :
            name === 'cartao_debito' ? 'hsl(var(--chart-2))' :
            name === 'dinheiro' ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-4))',
    }));

  // Instrutor chart data
  const instrutorChartData = statsByInstrutor.map((stat, index) => ({
    name: stat.instrutor,
    receita: stat.receitaTotal,
    aulas: stat.aulasConfirmadas,
    fill: INSTRUTOR_COLORS[index % INSTRUTOR_COLORS.length],
  }));

  // Tipo aula chart data
  const tipoAulaChartData = statsByTipo.map((stat) => ({
    name: getTipoAulaLabel(stat.tipo),
    value: stat.receitaTotal,
    fill: getTipoAulaColor(stat.tipo),
  }));

  const getInsightIcon = (tipo: string) => {
    switch (tipo) {
      case 'sucesso': return CheckCircle2;
      case 'alerta': return AlertTriangle;
      default: return Lightbulb;
    }
  };

  // PDF Export function
  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    toast.info("Gerando PDF...");

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text("GoKite - Demonstrativo de Resultado (DRE)", margin, yPos);
      yPos += 10;

      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Período: ${format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}`, margin, yPos);
      yPos += 8;
      pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, yPos);
      yPos += 15;

      // Main DRE Section
      pdf.setFontSize(14);
      pdf.setTextColor(40, 40, 40);
      pdf.text("RESULTADO DO EXERCÍCIO", margin, yPos);
      yPos += 10;

      // Table header
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.text("Descrição", margin + 3, yPos + 5);
      pdf.text("Valor", pageWidth - margin - 30, yPos + 5);
      yPos += 10;

      // Table rows
      const dreRows = [
        { desc: "RECEITA BRUTA", value: dreData.receitaBruta, bold: true, color: [34, 197, 94] },
        { desc: "(-) Custo dos Produtos Vendidos", value: -dreData.custosProdutos, bold: false, color: [239, 68, 68] },
        { desc: "(-) Taxas de Cartão", value: -dreData.taxasCartao, bold: false, color: [239, 68, 68] },
        { desc: "(-) Impostos Provisionados", value: -dreData.impostosProvisionados, bold: false, color: [239, 68, 68] },
        { desc: "LUCRO OPERACIONAL", value: dreData.lucroOperacional, bold: true, color: dreData.lucroOperacional >= 0 ? [34, 197, 94] : [239, 68, 68] },
      ];

      dreRows.forEach((row, index) => {
        if (row.bold) {
          pdf.setFillColor(240, 253, 244);
          pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
        }
        
        pdf.setFontSize(10);
        if (row.bold) {
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        pdf.setTextColor(60, 60, 60);
        pdf.text(row.desc, margin + 3, yPos);
        
        pdf.setTextColor(row.color[0], row.color[1], row.color[2]);
        pdf.text(formatCurrency(Math.abs(row.value)), pageWidth - margin - 30, yPos);
        yPos += 8;
      });

      yPos += 10;

      // KPIs
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(40, 40, 40);
      pdf.text("INDICADORES", margin, yPos);
      yPos += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);

      const kpis = [
        { label: "Margem Bruta", value: `${dreData.margemBruta.toFixed(1)}%` },
        { label: "Margem Líquida", value: `${dreData.margemLiquida.toFixed(1)}%` },
        { label: "Ticket Médio", value: formatCurrency(dreData.ticketMedio) },
        { label: "Qtd. Transações", value: `${dreData.qtdTransacoes}` },
      ];

      kpis.forEach((kpi, index) => {
        const xPos = margin + (index % 2) * 80;
        if (index > 0 && index % 2 === 0) yPos += 7;
        pdf.text(`${kpi.label}: ${kpi.value}`, xPos, yPos);
      });
      yPos += 15;

      // Por Centro de Custo
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text("POR CENTRO DE CUSTO", margin, yPos);
      yPos += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      Object.entries(dreData.porCentroCusto)
        .filter(([_, data]) => data.receitas > 0 || data.custos > 0)
        .forEach(([centro, data]) => {
          pdf.text(`${centro}: Receita ${formatCurrency(data.receitas)} | Lucro ${formatCurrency(data.lucro)}`, margin, yPos);
          yPos += 6;
        });

      yPos += 10;

      // Por Forma de Pagamento
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text("POR FORMA DE PAGAMENTO", margin, yPos);
      yPos += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      Object.entries(dreData.porFormaPagamento)
        .filter(([_, value]) => value > 0)
        .forEach(([forma, valor]) => {
          pdf.text(`${getFormaPagamentoLabel(forma)}: ${formatCurrency(valor)}`, margin, yPos);
          yPos += 6;
        });

      yPos += 10;

      // Por Instrutor (if data exists)
      if (statsByInstrutor.length > 0) {
        if (yPos > pageHeight - 50) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text("RECEITA POR INSTRUTOR", margin, yPos);
        yPos += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        
        statsByInstrutor.forEach((stat) => {
          pdf.text(`${stat.instrutor}: ${stat.aulasConfirmadas} aulas | ${formatCurrency(stat.receitaTotal)}`, margin, yPos);
          yPos += 6;
        });

        yPos += 10;
      }

      // Por Tipo de Aula (if data exists)
      if (statsByTipo.length > 0) {
        if (yPos > pageHeight - 50) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text("RECEITA POR TIPO DE AULA", margin, yPos);
        yPos += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        
        statsByTipo.forEach((stat) => {
          pdf.text(`${getTipoAulaLabel(stat.tipo)}: ${stat.aulasConfirmadas} aulas | ${formatCurrency(stat.receitaTotal)}`, margin, yPos);
          yPos += 6;
        });
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text("Relatório gerado automaticamente pelo sistema GoKite", margin, pageHeight - 10);

      // Save
      const fileName = `DRE_GoKite_${format(selectedDate, 'yyyy-MM')}.pdf`;
      pdf.save(fileName);
      toast.success(`PDF exportado: ${fileName}`);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/financeiro">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              DRE - Demonstrativo de Resultado
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground ml-10">
            Análise completa de receitas, custos e lucro
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportToPDF}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(prev => subMonths(prev, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <PremiumBadge variant="info" icon={Calendar} size="lg">
            {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </PremiumBadge>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(prev => addMonths(prev, 1))}
            disabled={selectedDate >= new Date()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main DRE Card */}
      <PremiumCard featured gradient="primary">
        <PremiumCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-primary h-12 w-12">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <PremiumCardTitle className="text-xl">Resultado do Exercício</PremiumCardTitle>
                <PremiumCardDescription>
                  {format(selectedDate, "MMMM yyyy", { locale: ptBR })} • {dreData.qtdTransacoes} transações
                </PremiumCardDescription>
              </div>
            </div>
            {crescimentoReceita !== 0 && (
              <PremiumBadge 
                variant={crescimentoReceita >= 0 ? "success" : "urgent"} 
                icon={crescimentoReceita >= 0 ? ArrowUpRight : ArrowDownRight}
              >
                {crescimentoReceita >= 0 ? '+' : ''}{crescimentoReceita.toFixed(1)}% vs mês anterior
              </PremiumBadge>
            )}
          </div>
        </PremiumCardHeader>
        <PremiumCardContent>
          <div className="space-y-4">
            {/* Receita Bruta */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-success" />
                <span className="font-medium">RECEITA BRUTA</span>
              </div>
              <span className="text-2xl font-bold text-success">
                <AnimatedNumber value={dreData.receitaBruta} format="currency" />
              </span>
            </div>

            {/* Deduções */}
            <div className="space-y-2 pl-4 border-l-2 border-border">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">(-) Custo dos Produtos Vendidos</span>
                </div>
                <span className="text-destructive font-medium">
                  -{formatCurrency(dreData.custosProdutos)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">(-) Taxas de Cartão</span>
                </div>
                <span className="text-destructive font-medium">
                  -{formatCurrency(dreData.taxasCartao)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Landmark className="h-4 w-4" />
                  <span className="text-sm">(-) Impostos Provisionados</span>
                </div>
                <span className="text-destructive font-medium">
                  -{formatCurrency(dreData.impostosProvisionados)}
                </span>
              </div>
            </div>

            <Separator />

            {/* Lucro Operacional */}
            <div className={`flex items-center justify-between p-4 rounded-xl ${
              dreData.lucroOperacional >= 0 
                ? 'bg-success/10 border border-success/20' 
                : 'bg-destructive/10 border border-destructive/20'
            }`}>
              <div className="flex items-center gap-3">
                {dreData.lucroOperacional >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
                <span className="font-bold">LUCRO OPERACIONAL</span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${
                  dreData.lucroOperacional >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  <AnimatedNumber value={dreData.lucroOperacional} format="currency" />
                </span>
                <p className="text-xs text-muted-foreground">
                  {dreData.margemLiquida.toFixed(1)}% margem líquida
                </p>
              </div>
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumCard>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Margem Bruta</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {dreData.margemBruta.toFixed(1)}%
            </p>
            <Progress value={Math.min(dreData.margemBruta, 100)} className="h-1.5 mt-2" />
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Margem Líquida</span>
            </div>
            <p className={`text-2xl font-bold ${dreData.margemLiquida >= 0 ? 'text-success' : 'text-destructive'}`}>
              {dreData.margemLiquida.toFixed(1)}%
            </p>
            <Progress value={Math.max(0, Math.min(dreData.margemLiquida, 100))} className="h-1.5 mt-2" />
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-chart-1" />
              <span className="text-xs text-muted-foreground">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={dreData.ticketMedio} format="currency" />
            </p>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Provisão Impostos</span>
            </div>
            <p className="text-2xl font-bold text-warning">
              <AnimatedNumber value={dreData.impostosProvisionados} format="currency" />
            </p>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="centro-custo" className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:grid-cols-4 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="centro-custo" className="text-xs sm:text-sm rounded-lg">
            <Building2 className="h-4 w-4 mr-2" />
            Centro de Custo
          </TabsTrigger>
          <TabsTrigger value="pagamento" className="text-xs sm:text-sm rounded-lg">
            <CreditCard className="h-4 w-4 mr-2" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="instrutor" className="text-xs sm:text-sm rounded-lg">
            <User className="h-4 w-4 mr-2" />
            Instrutor
          </TabsTrigger>
          <TabsTrigger value="tipo-aula" className="text-xs sm:text-sm rounded-lg">
            <BookOpen className="h-4 w-4 mr-2" />
            Tipo Aula
          </TabsTrigger>
        </TabsList>

        <TabsContent value="centro-custo" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Chart */}
            <PremiumCard>
              <PremiumCardHeader>
                <PremiumCardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Receita vs Custos por Centro
                </PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent>
                {centroCustoChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={centroCustoChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                      <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `R$${v}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="custos" name="Custos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </PremiumCardContent>
            </PremiumCard>

            {/* Cards */}
            <div className="space-y-3">
              {Object.entries(dreData.porCentroCusto)
                .filter(([_, data]) => data.receitas > 0 || data.custos > 0 || data.qtd > 0)
                .map(([centro, data]) => {
                  const config = CENTRO_CUSTO_CONFIG[centro as keyof typeof CENTRO_CUSTO_CONFIG];
                  const Icon = config?.icon || Building2;
                  const margem = data.receitas > 0 ? (data.lucro / data.receitas) * 100 : 0;
                  
                  return (
                    <PremiumCard key={centro} className="hover-lift">
                      <PremiumCardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="p-2 rounded-xl"
                              style={{ backgroundColor: `${config?.color}20` }}
                            >
                              <Icon className="h-5 w-5" style={{ color: config?.color }} />
                            </div>
                            <div>
                              <p className="font-medium">{centro}</p>
                              <p className="text-xs text-muted-foreground">{data.qtd} transações</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${data.lucro >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(data.lucro)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {margem.toFixed(1)}% margem
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-success/10 text-center">
                            <p className="text-muted-foreground">Receitas</p>
                            <p className="font-medium text-success">{formatCurrency(data.receitas)}</p>
                          </div>
                          <div className="p-2 rounded bg-destructive/10 text-center">
                            <p className="text-muted-foreground">Custos</p>
                            <p className="font-medium text-destructive">{formatCurrency(data.custos)}</p>
                          </div>
                        </div>
                      </PremiumCardContent>
                    </PremiumCard>
                  );
                })}
              {Object.values(dreData.porCentroCusto).every(d => d.receitas === 0 && d.custos === 0) && (
                <PremiumCard>
                  <PremiumCardContent className="p-6 text-center text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma transação registrada neste período.</p>
                  </PremiumCardContent>
                </PremiumCard>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pagamento" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pie Chart */}
            <PremiumCard>
              <PremiumCardHeader>
                <PremiumCardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição por Forma de Pagamento
                </PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent>
                {formaPagamentoChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <RechartsPie>
                      <Pie
                        data={formaPagamentoChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {formaPagamentoChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPie>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </PremiumCardContent>
            </PremiumCard>

            {/* Payment breakdown */}
            <PremiumCard>
              <PremiumCardHeader>
                <PremiumCardTitle>Detalhamento</PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent className="space-y-3">
                {Object.entries(dreData.porFormaPagamento)
                  .filter(([_, value]) => value > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([forma, valor]) => {
                    const percent = dreData.receitaBruta > 0 ? (valor / dreData.receitaBruta) * 100 : 0;
                    return (
                      <div key={forma} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{getFormaPagamentoLabel(forma)}</span>
                          <span className="text-sm">{formatCurrency(valor)}</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                        <p className="text-xs text-muted-foreground text-right">{percent.toFixed(1)}%</p>
                      </div>
                    );
                  })}
                {Object.keys(dreData.porFormaPagamento).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Sem dados de pagamento
                  </p>
                )}
              </PremiumCardContent>
            </PremiumCard>
          </div>
        </TabsContent>

        {/* Por Instrutor Tab */}
        <TabsContent value="instrutor" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Chart */}
            <PremiumCard>
              <PremiumCardHeader>
                <PremiumCardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Receita por Instrutor
                </PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent>
                {instrutorChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={instrutorChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                      <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `R$${v}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="receita" name="Receita" radius={[4, 4, 0, 0]}>
                        {instrutorChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Sem aulas confirmadas neste período</p>
                    </div>
                  </div>
                )}
              </PremiumCardContent>
            </PremiumCard>

            {/* Cards */}
            <div className="space-y-3">
              {statsByInstrutor.length > 0 ? (
                statsByInstrutor.map((stat, index) => {
                  const totalReceitaInstrutores = statsByInstrutor.reduce((sum, s) => sum + s.receitaTotal, 0);
                  const percentual = totalReceitaInstrutores > 0 ? (stat.receitaTotal / totalReceitaInstrutores) * 100 : 0;
                  
                  return (
                    <PremiumCard key={stat.instrutor} className="hover-lift">
                      <PremiumCardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="p-2 rounded-xl"
                              style={{ backgroundColor: `${INSTRUTOR_COLORS[index % INSTRUTOR_COLORS.length]}20` }}
                            >
                              <User className="h-5 w-5" style={{ color: INSTRUTOR_COLORS[index % INSTRUTOR_COLORS.length] }} />
                            </div>
                            <div>
                              <p className="font-medium">{stat.instrutor}</p>
                              <p className="text-xs text-muted-foreground">{stat.aulasConfirmadas} aulas confirmadas</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-success">
                              {formatCurrency(stat.receitaTotal)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {percentual.toFixed(1)}% do total
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-muted text-center">
                            <p className="text-muted-foreground">Ticket Médio</p>
                            <p className="font-medium">{formatCurrency(stat.ticketMedio)}</p>
                          </div>
                          <div className="p-2 rounded bg-muted text-center">
                            <p className="text-muted-foreground">Total Aulas</p>
                            <p className="font-medium">{stat.totalAulas}</p>
                          </div>
                        </div>
                      </PremiumCardContent>
                    </PremiumCard>
                  );
                })
              ) : (
                <PremiumCard>
                  <PremiumCardContent className="p-6 text-center text-muted-foreground">
                    <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma aula registrada neste período.</p>
                  </PremiumCardContent>
                </PremiumCard>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Por Tipo de Aula Tab */}
        <TabsContent value="tipo-aula" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pie Chart */}
            <PremiumCard>
              <PremiumCardHeader>
                <PremiumCardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição por Tipo de Aula
                </PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent>
                {tipoAulaChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <RechartsPie>
                      <Pie
                        data={tipoAulaChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {tipoAulaChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPie>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Sem aulas confirmadas neste período</p>
                    </div>
                  </div>
                )}
              </PremiumCardContent>
            </PremiumCard>

            {/* Cards */}
            <div className="space-y-3">
              {statsByTipo.length > 0 ? (
                statsByTipo.map((stat) => {
                  const totalReceitaTipos = statsByTipo.reduce((sum, s) => sum + s.receitaTotal, 0);
                  const percentual = totalReceitaTipos > 0 ? (stat.receitaTotal / totalReceitaTipos) * 100 : 0;
                  
                  return (
                    <PremiumCard key={stat.tipo} className="hover-lift">
                      <PremiumCardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="p-2 rounded-xl"
                              style={{ backgroundColor: `${getTipoAulaColor(stat.tipo)}20` }}
                            >
                              <BookOpen className="h-5 w-5" style={{ color: getTipoAulaColor(stat.tipo) }} />
                            </div>
                            <div>
                              <p className="font-medium">{getTipoAulaLabel(stat.tipo)}</p>
                              <p className="text-xs text-muted-foreground">{stat.aulasConfirmadas} aulas confirmadas</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-success">
                              {formatCurrency(stat.receitaTotal)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {percentual.toFixed(1)}% do total
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-muted text-center">
                            <p className="text-muted-foreground">Ticket Médio</p>
                            <p className="font-medium">{formatCurrency(stat.ticketMedio)}</p>
                          </div>
                          <div className="p-2 rounded bg-muted text-center">
                            <p className="text-muted-foreground">Total Aulas</p>
                            <p className="font-medium">{stat.totalAulas}</p>
                          </div>
                        </div>
                      </PremiumCardContent>
                    </PremiumCard>
                  );
                })
              ) : (
                <PremiumCard>
                  <PremiumCardContent className="p-6 text-center text-muted-foreground">
                    <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma aula registrada neste período.</p>
                  </PremiumCardContent>
                </PremiumCard>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Insights */}
      {dreData.insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold font-display flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            Insights para Decisão
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dreData.insights.map((insight, index) => {
              const Icon = getInsightIcon(insight.tipo);
              return (
                <PremiumCard key={index} className="hover-lift">
                  <PremiumCardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        insight.tipo === 'sucesso' ? 'bg-success/10 text-success' :
                        insight.tipo === 'alerta' ? 'bg-destructive/10 text-destructive' :
                        'bg-warning/10 text-warning'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{insight.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">{insight.descricao}</p>
                      </div>
                    </div>
                  </PremiumCardContent>
                </PremiumCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
