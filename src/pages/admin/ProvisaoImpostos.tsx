import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Receipt, 
  TrendingUp, 
  PiggyBank,
  GraduationCap,
  Package,
  Repeat,
  Building2,
  AlertTriangle,
  Download,
  Calendar
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Cell,
} from "recharts";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useTaxRules } from "@/hooks/useTaxRules";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "servico_aula":
      return <GraduationCap className="h-5 w-5" />;
    case "produto_novo":
      return <Package className="h-5 w-5" />;
    case "produto_usado":
      return <Repeat className="h-5 w-5" />;
    case "pousada":
      return <Building2 className="h-5 w-5" />;
    default:
      return <Receipt className="h-5 w-5" />;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "servico_aula":
      return "Serviços/Aulas";
    case "produto_novo":
      return "Produtos Novos";
    case "produto_usado":
      return "Produtos Usados";
    case "pousada":
      return "Pousada";
    default:
      return category;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "servico_aula":
      return "hsl(var(--chart-1))";
    case "produto_novo":
      return "hsl(var(--chart-2))";
    case "produto_usado":
      return "hsl(var(--chart-3))";
    case "pousada":
      return "hsl(var(--chart-4))";
    default:
      return "hsl(var(--chart-5))";
  }
};

const mapOrigemToCategory = (origem: string): string => {
  switch (origem) {
    case "aula":
    case "pacote":
    case "aluguel":
      return "servico_aula";
    case "venda_produto":
    case "ecommerce":
      return "produto_novo";
    case "trade_in":
      return "produto_usado";
    default:
      return "servico_aula";
  }
};

