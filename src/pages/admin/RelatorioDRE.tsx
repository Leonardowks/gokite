import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Download, Calendar, 
  Building2, CreditCard, User, BookOpen, Lightbulb, Loader2,
  CheckCircle2, AlertTriangle, BarChart3, PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/ui/premium-card";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { useTransacoes, useConfigFinanceiro } from "@/hooks/useTransacoes";
import { useAulasStatsByInstrutor, useAulasStatsByTipo, getTipoAulaLabel, getTipoAulaColor } from "@/hooks/useAulasStats";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DREMainCard } from "@/components/dre/DREMainCard";
import { DREKPIs } from "@/components/dre/DREKPIs";
import { exportDREPDF } from "@/components/dre/DREPDFExport";

const chartConfig = {
  receitas: { label: "Receitas", color: "hsl(var(--success))" },
  custos: { label: "Custos", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

const INSTRUTOR_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function RelatorioDRE() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExporting, setIsExporting] = useState(false);
  useConfigFinanceiro();

  const startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

  const { data: transacoes = [] } = useTransacoes({ startDate, endDate });
  const { data: statsByInstrutor = [] } = useAulasStatsByInstrutor(startDate, endDate);
  const { data: statsByTipo = [] } = useAulasStatsByTipo(startDate, endDate);

  const prevMonthStart = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd');
  const prevMonthEnd = format(endOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd');
  const { data: transacoesPrevMonth = [] } = useTransacoes({ startDate: prevMonthStart, endDate: prevMonthEnd });

  const dreData = useMemo(() => {
    const receitas = transacoes.filter(t => t.tipo === 'receita');
    const receitaBruta = receitas.reduce((sum, t) => sum + t.valor_bruto, 0);
    const custosProdutos = receitas.reduce((sum, t) => sum + (t.custo_produto || 0), 0);
    const taxasCartao = receitas.reduce((sum, t) => sum + (t.taxa_cartao_estimada || 0), 0);
    const impostosProvisionados = receitas.reduce((sum, t) => sum + (t.imposto_provisionado || 0), 0);
    const lucroOperacional = receitaBruta - custosProdutos - taxasCartao - impostosProvisionados;
    const margemBruta = receitaBruta > 0 ? ((receitaBruta - custosProdutos) / receitaBruta) * 100 : 0;
    const margemLiquida = receitaBruta > 0 ? (lucroOperacional / receitaBruta) * 100 : 0;

    const porCentroCusto: Record<string, { receitas: number; custos: number; lucro: number; qtd: number }> = {};
    transacoes.forEach(t => {
      const cc = t.centro_de_custo || 'Escola';
      if (!porCentroCusto[cc]) porCentroCusto[cc] = { receitas: 0, custos: 0, lucro: 0, qtd: 0 };
      if (t.tipo === 'receita') {
        porCentroCusto[cc].receitas += t.valor_bruto;
        porCentroCusto[cc].lucro += t.lucro_liquido;
      } else {
        porCentroCusto[cc].custos += t.valor_bruto;
      }
      porCentroCusto[cc].qtd += 1;
    });

    const porFormaPagamento: Record<string, number> = {};
    receitas.forEach(t => {
      const forma = t.forma_pagamento || 'dinheiro';
      porFormaPagamento[forma] = (porFormaPagamento[forma] || 0) + t.valor_bruto;
    });

    const insights: Array<{ tipo: 'sucesso' | 'alerta' | 'dica'; titulo: string; descricao: string }> = [];
    if (margemLiquida >= 30) insights.push({ tipo: 'sucesso', titulo: 'Margem saudável', descricao: `Margem de ${margemLiquida.toFixed(1)}% está excelente!` });
    else if (margemLiquida < 15 && receitaBruta > 0) insights.push({ tipo: 'alerta', titulo: 'Margem baixa', descricao: `Margem de ${margemLiquida.toFixed(1)}% está abaixo do ideal.` });

    return {
      receitaBruta, custosProdutos, taxasCartao, impostosProvisionados, lucroOperacional,
      margemBruta, margemLiquida, qtdTransacoes: transacoes.length,
      ticketMedio: receitas.length > 0 ? receitaBruta / receitas.length : 0,
      porCentroCusto, porFormaPagamento, insights
    };
  }, [transacoes]);

  const prevDreData = useMemo(() => {
    const receitas = transacoesPrevMonth.filter(t => t.tipo === 'receita');
    return { receitaBruta: receitas.reduce((sum, t) => sum + t.valor_bruto, 0) };
  }, [transacoesPrevMonth]);

  const crescimentoReceita = prevDreData.receitaBruta > 0 
    ? ((dreData.receitaBruta - prevDreData.receitaBruta) / prevDreData.receitaBruta) * 100 : 0;

  const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const getFormaPagamentoLabel = (f: string) => ({ pix: 'PIX', cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Débito', dinheiro: 'Dinheiro' }[f] || f);
  const getInsightIcon = (t: string) => t === 'sucesso' ? CheckCircle2 : t === 'alerta' ? AlertTriangle : Lightbulb;

  const centroCustoChartData = Object.entries(dreData.porCentroCusto).filter(([, d]) => d.receitas > 0).map(([n, d]) => ({ name: n, receitas: d.receitas, custos: d.custos }));
  const formaPagamentoChartData = Object.entries(dreData.porFormaPagamento).filter(([, v]) => v > 0).map(([n, v]) => ({ name: getFormaPagamentoLabel(n), value: v, fill: n === 'pix' ? 'hsl(var(--success))' : 'hsl(var(--chart-1))' }));
  const instrutorChartData = statsByInstrutor.map((s, i) => ({ name: s.instrutor, receita: s.receitaTotal, fill: INSTRUTOR_COLORS[i % INSTRUTOR_COLORS.length] }));
  const tipoAulaChartData = statsByTipo.map(s => ({ name: getTipoAulaLabel(s.tipo), value: s.receitaTotal, fill: getTipoAulaColor(s.tipo) }));

  const handleExportPDF = async () => {
    setIsExporting(true);
    await exportDREPDF(selectedDate, dreData, statsByInstrutor, statsByTipo);
    setIsExporting(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header responsivo */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link to="/financeiro">
            <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px]">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display text-foreground truncate">
              DRE - Demonstrativo
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Receitas, custos e lucro</p>
          </div>
        </div>
        
        {/* Controles em linha separada no mobile */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setSelectedDate(prev => subMonths(prev, 1))}
              className="h-10 w-10 min-h-[44px] min-w-[44px]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <PremiumBadge variant="info" icon={Calendar} size="lg" className="text-xs sm:text-sm">
              {format(selectedDate, "MMM 'de' yyyy", { locale: ptBR })}
            </PremiumBadge>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setSelectedDate(prev => addMonths(prev, 1))} 
              disabled={selectedDate >= new Date()}
              className="h-10 w-10 min-h-[44px] min-w-[44px]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            onClick={handleExportPDF} 
            disabled={isExporting} 
            className="gap-2 w-full sm:w-auto min-h-[44px]"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      <DREMainCard selectedDate={selectedDate} dreData={dreData} crescimentoReceita={crescimentoReceita} formatCurrency={formatCurrency} />
      <DREKPIs margemBruta={dreData.margemBruta} margemLiquida={dreData.margemLiquida} ticketMedio={dreData.ticketMedio} impostosProvisionados={dreData.impostosProvisionados} />

      <Tabs defaultValue="centro-custo" className="space-y-4">
        <TabsList className="w-full grid grid-cols-2 gap-1 sm:flex sm:w-auto bg-muted/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="centro-custo" className="text-xs sm:text-sm rounded-lg min-h-[40px] flex items-center justify-center gap-1 sm:gap-2">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate">Centro Custo</span>
          </TabsTrigger>
          <TabsTrigger value="pagamento" className="text-xs sm:text-sm rounded-lg min-h-[40px] flex items-center justify-center gap-1 sm:gap-2">
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate">Pagamento</span>
          </TabsTrigger>
          <TabsTrigger value="instrutor" className="text-xs sm:text-sm rounded-lg min-h-[40px] flex items-center justify-center gap-1 sm:gap-2">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate">Instrutor</span>
          </TabsTrigger>
          <TabsTrigger value="tipo-aula" className="text-xs sm:text-sm rounded-lg min-h-[40px] flex items-center justify-center gap-1 sm:gap-2">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="truncate">Tipo Aula</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="centro-custo" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <PremiumCard>
              <PremiumCardHeader><PremiumCardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Receita vs Custos</PremiumCardTitle></PremiumCardHeader>
              <PremiumCardContent>
                {centroCustoChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={centroCustoChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="receitas" fill="hsl(var(--success))" /><Bar dataKey="custos" fill="hsl(var(--destructive))" /></BarChart>
                  </ChartContainer>
                ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sem dados</div>}
              </PremiumCardContent>
            </PremiumCard>
            <div className="space-y-3">
              {Object.entries(dreData.porCentroCusto).filter(([, d]) => d.receitas > 0).map(([c, d]) => (
                <PremiumCard key={c}><PremiumCardContent className="p-4 flex justify-between"><span className="font-medium">{c}</span><span className={d.lucro >= 0 ? 'text-success' : 'text-destructive'}>{formatCurrency(d.lucro)}</span></PremiumCardContent></PremiumCard>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pagamento" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <PremiumCard>
              <PremiumCardHeader><PremiumCardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />Distribuição</PremiumCardTitle></PremiumCardHeader>
              <PremiumCardContent>
                {formaPagamentoChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <RechartsPie><Pie data={formaPagamentoChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">{formaPagamentoChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /></RechartsPie>
                  </ChartContainer>
                ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sem dados</div>}
              </PremiumCardContent>
            </PremiumCard>
            <PremiumCard>
              <PremiumCardHeader><PremiumCardTitle>Detalhamento</PremiumCardTitle></PremiumCardHeader>
              <PremiumCardContent className="space-y-3">
                {Object.entries(dreData.porFormaPagamento).filter(([, v]) => v > 0).map(([f, v]) => (
                  <div key={f} className="space-y-1"><div className="flex justify-between text-sm"><span>{getFormaPagamentoLabel(f)}</span><span>{formatCurrency(v)}</span></div><Progress value={dreData.receitaBruta > 0 ? (v / dreData.receitaBruta) * 100 : 0} className="h-2" /></div>
                ))}
              </PremiumCardContent>
            </PremiumCard>
          </div>
        </TabsContent>

        <TabsContent value="instrutor" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <PremiumCard>
              <PremiumCardHeader><PremiumCardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Receita por Instrutor</PremiumCardTitle></PremiumCardHeader>
              <PremiumCardContent>
                {instrutorChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={instrutorChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="receita">{instrutorChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart>
                  </ChartContainer>
                ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground"><User className="h-10 w-10 opacity-50 mr-2" />Sem aulas</div>}
              </PremiumCardContent>
            </PremiumCard>
            <div className="space-y-3">
              {statsByInstrutor.map((s, i) => (
                <PremiumCard key={s.instrutor}><PremiumCardContent className="p-4"><div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="p-2 rounded-xl" style={{ backgroundColor: `${INSTRUTOR_COLORS[i % INSTRUTOR_COLORS.length]}20` }}><User className="h-5 w-5" style={{ color: INSTRUTOR_COLORS[i % INSTRUTOR_COLORS.length] }} /></div><div><p className="font-medium">{s.instrutor}</p><p className="text-xs text-muted-foreground">{s.aulasConfirmadas} aulas</p></div></div><span className="font-bold text-success">{formatCurrency(s.receitaTotal)}</span></div></PremiumCardContent></PremiumCard>
              ))}
              {statsByInstrutor.length === 0 && <PremiumCard><PremiumCardContent className="p-6 text-center text-muted-foreground">Nenhuma aula registrada</PremiumCardContent></PremiumCard>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tipo-aula" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <PremiumCard>
              <PremiumCardHeader><PremiumCardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />Distribuição por Tipo</PremiumCardTitle></PremiumCardHeader>
              <PremiumCardContent>
                {tipoAulaChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <RechartsPie><Pie data={tipoAulaChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">{tipoAulaChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /></RechartsPie>
                  </ChartContainer>
                ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground"><BookOpen className="h-10 w-10 opacity-50 mr-2" />Sem aulas</div>}
              </PremiumCardContent>
            </PremiumCard>
            <div className="space-y-3">
              {statsByTipo.map(s => (
                <PremiumCard key={s.tipo}><PremiumCardContent className="p-4"><div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="p-2 rounded-xl" style={{ backgroundColor: `${getTipoAulaColor(s.tipo)}20` }}><BookOpen className="h-5 w-5" style={{ color: getTipoAulaColor(s.tipo) }} /></div><div><p className="font-medium">{getTipoAulaLabel(s.tipo)}</p><p className="text-xs text-muted-foreground">{s.aulasConfirmadas} aulas</p></div></div><span className="font-bold text-success">{formatCurrency(s.receitaTotal)}</span></div></PremiumCardContent></PremiumCard>
              ))}
              {statsByTipo.length === 0 && <PremiumCard><PremiumCardContent className="p-6 text-center text-muted-foreground">Nenhuma aula registrada</PremiumCardContent></PremiumCard>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {dreData.insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold font-display flex items-center gap-2"><Lightbulb className="h-5 w-5 text-accent" />Insights</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dreData.insights.map((insight, i) => {
              const Icon = getInsightIcon(insight.tipo);
              return (
                <PremiumCard key={i}><PremiumCardContent className="p-4 flex items-start gap-3"><div className={`p-2 rounded-xl shrink-0 ${insight.tipo === 'sucesso' ? 'bg-success/10 text-success' : insight.tipo === 'alerta' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}><Icon className="h-5 w-5" /></div><div><p className="font-medium text-sm">{insight.titulo}</p><p className="text-xs text-muted-foreground mt-1">{insight.descricao}</p></div></PremiumCardContent></PremiumCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
