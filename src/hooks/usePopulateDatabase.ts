import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  generateClientes,
  generateAulas,
  generateTransacoes,
  generateEquipamentos,
  generateTradeIns,
  generateContasAPagar,
} from "@/lib/mockData";

interface DatabaseStats {
  clientes: number;
  aulas: number;
  transacoes: number;
  equipamentos: number;
  trade_ins: number;
  contas_a_pagar: number;
}

export const usePopulateDatabase = () => {
  const [isPopulating, setIsPopulating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const queryClient = useQueryClient();

  const fetchStats = async (): Promise<DatabaseStats> => {
    const [clientes, aulas, transacoes, equipamentos, tradeIns, contas] = await Promise.all([
      supabase.from("clientes").select("id", { count: "exact", head: true }),
      supabase.from("aulas").select("id", { count: "exact", head: true }),
      supabase.from("transacoes").select("id", { count: "exact", head: true }),
      supabase.from("equipamentos").select("id", { count: "exact", head: true }),
      supabase.from("trade_ins").select("id", { count: "exact", head: true }),
      supabase.from("contas_a_pagar").select("id", { count: "exact", head: true }),
    ]);

    const newStats = {
      clientes: clientes.count || 0,
      aulas: aulas.count || 0,
      transacoes: transacoes.count || 0,
      equipamentos: equipamentos.count || 0,
      trade_ins: tradeIns.count || 0,
      contas_a_pagar: contas.count || 0,
    };

    setStats(newStats);
    return newStats;
  };

  const populateDatabase = async () => {
    setIsPopulating(true);
    try {
      console.log("🚀 Iniciando população do banco de dados...");

      // 1. Criar clientes
      const clientesData = generateClientes(20);
      const { data: clientes, error: clientesError } = await supabase
        .from("clientes")
        .insert(clientesData)
        .select("id");

      if (clientesError) throw clientesError;
      console.log(`✅ ${clientes?.length} clientes criados`);

      const clienteIds = clientes?.map((c) => c.id) || [];

      // 2. Criar aulas (vinculadas aos clientes)
      const aulasData = generateAulas(clienteIds, 40);
      const { data: aulas, error: aulasError } = await supabase
        .from("aulas")
        .insert(aulasData)
        .select("id");

      if (aulasError) throw aulasError;
      console.log(`✅ ${aulas?.length} aulas criadas`);

      // 3. Criar transações (vinculadas aos clientes)
      const transacoesData = generateTransacoes(clienteIds, 60);
      const { data: transacoes, error: transacoesError } = await supabase
        .from("transacoes")
        .insert(transacoesData)
        .select("id");

      if (transacoesError) throw transacoesError;
      console.log(`✅ ${transacoes?.length} transações criadas`);

      // 4. Criar equipamentos
      const equipamentosData = generateEquipamentos(25);
      const { data: equipamentos, error: equipamentosError } = await supabase
        .from("equipamentos")
        .insert(equipamentosData)
        .select("id");

      if (equipamentosError) throw equipamentosError;
      console.log(`✅ ${equipamentos?.length} equipamentos criados`);

      // 5. Criar trade-ins
      const tradeInsData = generateTradeIns(10);
      const { data: tradeIns, error: tradeInsError } = await supabase
        .from("trade_ins")
        .insert(tradeInsData)
        .select("id");

      if (tradeInsError) throw tradeInsError;
      console.log(`✅ ${tradeIns?.length} trade-ins criados`);

      // 6. Criar contas a pagar
      const contasData = generateContasAPagar(20);
      const { data: contas, error: contasError } = await supabase
        .from("contas_a_pagar")
        .insert(contasData)
        .select("id");

      if (contasError) throw contasError;
      console.log(`✅ ${contas?.length} contas a pagar criadas`);

      // Invalidar todas as queries
      queryClient.invalidateQueries();

      // Atualizar estatísticas
      await fetchStats();

      toast.success("Banco populado com sucesso!", {
        description: `Criados: ${clientes?.length} clientes, ${aulas?.length} aulas, ${transacoes?.length} transações, ${equipamentos?.length} equipamentos, ${tradeIns?.length} trade-ins, ${contas?.length} contas`,
      });

      console.log("🎉 População concluída com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao popular banco:", error);
      toast.error("Erro ao popular banco de dados", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsPopulating(false);
    }
  };

  const clearDatabase = async () => {
    setIsClearing(true);
    try {
      console.log("🗑️ Iniciando limpeza do banco de dados...");

      // Ordem importante: deletar dependentes primeiro
      const tables = [
        "conversas_whatsapp",
        "insights_conversas",
        "analise_queue",
        "aulas",
        "aluguel",
        "pedidos_ecommerce",
        "transacoes",
        "contas_a_pagar",
        "trade_ins",
        "movimentacoes_estoque",
        "equipamentos",
        "pacotes",
        "clientes",
        "contatos_inteligencia",
      ];

      for (const table of tables) {
        const { error } = await supabase.from(table as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) {
          console.warn(`⚠️ Aviso ao limpar ${table}:`, error.message);
        } else {
          console.log(`✅ Tabela ${table} limpa`);
        }
      }

      // Invalidar todas as queries
      queryClient.invalidateQueries();

      // Atualizar estatísticas
      await fetchStats();

      toast.success("Banco de dados limpo!", {
        description: "Todos os dados de teste foram removidos",
      });

      console.log("🧹 Limpeza concluída!");
    } catch (error) {
      console.error("❌ Erro ao limpar banco:", error);
      toast.error("Erro ao limpar banco de dados", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return {
    stats,
    isPopulating,
    isClearing,
    fetchStats,
    populateDatabase,
    clearDatabase,
  };
};
