import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TradeIn {
  id: string;
  equipamento_recebido: string;
  descricao: string | null;
  valor_entrada: number;
  equipamento_id_entrada: string | null;
  data_entrada: string;
  data_saida: string | null;
  valor_saida: number | null;
  comprador_id: string | null;
  lucro_trade_in: number;
  status: string;
  transacao_origem_id: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeInInsert {
  equipamento_recebido: string;
  descricao?: string | null;
  valor_entrada: number;
  equipamento_id_entrada?: string | null;
  data_entrada?: string;
  transacao_origem_id?: string | null;
  notas?: string | null;
}

export interface TradeInUpdate {
  valor_saida?: number;
  data_saida?: string;
  comprador_id?: string;
  status?: string;
  notas?: string;
}

export const useTradeIns = (options?: { status?: string; limit?: number }) => {
  return useQuery({
    queryKey: ["trade-ins", options],
    queryFn: async () => {
      let query = supabase
        .from("trade_ins")
        .select("*")
        .order("created_at", { ascending: false });

      if (options?.status) {
        query = query.eq("status", options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TradeIn[];
    },
  });
};

export const useTradeInsSummary = () => {
  return useQuery({
    queryKey: ["trade-ins-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_ins")
        .select("valor_entrada, valor_saida, lucro_trade_in, status");

      if (error) throw error;

      const emEstoque = (data || []).filter(t => t.status === "em_estoque");
      const vendidos = (data || []).filter(t => t.status === "vendido");

      const valorEmEstoque = emEstoque.reduce((sum, t) => sum + t.valor_entrada, 0);
      const lucroTotal = vendidos.reduce((sum, t) => sum + (t.lucro_trade_in || 0), 0);
      const receitaVendas = vendidos.reduce((sum, t) => sum + (t.valor_saida || 0), 0);

      return {
        qtdEmEstoque: emEstoque.length,
        qtdVendidos: vendidos.length,
        valorEmEstoque,
        lucroTotal,
        receitaVendas,
        margemMedia: receitaVendas > 0 ? (lucroTotal / receitaVendas) * 100 : 0,
      };
    },
  });
};

export const useCreateTradeIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tradeIn: TradeInInsert) => {
      const { data, error } = await supabase
        .from("trade_ins")
        .insert(tradeIn)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-ins"] });
      queryClient.invalidateQueries({ queryKey: ["trade-ins-summary"] });
    },
  });
};

export const useUpdateTradeIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TradeInUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("trade_ins")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-ins"] });
      queryClient.invalidateQueries({ queryKey: ["trade-ins-summary"] });
    },
  });
};

export const useVenderTradeIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      valor_saida,
      comprador_id,
    }: {
      id: string;
      valor_saida: number;
      comprador_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("trade_ins")
        .update({
          valor_saida,
          comprador_id: comprador_id || null,
          data_saida: new Date().toISOString().split("T")[0],
          status: "vendido",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-ins"] });
      queryClient.invalidateQueries({ queryKey: ["trade-ins-summary"] });
    },
  });
};
