import { useEffect, useState } from "react";
import { Users, Calendar, Package, ShoppingCart } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClientes: 0,
    aulasAgendadas: 0,
    equipamentosAlugados: 0,
    vendasMes: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [clientes, aulas, aluguel, pedidos] = await Promise.all([
        supabase.from("clientes").select("*", { count: "exact", head: true }),
        supabase
          .from("aulas")
          .select("*", { count: "exact", head: true })
          .eq("status", "agendada"),
        supabase
          .from("aluguel")
          .select("*", { count: "exact", head: true })
          .eq("status", "ativo"),
        supabase
          .from("pedidos_ecommerce")
          .select("valor_total")
          .gte("data_pedido", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      const vendasTotal = pedidos.data?.reduce((sum, p) => sum + Number(p.valor_total), 0) || 0;

      setStats({
        totalClientes: clientes.count || 0,
        aulasAgendadas: aulas.count || 0,
        equipamentosAlugados: aluguel.count || 0,
        vendasMes: vendasTotal,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua operação Gokite</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total de Clientes"
          value={stats.totalClientes}
          icon={Users}
          description="Clientes cadastrados"
        />
        <DashboardCard
          title="Aulas Agendadas"
          value={stats.aulasAgendadas}
          icon={Calendar}
          description="Aulas pendentes"
        />
        <DashboardCard
          title="Equipamentos Alugados"
          value={stats.equipamentosAlugados}
          icon={Package}
          description="Atualmente em uso"
        />
        <DashboardCard
          title="Vendas do Mês"
          value={`R$ ${stats.vendasMes.toFixed(2)}`}
          icon={ShoppingCart}
          description="E-commerce"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas Aulas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie as próximas aulas na página de Aulas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipamentos a Devolver</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acompanhe devoluções pendentes na página de Aluguel
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
