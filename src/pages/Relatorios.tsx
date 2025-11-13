import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const loadReceitas = async () => {
    try {
      setLoading(true);
      
      const [aulasData, aluguelData, pedidosData] = await Promise.all([
        supabase.from("aulas").select("preco").eq("status", "concluida"),
        supabase.from("aluguel").select("valor").eq("status", "concluido"),
        supabase.from("pedidos_ecommerce").select("valor_total").eq("status", "entregue"),
      ]);

      const receitaAulas = aulasData.data?.reduce((sum, a) => sum + Number(a.preco), 0) || 0;
      const receitaAluguel = aluguelData.data?.reduce((sum, a) => sum + Number(a.valor), 0) || 0;
      const receitaEcommerce = pedidosData.data?.reduce((sum, p) => sum + Number(p.valor_total), 0) || 0;

      setReceitas({
        aulas: receitaAulas,
        aluguel: receitaAluguel,
        ecommerce: receitaEcommerce,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Relatórios</h1>
        <p className="text-muted-foreground">Análise de performance e receitas</p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : (
        <>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <DollarSign className="h-6 w-6" />
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">
                R$ {totalReceita.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Todas as verticais</p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Aulas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  R$ {receitas.aulas.toFixed(2)}
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  {totalReceita > 0 ? ((receitas.aulas / totalReceita) * 100).toFixed(1) : 0}% do total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Aluguel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  R$ {receitas.aluguel.toFixed(2)}
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  {totalReceita > 0 ? ((receitas.aluguel / totalReceita) * 100).toFixed(1) : 0}% do total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  E-commerce
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  R$ {receitas.ecommerce.toFixed(2)}
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  {totalReceita > 0 ? ((receitas.ecommerce / totalReceita) * 100).toFixed(1) : 0}% do total
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
