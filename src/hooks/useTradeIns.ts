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
  foto_url: string | null;
  created_at: string;
  updated_at: string;
  // Novos campos estruturados
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  tamanho: string | null;
  ano: number | null;
  condicao: string | null;
  fotos: string[];
}

export interface TradeInInsert {
  equipamento_recebido: string;
  descricao?: string | null;
  valor_entrada: number;
  equipamento_id_entrada?: string | null;
  data_entrada?: string;
  transacao_origem_id?: string | null;
  notas?: string | null;
  foto_url?: string | null;
  // Novos campos estruturados
  categoria?: string | null;
  marca?: string | null;
  modelo?: string | null;
  tamanho?: string | null;
  ano?: number | null;
  condicao?: string | null;
  fotos?: string[];
}

export interface TradeInUpdate {
  equipamento_recebido?: string;
  descricao?: string | null;
  valor_entrada?: number;
  valor_saida?: number;
  data_saida?: string;
  comprador_id?: string;
  status?: string;
  notas?: string | null;
  categoria?: string | null;
  marca?: string | null;
  modelo?: string | null;
  tamanho?: string | null;
  ano?: number | null;
  condicao?: string | null;
  fotos?: string[];
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
        .select("valor_entrada, valor_saida, lucro_trade_in, status, data_entrada");

      if (error) throw error;

      const emEstoque = (data || []).filter(t => t.status === "em_estoque");
      const vendidos = (data || []).filter(t => t.status === "vendido");

      // Calcular bombas (>60 dias em estoque)
      const hoje = new Date();
      const bomba = emEstoque.filter(t => {
        const dataEntrada = new Date(t.data_entrada);
        const dias = Math.floor((hoje.getTime() - dataEntrada.getTime()) / 86400000);
        return dias > 60;
      });

      const valorEmEstoque = emEstoque.reduce((sum, t) => sum + t.valor_entrada, 0);
      const lucroTotal = vendidos.reduce((sum, t) => sum + (t.lucro_trade_in || 0), 0);
      const receitaVendas = vendidos.reduce((sum, t) => sum + (t.valor_saida || 0), 0);

      return {
        qtdEmEstoque: emEstoque.length,
        qtdVendidos: vendidos.length,
        qtdBomba: bomba.length,
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
      // Get trade-in details first
      const { data: tradeIn } = await supabase
        .from("trade_ins")
        .select("equipamento_recebido, valor_entrada")
        .eq("id", id)
        .single();

      const lucroTradeIn = valor_saida - (tradeIn?.valor_entrada || 0);

      // lucro_trade_in é GENERATED ALWAYS - calculado automaticamente pelo PostgreSQL
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

      // Criar transação automática de venda
      const { data: config } = await supabase
        .from("config_financeiro")
        .select("*")
        .limit(1)
        .single();

      const taxaImposto = config?.taxa_imposto_padrao || 6;
      const impostoProvisionado = (valor_saida * taxaImposto) / 100;
      const lucroLiquido = valor_saida - (tradeIn?.valor_entrada || 0) - impostoProvisionado;

      // Get buyer name if available
      let compradorNome = 'Cliente';
      if (comprador_id) {
        const { data: comprador } = await supabase
          .from("clientes")
          .select("nome")
          .eq("id", comprador_id)
          .single();
        compradorNome = comprador?.nome || 'Cliente';
      }

      await supabase.from("transacoes").insert({
        tipo: "receita",
        origem: "trade_in",
        descricao: `Venda Trade-In: ${tradeIn?.equipamento_recebido || 'Equipamento'} - ${compradorNome}`,
        valor_bruto: valor_saida,
        custo_produto: tradeIn?.valor_entrada || 0,
        taxa_cartao_estimada: 0,
        imposto_provisionado: impostoProvisionado,
        lucro_liquido: lucroLiquido,
        centro_de_custo: "Loja",
        forma_pagamento: "pix",
        cliente_id: comprador_id || null,
        referencia_id: id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-ins"] });
      queryClient.invalidateQueries({ queryKey: ["trade-ins-summary"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
    },
  });
};
