import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Calendar } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { localStorageService } from "@/lib/localStorage";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { SkeletonKPI } from "@/components/ui/skeleton-premium";

export default function Relatorios() {
  const [receitas, setReceitas] = useState({
    aulas: 0,
    aluguel: 0,
    ecommerce: 0,
  });
  const [loading, setLoading] = useState(true);
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

      setReceitas({
        aulas: receitaAulas,
        aluguel: 0,
        ecommerce: 0,
      });
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
            </CardContent>
          </PremiumCard>

          {/* Cards de Receita por Categoria */}
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
                    <BarChart3 className="h-4 w-4 text-accent" />
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
                <PremiumBadge variant="neutral" size="sm" className="mt-2">
                  Em breve
                </PremiumBadge>
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
                <PremiumBadge variant="neutral" size="sm" className="mt-2">
                  Em breve
                </PremiumBadge>
              </CardContent>
            </PremiumCard>
          </div>

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
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-sm font-medium text-foreground mb-1">Receita de Aulas</p>
                  <p className="text-xs text-muted-foreground">
                    {receitas.aulas > 0 
                      ? `Você já gerou R$ ${receitas.aulas.toLocaleString('pt-BR')} com aulas confirmadas.`
                      : 'Nenhuma aula confirmada ainda. Comece a agendar!'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-sm font-medium text-foreground mb-1">Oportunidades</p>
                  <p className="text-xs text-muted-foreground">
                    Aluguel e E-commerce em breve disponíveis para diversificar sua receita.
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
