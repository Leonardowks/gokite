import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Calendar, Users, Package } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { localStorageService } from "@/lib/localStorage";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { SkeletonKPI } from "@/components/ui/skeleton-premium";
import { SparklineChart, generateSparklineData } from "@/components/SparklineChart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

export default function Relatorios() {
  const [receitas, setReceitas] = useState({
    aulas: 0,
    aluguel: 0,
    ecommerce: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadReceitas();
  }, []);

  const loadReceitas = () => {
    try {
      setLoading(true);
      
      const agendamentos = localStorageService.listarAgendamentos();
      const aulasConfirmadas = agendamentos.filter(a => a.status === 'confirmada');
      const receitaAulas = aulasConfirmadas.reduce((sum, a) => sum + a.valor, 0);

      // Mock data para aluguel e ecommerce
      const receitaAluguel = 2500;
      const receitaEcommerce = 1800;

      setReceitas({
        aulas: receitaAulas,
        aluguel: receitaAluguel,
        ecommerce: receitaEcommerce,
      });

      // Dados para gráfico de pizza
      setChartData([
        { name: 'Aulas', value: receitaAulas || 1000, color: 'hsl(var(--primary))' },
        { name: 'Aluguel', value: receitaAluguel, color: 'hsl(var(--accent))' },
        { name: 'E-commerce', value: receitaEcommerce, color: 'hsl(var(--success))' },
      ]);

      // Dados para gráfico de evolução (últimos 7 dias)
      const hoje = new Date();
      const evolution = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(hoje);
        date.setDate(date.getDate() - i);
        evolution.push({
          dia: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          aulas: Math.floor(Math.random() * 500) + 200,
          aluguel: Math.floor(Math.random() * 300) + 100,
          ecommerce: Math.floor(Math.random() * 200) + 50,
        });
      }
      setEvolutionData(evolution);

    } catch (error) {
      console.error("Erro ao carregar receitas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de receita.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalReceita = receitas.aulas + receitas.aluguel + receitas.ecommerce;
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))'];

  // Sparkline data
  const sparklineAulas = generateSparklineData(7, receitas.aulas / 7, 0.3);
  const sparklineAluguel = generateSparklineData(7, receitas.aluguel / 7, 0.25);
  const sparklineEcommerce = generateSparklineData(7, receitas.ecommerce / 7, 0.4);

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header Premium */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PremiumBadge variant="default" size="sm" icon={BarChart3}>
            Análise
          </PremiumBadge>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
          Relatórios
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Análise de performance e receitas
        </p>
      </div>

      {loading ? (
        <SkeletonKPI />
      ) : (
        <>
          {/* Receita Total Premium */}
          <PremiumCard featured gradient="primary">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg font-display">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <AnimatedNumber 
                value={totalReceita}
                format="currency"
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground"
              />
              <p className="text-sm text-muted-foreground mt-2">Todas as verticais</p>
              <div className="mt-4">
                <SparklineChart 
                  data={generateSparklineData(14, totalReceita / 14, 0.2)} 
                  height={40}
                  color="hsl(var(--primary))"
                />
              </div>
            </CardContent>
          </PremiumCard>

          {/* Cards de Receita por Categoria com Sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
            <PremiumCard hover>
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-display">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  Aulas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                <AnimatedNumber 
                  value={receitas.aulas}
                  format="currency"
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
                <SparklineChart data={sparklineAulas} className="mt-3" color="hsl(var(--primary))" />
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500 rounded-full" 
                      style={{ width: `${totalReceita > 0 ? (receitas.aulas / totalReceita) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {totalReceita > 0 ? ((receitas.aulas / totalReceita) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard hover>
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-display">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-accent" />
                  </div>
                  Aluguel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                <AnimatedNumber 
                  value={receitas.aluguel}
                  format="currency"
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
                <SparklineChart data={sparklineAluguel} className="mt-3" color="hsl(var(--accent))" />
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent transition-all duration-500 rounded-full" 
                      style={{ width: `${totalReceita > 0 ? (receitas.aluguel / totalReceita) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {totalReceita > 0 ? ((receitas.aluguel / totalReceita) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard hover>
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-display">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-success" />
                  </div>
                  E-commerce
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                <AnimatedNumber 
                  value={receitas.ecommerce}
                  format="currency"
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
                <SparklineChart data={sparklineEcommerce} className="mt-3" color="hsl(var(--success))" />
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success transition-all duration-500 rounded-full" 
                      style={{ width: `${totalReceita > 0 ? (receitas.ecommerce / totalReceita) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {totalReceita > 0 ? ((receitas.ecommerce / totalReceita) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </CardContent>
            </PremiumCard>
          </div>

          {/* Gráficos */}
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
            {/* Gráfico de Evolução */}
            <PremiumCard>
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-display">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  Evolução Semanal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-5">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={evolutionData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '13px',
                        boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.15)'
                      }}
                      formatter={(value: number) => [`R$ ${value}`, '']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="aulas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Aulas" />
                    <Line type="monotone" dataKey="aluguel" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Aluguel" />
                    <Line type="monotone" dataKey="ecommerce" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="E-commerce" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </PremiumCard>

            {/* Gráfico de Distribuição */}
            <PremiumCard>
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-display">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-accent" />
                  </div>
                  Distribuição de Receita
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-5">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
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
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </PremiumCard>
          </div>

          {/* Métricas de Performance */}
          <PremiumCard>
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-display">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-success" />
                </div>
                Métricas de Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Ticket Médio</p>
                  <p className="text-2xl font-bold text-foreground">R$ 285</p>
                  <SparklineChart data={generateSparklineData(7, 285, 0.1)} height={24} showTrend={false} />
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Taxa de Ocupação</p>
                  <p className="text-2xl font-bold text-foreground">78%</p>
                  <SparklineChart data={generateSparklineData(7, 78, 0.15)} height={24} showTrend={false} />
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Clientes Ativos</p>
                  <p className="text-2xl font-bold text-foreground">42</p>
                  <SparklineChart data={generateSparklineData(7, 42, 0.2)} height={24} showTrend={false} />
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">NPS Score</p>
                  <p className="text-2xl font-bold text-success">9.2</p>
                  <SparklineChart data={generateSparklineData(7, 9.2, 0.05)} height={24} showTrend={false} color="hsl(var(--success))" />
                </div>
              </div>
            </CardContent>
          </PremiumCard>

          {/* Insights Premium */}
          <PremiumCard>
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-display">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                  <p className="text-sm font-medium text-foreground mb-1">📈 Tendência Positiva</p>
                  <p className="text-xs text-muted-foreground">
                    Receita de aulas cresceu 15% em relação à semana passada. Continue promovendo os pacotes!
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
                  <p className="text-sm font-medium text-foreground mb-1">⚡ Oportunidade</p>
                  <p className="text-xs text-muted-foreground">
                    Taxa de ocupação de equipamentos está em 78%. Considere promoções para fins de semana.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-foreground mb-1">🎯 Meta do Mês</p>
                  <p className="text-xs text-muted-foreground">
                    Você atingiu 65% da meta de receita mensal. Faltam R$ 2.500 para o objetivo!
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                  <p className="text-sm font-medium text-foreground mb-1">🏆 Top Performer</p>
                  <p className="text-xs text-muted-foreground">
                    Aulas de Wing Foil são as mais rentáveis com ticket médio de R$ 350.
                  </p>
                </div>
              </div>
            </CardContent>
          </PremiumCard>
        </>
      )}
    </div>
  );
}
