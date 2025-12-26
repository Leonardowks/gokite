import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContaAPagar {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  categoria: string;
  recorrente: boolean;
  frequencia_recorrencia: string | null;
  status: string;
  fornecedor: string | null;
  centro_de_custo: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContaAPagarInsert {
  descricao: string;
  valor: number;
  data_vencimento: string;
  categoria?: string;
  recorrente?: boolean;
  frequencia_recorrencia?: string;
  fornecedor?: string;
  centro_de_custo?: string;
  notas?: string;
}

export interface ContaAPagarUpdate {
  descricao?: string;
  valor?: number;
  data_vencimento?: string;
  data_pagamento?: string;
  categoria?: string;
  status?: string;
  fornecedor?: string;
  centro_de_custo?: string;
  notas?: string;
}

export const useContasAPagar = (options?: {
  status?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: ["contas-a-pagar", options],
    queryFn: async () => {
      let query = supabase
        .from("contas_a_pagar")
        .select("*")
        .order("data_vencimento", { ascending: true });

      if (options?.status) {
        query = query.eq("status", options.status);
      }

      if (options?.startDate) {
        query = query.gte("data_vencimento", options.startDate);
      }

      if (options?.endDate) {
        query = query.lte("data_vencimento", options.endDate);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ContaAPagar[];
    },
  });
};

export const useContasAPagarSummary = () => {
  return useQuery({
    queryKey: ["contas-a-pagar-summary"],
    queryFn: async () => {
      const hoje = new Date().toISOString().split("T")[0];
      const em7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("contas_a_pagar")
        .select("*")
        .eq("status", "pendente");

      if (error) throw error;

      const contas = data as ContaAPagar[];
      const vencidas = contas.filter(c => c.data_vencimento < hoje);
      const vencendo = contas.filter(c => c.data_vencimento >= hoje && c.data_vencimento <= em7Dias);
      const futuras = contas.filter(c => c.data_vencimento > em7Dias);

      return {
        totalPendente: contas.reduce((sum, c) => sum + c.valor, 0),
        qtdPendente: contas.length,
        totalVencido: vencidas.reduce((sum, c) => sum + c.valor, 0),
        qtdVencido: vencidas.length,
        totalVencendo7Dias: vencendo.reduce((sum, c) => sum + c.valor, 0),
        qtdVencendo7Dias: vencendo.length,
        totalFuturo: futuras.reduce((sum, c) => sum + c.valor, 0),
        proximasContas: [...vencidas, ...vencendo].slice(0, 5),
      };
    },
  });
};

export const useCreateContaAPagar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conta: ContaAPagarInsert) => {
      const { data, error } = await supabase
        .from("contas_a_pagar")
        .insert(conta)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar-summary"] });
    },
  });
};

export const useUpdateContaAPagar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContaAPagarUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("contas_a_pagar")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar-summary"] });
    },
  });
};

export const useMarcarComoPago = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("contas_a_pagar")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString().split("T")[0],
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar-summary"] });
    },
  });
};

export const useDeleteContaAPagar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contas_a_pagar")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar-summary"] });
    },
  });
};