export default function ProvisaoImpostos() {
  const navigate = useNavigate();
  const [mesesExibir, setMesesExibir] = useState("6");
  
  const { data: transacoes, isLoading: loadingTransacoes } = useTransacoes();
  const { data: taxRules, isLoading: loadingRules } = useTaxRules();

  // Calcular dados por mês e categoria
  const dadosMensais = useMemo(() => {
    if (!transacoes) return [];

    const numMeses = parseInt(mesesExibir);
    const meses: { [key: string]: { [category: string]: { imposto: number; faturamento: number } } } = {};

    // Inicializar meses
    for (let i = numMeses - 1; i >= 0; i--) {
      const data = subMonths(new Date(), i);
      const mesKey = format(data, "yyyy-MM");
      meses[mesKey] = {
        servico_aula: { imposto: 0, faturamento: 0 },
        produto_novo: { imposto: 0, faturamento: 0 },
        produto_usado: { imposto: 0, faturamento: 0 },
        pousada: { imposto: 0, faturamento: 0 },
      };
    }

    // Processar transações
    transacoes
      .filter((t) => t.tipo === "receita")
      .forEach((t) => {
        const mesKey = format(parseISO(t.data_transacao), "yyyy-MM");
        if (meses[mesKey]) {
          const category = mapOrigemToCategory(t.origem);
          meses[mesKey][category].imposto += t.imposto_provisionado || 0;
          meses[mesKey][category].faturamento += t.valor_bruto || 0;
        }
      });

    return Object.entries(meses).map(([mes, categorias]) => ({
      mes,
      mesLabel: format(parseISO(`${mes}-01`), "MMM/yy", { locale: ptBR }),
      ...Object.fromEntries(
        Object.entries(categorias).map(([cat, vals]) => [
          cat,
          vals.imposto,
        ])
      ),
      total: Object.values(categorias).reduce((sum, v) => sum + v.imposto, 0),
      faturamentoTotal: Object.values(categorias).reduce((sum, v) => sum + v.faturamento, 0),
    }));
  }, [transacoes, mesesExibir]);

  // Resumo por categoria (mês atual)
  const resumoPorCategoria = useMemo(() => {
    if (!transacoes || !taxRules) return [];

    const mesAtual = format(new Date(), "yyyy-MM");
    const inicio = startOfMonth(new Date());
    const fim = endOfMonth(new Date());

    const categorias: { [key: string]: { imposto: number; faturamento: number; taxaAplicada: number } } = {
      servico_aula: { imposto: 0, faturamento: 0, taxaAplicada: 0 },
      produto_novo: { imposto: 0, faturamento: 0, taxaAplicada: 0 },
      produto_usado: { imposto: 0, faturamento: 0, taxaAplicada: 0 },
      pousada: { imposto: 0, faturamento: 0, taxaAplicada: 0 },
    };

    // Pegar taxas das regras
    taxRules.forEach((rule) => {
      if (categorias[rule.category]) {
        categorias[rule.category].taxaAplicada = rule.estimated_tax_rate;
      }
    });

    transacoes
      .filter((t) => {
        const dataT = parseISO(t.data_transacao);
        return t.tipo === "receita" && dataT >= inicio && dataT <= fim;
      })
      .forEach((t) => {
        const category = mapOrigemToCategory(t.origem);
        categorias[category].imposto += t.imposto_provisionado || 0;
        categorias[category].faturamento += t.valor_bruto || 0;
      });

    return Object.entries(categorias)
      .map(([category, valores]) => ({
        category,
        label: getCategoryLabel(category),
        icon: getCategoryIcon(category),
        color: getCategoryColor(category),
        imposto: valores.imposto,
        faturamento: valores.faturamento,
        taxaAplicada: valores.taxaAplicada,
        taxaReal: valores.faturamento > 0 ? (valores.imposto / valores.faturamento) * 100 : 0,
      }))
      .filter((c) => c.faturamento > 0 || c.imposto > 0);
  }, [transacoes, taxRules]);

  // Totais
  const totais = useMemo(() => {
    const mesAtual = dadosMensais[dadosMensais.length - 1];
    const mesAnterior = dadosMensais[dadosMensais.length - 2];
    
    const totalMesAtual = mesAtual?.total || 0;
    const totalMesAnterior = mesAnterior?.total || 0;
    const variacao = totalMesAnterior > 0 ? ((totalMesAtual - totalMesAnterior) / totalMesAnterior) * 100 : 0;
    
    const totalAcumulado = dadosMensais.reduce((sum, m) => sum + m.total, 0);
    const mediaMonthly = totalAcumulado / dadosMensais.length || 0;

    return {
      mesAtual: totalMesAtual,
      mesAnterior: totalMesAnterior,
      variacao,
      acumulado: totalAcumulado,
      media: mediaMonthly,
    };
  }, [dadosMensais]);

  const isLoading = loadingTransacoes || loadingRules;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/financeiro")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Provisão de Impostos</h1>
              <p className="text-muted-foreground text-sm">
                Quanto separar para impostos por categoria
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={mesesExibir} onValueChange={setMesesExibir}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Provisão Mês Atual</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-amber-600">
                      {formatCurrency(totais.mesAtual)}
                    </p>
                  )}
                </div>
                <PiggyBank className="h-8 w-8 text-amber-500" />
              </div>
              {!isLoading && totais.variacao !== 0 && (
                <Badge variant={totais.variacao > 0 ? "destructive" : "default"} className="mt-2">
                  {totais.variacao > 0 ? "+" : ""}{totais.variacao.toFixed(1)}% vs mês anterior
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Média Mensal</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(totais.media)}
                    </p>
                  )}
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Últimos {mesesExibir} meses
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Acumulado Período</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(totais.acumulado)}
                    </p>
                  )}
                </div>
                <Receipt className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alerta</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-lg font-semibold text-orange-600">
                      {totais.mesAtual > totais.media * 1.2 ? "Acima da Média" : "Normal"}
                    </p>
                  )}
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Comparado à média mensal
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Evolução */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Mensal por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mesLabel" className="text-xs" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="servico_aula" name="Serviços/Aulas" stackId="a" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="produto_novo" name="Produtos Novos" stackId="a" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="produto_usado" name="Produtos Usados" stackId="a" fill="hsl(var(--chart-3))" />
                  <Bar dataKey="pousada" name="Pousada" stackId="a" fill="hsl(var(--chart-4))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Breakdown por Categoria (Mês Atual) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Detalhamento Mês Atual - {format(new Date(), "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : resumoPorCategoria.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma receita registrada este mês
              </div>
            ) : (
              <div className="space-y-4">
                {resumoPorCategoria.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="p-3 rounded-full"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <div style={{ color: cat.color }}>{cat.icon}</div>
                      </div>
                      <div>
                        <p className="font-medium">{cat.label}</p>
                        <p className="text-sm text-muted-foreground">
                          Faturamento: {formatCurrency(cat.faturamento)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-amber-600">
                        {formatCurrency(cat.imposto)}
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <Badge variant="outline" className="text-xs">
                          Taxa: {cat.taxaAplicada.toFixed(1)}%
                        </Badge>
                        {Math.abs(cat.taxaReal - cat.taxaAplicada) > 0.5 && (
                          <Badge variant="secondary" className="text-xs">
                            Real: {cat.taxaReal.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex items-center justify-between p-4 rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
                      <PiggyBank className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Total a Provisionar</p>
                      <p className="text-sm text-muted-foreground">
                        Separe este valor para impostos
                      </p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(resumoPorCategoria.reduce((sum, c) => sum + c.imposto, 0))}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linha do Tempo (últimos meses) */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Provisões</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mesLabel" className="text-xs" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Provisionado"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
