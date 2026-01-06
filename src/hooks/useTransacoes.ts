import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Transacao {
  id: string;
  tipo: 'receita' | 'despesa';
  origem: string;
  descricao: string | null;
  valor_bruto: number;
  custo_produto: number;
  taxa_cartao_estimada: number;
  imposto_provisionado: number;
  lucro_liquido: number;
  centro_de_custo: 'Escola' | 'Loja' | 'Administrativo' | 'Pousada';
  forma_pagamento: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'trade_in';
  parcelas: number;
  equipamento_id: string | null;
  cliente_id: string | null;
  referencia_id: string | null;
  data_transacao: string;
  created_at: string;
  updated_at: string;
}

// Interface para taxas de cartão variáveis
export interface TaxasCartao {
  debito: number;
  credito_1x: number;
  credito_2x_6x: number;
  credito_7x_12x: number;
}

export interface ConfigFinanceiro {
  id: string;
  taxas_cartao: TaxasCartao;
  taxa_pix: number;
  taxa_imposto_padrao: number;
  meta_mensal: number;
}

// Helper para obter taxa de cartão baseado na forma de pagamento e parcelas
export function getTaxaCartao(
  taxas: TaxasCartao | null | undefined,
  formaPagamento: string,
  parcelas: number = 1
): number {
  if (!taxas) return 0;
  
  if (formaPagamento === 'cartao_debito') {
    return taxas.debito;
  }
  
  if (formaPagamento === 'cartao_credito') {
    if (parcelas <= 1) return taxas.credito_1x;
    if (parcelas <= 6) return taxas.credito_2x_6x;
    return taxas.credito_7x_12x;
  }
  
  return 0;
}

export interface TransacaoInsert {
  tipo: 'receita' | 'despesa';
  origem?: string;
  descricao?: string;
  valor_bruto: number;
  custo_produto?: number;
  centro_de_custo?: 'Escola' | 'Loja' | 'Administrativo' | 'Pousada';
  forma_pagamento?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'trade_in';
  parcelas?: number;
  equipamento_id?: string;
  cliente_id?: string;
  referencia_id?: string;
  data_transacao?: string;
}

// Hook to fetch config financeiro
export function useConfigFinanceiro() {
  return useQuery({
    queryKey: ["config-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_financeiro")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      
      // Parse taxas_cartao do JSONB para o tipo correto
      const rawTaxas = data.taxas_cartao as unknown;
      const taxasCartao: TaxasCartao = (rawTaxas && typeof rawTaxas === 'object') 
        ? {
            debito: (rawTaxas as any).debito ?? 1.99,
            credito_1x: (rawTaxas as any).credito_1x ?? 3.50,
            credito_2x_6x: (rawTaxas as any).credito_2x_6x ?? 4.90,
            credito_7x_12x: (rawTaxas as any).credito_7x_12x ?? 12.50,
          }
        : {
            debito: 1.99,
            credito_1x: 3.50,
            credito_2x_6x: 4.90,
            credito_7x_12x: 12.50,
          };
      
      return {
        id: data.id,
        taxas_cartao: taxasCartao,
        taxa_pix: data.taxa_pix,
        taxa_imposto_padrao: data.taxa_imposto_padrao,
        meta_mensal: data.meta_mensal,
      } as ConfigFinanceiro;
    },
  });
}

// Hook to update config financeiro
export function useUpdateConfigFinanceiro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<ConfigFinanceiro>) => {
      const { data: existing } = await supabase
        .from("config_financeiro")
        .select("id")
        .limit(1)
        .single();

      if (!existing) throw new Error("Config not found");

      // Preparar dados para update (converter para formato do banco)
      const dbUpdates: Record<string, any> = {};
      if (updates.taxas_cartao) dbUpdates.taxas_cartao = updates.taxas_cartao;
      if (updates.taxa_pix !== undefined) dbUpdates.taxa_pix = updates.taxa_pix;
      if (updates.taxa_imposto_padrao !== undefined) dbUpdates.taxa_imposto_padrao = updates.taxa_imposto_padrao;
      if (updates.meta_mensal !== undefined) dbUpdates.meta_mensal = updates.meta_mensal;

      const { data, error } = await supabase
        .from("config_financeiro")
        .update(dbUpdates)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-financeiro"] });
    },
  });
}

