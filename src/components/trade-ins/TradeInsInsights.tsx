import { useMemo } from "react";
import { CardContent } from "@/components/ui/card";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { 
  Clock, 
  TrendingUp, 
  Zap, 
  AlertTriangle, 
  Package,
  BarChart3,
  ArrowDown,
  Lightbulb,
  DollarSign,
  Target,
  RefreshCw
} from "lucide-react";
import { TradeIn } from "@/hooks/useTradeIns";
import { differenceInDays, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Area
} from "recharts";
import { CATEGORIAS, getCategoriaByValue } from "@/lib/tradeInConfig";
import { cn } from "@/lib/utils";

interface TradeInsInsightsProps {
  tradeIns: TradeIn[];
}

interface InsightAlerta {
  tipo: "warning" | "info" | "success" | "danger";
  titulo: string;
  mensagem: string;
  acao?: string;
  icone: typeof AlertTriangle;
}

export function TradeInsInsights({ tradeIns }: TradeInsInsightsProps) {
  // Cálculos de métricas
  const metricas = useMemo(() => {
    const emEstoque = tradeIns.filter(t => t.status === "em_estoque");
    const vendidos = tradeIns.filter(t => t.status === "vendido");
    
    // Tempo médio de venda (dias)
    const tempoVendas = vendidos
      .filter(t => t.data_saida)
      .map(t => differenceInDays(new Date(t.data_saida!), new Date(t.data_entrada)));
    const tempoMedioVenda = tempoVendas.length > 0 
      ? Math.round(tempoVendas.reduce((a, b) => a + b, 0) / tempoVendas.length)
      : 0;

    // Giro de estoque (vendas últimos 30 dias / estoque médio)
    const vendasUltimos30 = vendidos.filter(t => {
      if (!t.data_saida) return false;
      return differenceInDays(new Date(), new Date(t.data_saida)) <= 30;
    }).length;
    const estoqueAtual = emEstoque.length;
    const giroEstoque = estoqueAtual > 0 ? (vendasUltimos30 / estoqueAtual).toFixed(2) : "0";

    // Valor estagnado (>30 dias)
    const itensEstagnados30 = emEstoque.filter(t => 
      differenceInDays(new Date(), new Date(t.data_entrada)) > 30
    );
    const valorEstagnado30 = itensEstagnados30.reduce((acc, t) => acc + t.valor_entrada, 0);

    // Itens críticos (>60 dias - "bombas")
    const itensCriticos = emEstoque.filter(t => 
      differenceInDays(new Date(), new Date(t.data_entrada)) > 60
    );
    const valorCritico = itensCriticos.reduce((acc, t) => acc + t.valor_entrada, 0);

    // Score de liquidez por categoria
    const liquidezPorCategoria = CATEGORIAS.map(cat => {
      const catVendidos = vendidos.filter(t => t.categoria === cat.value);
      const catEstoque = emEstoque.filter(t => t.categoria === cat.value);
      const total = catVendidos.length + catEstoque.length;
      
      if (total === 0) return { 
        value: cat.value, 
        label: cat.label, 
        icon: cat.icon, 
        score: 0, 
        vendidos: 0, 
        estoque: 0,
        tempoMedio: null as number | null,
      };
      
      const temposVenda = catVendidos
        .filter(t => t.data_saida)
        .map(t => differenceInDays(new Date(t.data_saida!), new Date(t.data_entrada)));
      const tempoMedioCalc = temposVenda.length > 0 
        ? temposVenda.reduce((a, b) => a + b, 0) / temposVenda.length
        : 999;
      
      // Score: quanto menor o tempo, maior o score (100 = vende em 1 dia, 0 = >90 dias)
      const score = Math.max(0, Math.min(100, Math.round(100 - (tempoMedioCalc * 1.1))));
      
      return {
        value: cat.value,
        label: cat.label,
        icon: cat.icon,
        score,
        vendidos: catVendidos.length,
        estoque: catEstoque.length,
        tempoMedio: temposVenda.length > 0 ? Math.round(tempoMedioCalc) : null,
      };
    }).filter(c => c.vendidos > 0 || c.estoque > 0)
      .sort((a, b) => b.score - a.score);

    // Margem por categoria
    const margemPorCategoria = CATEGORIAS.map(cat => {
      const catVendidos = vendidos.filter(t => t.categoria === cat.value && t.lucro_trade_in);
      if (catVendidos.length === 0) return null;
      
      const lucroTotal = catVendidos.reduce((acc, t) => acc + (t.lucro_trade_in || 0), 0);
      const receitaTotal = catVendidos.reduce((acc, t) => acc + (t.valor_saida || 0), 0);
      const margemMedia = receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0;
      
      return {
        ...cat,
        lucroTotal,
        qtd: catVendidos.length,
        margemMedia: Math.round(margemMedia),
      };
    }).filter(Boolean) as { value: string; label: string; icon: string; lucroTotal: number; qtd: number; margemMedia: number; }[];

    return {
      tempoMedioVenda,
      giroEstoque: parseFloat(giroEstoque),
      vendasUltimos30,
      valorEstagnado30,
      itensEstagnados30: itensEstagnados30.length,
      valorCritico,
      itensCriticos: itensCriticos.length,
      liquidezPorCategoria,
      margemPorCategoria,
    };
  }, [tradeIns]);

  // Dados para gráfico de evolução (últimos 6 meses)
  const dadosEvolucao = useMemo(() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const data = subMonths(new Date(), i);
      const inicio = startOfMonth(data);
      const fim = endOfMonth(data);
      
      const entradas = tradeIns.filter(t => 
        isWithinInterval(new Date(t.data_entrada), { start: inicio, end: fim })
      );
      const saidas = tradeIns.filter(t => 
        t.data_saida && isWithinInterval(new Date(t.data_saida), { start: inicio, end: fim })
      );
      
      const lucroMes = saidas.reduce((acc, t) => acc + (t.lucro_trade_in || 0), 0);
      
      meses.push({
        mes: format(data, "MMM", { locale: ptBR }),
        entradas: entradas.length,
        saidas: saidas.length,
        valorEntradas: entradas.reduce((acc, t) => acc + t.valor_entrada, 0),
        valorSaidas: saidas.reduce((acc, t) => acc + (t.valor_saida || 0), 0),
        lucro: lucroMes,
      });
    }
    return meses;
  }, [tradeIns]);

  // Alertas inteligentes
  const alertas = useMemo<InsightAlerta[]>(() => {
    const lista: InsightAlerta[] = [];
    
    // Itens parados há muito tempo
    const emEstoque = tradeIns.filter(t => t.status === "em_estoque");
    const itensAntigos = emEstoque
      .map(t => ({ ...t, dias: differenceInDays(new Date(), new Date(t.data_entrada)) }))
      .filter(t => t.dias > 45)
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 3);
    
    itensAntigos.forEach(item => {
      const reducao = item.dias > 60 ? 15 : 10;
      lista.push({
        tipo: item.dias > 60 ? "danger" : "warning",
        titulo: `${item.marca || ""} ${item.modelo || item.equipamento_recebido}`.trim(),
        mensagem: `Está há ${item.dias} dias sem venda.`,
        acao: `Sugestão: reduzir ${reducao}% no preço`,
        icone: Clock,
      });
    });

    // Categoria com melhor liquidez
    if (metricas.liquidezPorCategoria.length > 0) {
      const melhor = metricas.liquidezPorCategoria[0];
      if (melhor.score > 50) {
        lista.push({
          tipo: "success",
          titulo: `${melhor.icon} ${melhor.label} vendem rápido!`,
          mensagem: `Tempo médio de ${melhor.tempoMedio || "poucos"} dias. Priorize essa categoria.`,
          icone: Zap,
        });
      }
    }

    // Categoria com pior liquidez
    if (metricas.liquidezPorCategoria.length > 1) {
      const pior = metricas.liquidezPorCategoria[metricas.liquidezPorCategoria.length - 1];
      if (pior.estoque > 0 && pior.score < 30) {
        lista.push({
          tipo: "warning",
          titulo: `${pior.icon} ${pior.label} encalhados`,
          mensagem: `${pior.estoque} em estoque com baixa liquidez. Considere promoção.`,
          icone: AlertTriangle,
        });
      }
    }

    // Giro de estoque baixo
    if (metricas.giroEstoque < 0.3 && emEstoque.length > 3) {
      lista.push({
        tipo: "info",
        titulo: "Giro de estoque baixo",
        mensagem: `Apenas ${metricas.vendasUltimos30} vendas nos últimos 30 dias.`,
        acao: "Considere ações de marketing ou ajuste de preços",
        icone: RefreshCw,
      });
    }

    // Valor alto estagnado
    if (metricas.valorEstagnado30 > 5000) {
      lista.push({
        tipo: "warning",
        titulo: `R$ ${metricas.valorEstagnado30.toLocaleString("pt-BR")} parado`,
        mensagem: `${metricas.itensEstagnados30} itens há mais de 30 dias.`,
        acao: "Crie uma campanha de queima de estoque",
        icone: DollarSign,
      });
    }

    return lista.slice(0, 5);
  }, [tradeIns, metricas]);

  return (
    <div className="space-y-5">
      {/* KPIs de Performance */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <PremiumCard hover>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tempo Médio Venda</p>
                <div className="flex items-baseline gap-1">
                  <AnimatedNumber 
                    value={metricas.tempoMedioVenda} 
                    className="text-2xl font-bold"
                  />
                  <span className="text-sm text-muted-foreground">dias</span>
                </div>
              </div>
              <div className="icon-container shrink-0">
                <Clock className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Giro Estoque</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{metricas.giroEstoque.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">x/mês</span>
                </div>
              </div>
              <div className="icon-container shrink-0">
                <RefreshCw className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vendas 30d</p>
                <AnimatedNumber 
                  value={metricas.vendasUltimos30} 
                  className="text-2xl font-bold text-success"
                />
              </div>
              <div className="icon-container bg-success/10 shrink-0">
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover className={metricas.itensEstagnados30 > 3 ? "border-warning/50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Estagnados +30d</p>
                <AnimatedNumber 
                  value={metricas.itensEstagnados30} 
                  className={cn("text-2xl font-bold", metricas.itensEstagnados30 > 3 ? "text-warning" : "")}
                />
                <p className="text-xs text-muted-foreground">
                  R$ {metricas.valorEstagnado30.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className={cn("icon-container shrink-0", metricas.itensEstagnados30 > 3 && "bg-warning/10")}>
                <Package className={cn("h-4 w-4", metricas.itensEstagnados30 > 3 ? "text-warning" : "text-muted-foreground")} />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover className={metricas.itensCriticos > 0 ? "border-destructive/50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Críticos +60d</p>
                <AnimatedNumber 
                  value={metricas.itensCriticos} 
                  className={cn("text-2xl font-bold", metricas.itensCriticos > 0 ? "text-destructive" : "")}
                />
                <p className="text-xs text-muted-foreground">
                  R$ {metricas.valorCritico.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className={cn("icon-container shrink-0", metricas.itensCriticos > 0 && "bg-destructive/10")}>
                <AlertTriangle className={cn("h-4 w-4", metricas.itensCriticos > 0 ? "text-destructive" : "text-muted-foreground")} />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Gráficos e Insights lado a lado */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Gráfico de Evolução */}
        <PremiumCard>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Evolução Mensal</h3>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosEvolucao}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="mes" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="entradas" 
                    name="Entradas" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.8}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="saidas" 
                    name="Vendas" 
                    fill="hsl(var(--success))" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.8}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="lucro" 
                    name="Lucro" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-3))" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </PremiumCard>

        {/* Alertas Inteligentes */}
        <PremiumCard>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Insights Inteligentes</h3>
            </div>
            
            {alertas.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-center">
                <div>
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum insight no momento.</p>
                  <p className="text-sm">Continue registrando trade-ins!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {alertas.map((alerta, idx) => {
                  const Icon = alerta.icone;
                  const bgColor = {
                    danger: "bg-destructive/10 border-destructive/30",
                    warning: "bg-warning/10 border-warning/30",
                    success: "bg-success/10 border-success/30",
                    info: "bg-primary/10 border-primary/30",
                  }[alerta.tipo];
                  const iconColor = {
                    danger: "text-destructive",
                    warning: "text-warning",
                    success: "text-success",
                    info: "text-primary",
                  }[alerta.tipo];

                  return (
                    <div 
                      key={idx}
                      className={cn("p-3 rounded-lg border", bgColor)}
                    >
                      <div className="flex gap-3">
                        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconColor)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{alerta.titulo}</p>
                          <p className="text-xs text-muted-foreground">{alerta.mensagem}</p>
                          {alerta.acao && (
                            <p className="text-xs font-medium text-primary mt-1">{alerta.acao}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </PremiumCard>
      </div>

      {/* Score de Liquidez e Margem por Categoria */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Liquidez por Categoria */}
        <PremiumCard>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Liquidez por Categoria</h3>
            </div>
            
            {metricas.liquidezPorCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Dados insuficientes
              </p>
            ) : (
              <div className="space-y-3">
                {metricas.liquidezPorCategoria.map((cat) => (
                  <div key={cat.value} className="flex items-center gap-3">
                    <span className="text-lg">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{cat.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {cat.tempoMedio ? `~${cat.tempoMedio}d` : "-"}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            cat.score >= 70 ? "bg-success" :
                            cat.score >= 40 ? "bg-warning" :
                            "bg-destructive"
                          )}
                          style={{ width: `${cat.score}%` }}
                        />
                      </div>
                    </div>
                    <span className={cn(
                      "text-sm font-bold w-10 text-right",
                      cat.score >= 70 ? "text-success" :
                      cat.score >= 40 ? "text-warning" :
                      "text-destructive"
                    )}>
                      {cat.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </PremiumCard>

        {/* Margem por Categoria */}
        <PremiumCard>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Margem por Categoria</h3>
            </div>
            
            {metricas.margemPorCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma venda registrada
              </p>
            ) : (
              <div className="space-y-3">
                {metricas.margemPorCategoria.map((cat) => (
                  <div key={cat.value} className="flex items-center gap-3">
                    <span className="text-lg">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{cat.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {cat.qtd} vendas
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lucro: R$ {cat.lucroTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <span className={cn(
                      "text-sm font-bold",
                      cat.margemMedia >= 30 ? "text-success" :
                      cat.margemMedia >= 15 ? "text-warning" :
                      "text-destructive"
                    )}>
                      {cat.margemMedia}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </PremiumCard>
      </div>
    </div>
  );
}
