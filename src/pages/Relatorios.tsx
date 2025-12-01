import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { localStorageService } from "@/lib/localStorage";

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
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-1 sm:mb-2">Relatórios</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Análise de performance e receitas</p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">Carregando...</p>
      ) : (
        <>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Todas as verticais</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Aulas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                  R$ {receitas.aulas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  {totalReceita > 0 ? ((receitas.aulas / totalReceita) * 100).toFixed(1) : 0}% do total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Aluguel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                  R$ {receitas.aluguel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  {totalReceita > 0 ? ((receitas.aluguel / totalReceita) * 100).toFixed(1) : 0}% do total
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">Em breve</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  E-commerce
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                  R$ {receitas.ecommerce.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  {totalReceita > 0 ? ((receitas.ecommerce / totalReceita) * 100).toFixed(1) : 0}% do total
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">Em breve</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