// Hook to list transacoes with filters
export function useTransacoes(filters?: {
  tipo?: 'receita' | 'despesa';
  centro_de_custo?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["transacoes", filters],
    queryFn: async () => {
      let query = supabase
        .from("transacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.tipo) {
        query = query.eq("tipo", filters.tipo);
      }
      if (filters?.centro_de_custo) {
        query = query.eq("centro_de_custo", filters.centro_de_custo);
      }
      if (filters?.startDate) {
        query = query.gte("data_transacao", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("data_transacao", filters.endDate);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transacao[];
    },
  });
}

// Hook to get single transacao
export function useTransacao(id: string | null) {
  return useQuery({
    queryKey: ["transacao", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("transacoes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Transacao;
    },
    enabled: !!id,
  });
}

// Hook to create transacao with automatic calculations
export function useCreateTransacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransacaoInsert) => {
      // Get config for rates
      const { data: config } = await supabase
        .from("config_financeiro")
        .select("*")
        .limit(1)
        .single();

      // Parse taxas_cartao do JSONB
      const rawTaxas = config?.taxas_cartao as unknown;
      const taxasCartao: TaxasCartao | null = (rawTaxas && typeof rawTaxas === 'object')
        ? {
            debito: (rawTaxas as any).debito ?? 1.99,
            credito_1x: (rawTaxas as any).credito_1x ?? 3.50,
            credito_2x_6x: (rawTaxas as any).credito_2x_6x ?? 4.90,
            credito_7x_12x: (rawTaxas as any).credito_7x_12x ?? 12.50,
          }
        : null;

      const taxaCartao = getTaxaCartao(taxasCartao, input.forma_pagamento || 'dinheiro', input.parcelas || 1);

      const taxaImposto = config?.taxa_imposto_padrao || 6;

      // Calculate values
      const taxa_cartao_estimada = input.tipo === 'receita' 
        ? (input.valor_bruto * taxaCartao) / 100 
        : 0;
      const imposto_provisionado = input.tipo === 'receita' 
        ? (input.valor_bruto * taxaImposto) / 100 
        : 0;
      const custo = input.custo_produto || 0;
      const lucro_liquido = input.tipo === 'receita'
        ? input.valor_bruto - custo - taxa_cartao_estimada - imposto_provisionado
        : -input.valor_bruto;

      const transacaoData = {
        ...input,
        taxa_cartao_estimada,
        imposto_provisionado,
        lucro_liquido,
        custo_produto: custo,
      };

      const { data, error } = await supabase
        .from("transacoes")
        .insert(transacaoData)
        .select()
        .single();

      if (error) throw error;
      return data as Transacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
    },
  });
}

// Hook to update transacao cost (for second-step cost entry)
export function useUpdateTransacaoCusto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, custo_produto }: { id: string; custo_produto: number }) => {
      // Get current transacao
      const { data: transacao } = await supabase
        .from("transacoes")
        .select("*")
        .eq("id", id)
        .single();

      if (!transacao) throw new Error("Transação não encontrada");

      // Recalculate lucro_liquido
      const lucro_liquido = transacao.valor_bruto - custo_produto - 
        transacao.taxa_cartao_estimada - transacao.imposto_provisionado;

      const { data, error } = await supabase
        .from("transacoes")
        .update({ custo_produto, lucro_liquido })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Transacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
    },
  });
}

// Hook to delete transacao
export function useDeleteTransacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transacoes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
    },
  });
}

// Hook to get financial summary stats
export function useTransacoesSummary(periodo?: 'hoje' | 'semana' | 'mes') {
  return useQuery({
    queryKey: ["transacoes-summary", periodo],
    queryFn: async () => {
      const hoje = new Date();
      let startDate: string;

      switch (periodo) {
        case 'semana':
          const weekStart = new Date(hoje);
          weekStart.setDate(hoje.getDate() - hoje.getDay());
          startDate = weekStart.toISOString().split("T")[0];
          break;
        case 'mes':
          startDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];
          break;
        default:
          startDate = hoje.toISOString().split("T")[0];
      }

      const { data, error } = await supabase
        .from("transacoes")
        .select("*")
        .gte("data_transacao", startDate);

      if (error) throw error;

      const transacoes = data as Transacao[];

      const receitas = transacoes.filter(t => t.tipo === 'receita');
      const despesas = transacoes.filter(t => t.tipo === 'despesa');

      // Totais base
      const totalReceitas = receitas.reduce((sum, t) => sum + t.valor_bruto, 0);
      const totalDespesas = despesas.reduce((sum, t) => sum + t.valor_bruto, 0);
      const totalCustosProdutos = receitas.reduce((sum, t) => sum + t.custo_produto, 0);
      const totalTaxasCartao = receitas.reduce((sum, t) => sum + t.taxa_cartao_estimada, 0);
      const totalImpostos = receitas.reduce((sum, t) => sum + t.imposto_provisionado, 0);
      const lucroLiquido = transacoes.reduce((sum, t) => sum + t.lucro_liquido, 0);

      // Lucro Bruto = Receita - Custo dos Produtos
      const lucroBruto = totalReceitas - totalCustosProdutos;

      // Margens percentuais
      const margemBruta = totalReceitas > 0 ? (lucroBruto / totalReceitas) * 100 : 0;
      const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

      // Breakdown por origem (tipo de transação: aula, aluguel, venda_produto, etc.)
      const origens = ['aula', 'aluguel', 'venda_produto', 'trade_in', 'pacote', 'ecommerce', 'outro'];
      const porOrigem = origens.reduce((acc, origem) => {
        const transacoesOrigem = receitas.filter(t => t.origem === origem);
        const receita = transacoesOrigem.reduce((sum, t) => sum + t.valor_bruto, 0);
        const custo = transacoesOrigem.reduce((sum, t) => sum + t.custo_produto, 0);
        const lucro = transacoesOrigem.reduce((sum, t) => sum + t.lucro_liquido, 0);
        const quantidade = transacoesOrigem.length;
        const margem = receita > 0 ? ((receita - custo) / receita) * 100 : 0;

        acc[origem] = { receita, custo, lucro, quantidade, margem };
        return acc;
      }, {} as Record<string, { receita: number; custo: number; lucro: number; quantidade: number; margem: number }>);

      return {
        totalReceitas,
        totalDespesas,
        lucroLiquido,
        lucroBruto,
        totalCustosProdutos,
        totalTaxasCartao,
        totalImpostos,
        margemBruta,
        margemLiquida,
        margemMedia: receitas.length > 0 
          ? (receitas.reduce((sum, t) => sum + (t.valor_bruto > 0 ? (t.lucro_liquido / t.valor_bruto * 100) : 0), 0) / receitas.length)
          : 0,
        porCentroCusto: {
          Escola: transacoes.filter(t => t.centro_de_custo === 'Escola').reduce((sum, t) => sum + t.lucro_liquido, 0),
          Loja: transacoes.filter(t => t.centro_de_custo === 'Loja').reduce((sum, t) => sum + t.lucro_liquido, 0),
          Administrativo: transacoes.filter(t => t.centro_de_custo === 'Administrativo').reduce((sum, t) => sum + t.lucro_liquido, 0),
          Pousada: transacoes.filter(t => t.centro_de_custo === 'Pousada').reduce((sum, t) => sum + t.lucro_liquido, 0),
        },
        porOrigem,
        qtdTransacoes: transacoes.length,
      };
    },
  });
}
