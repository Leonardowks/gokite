import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AlertaCompra {
  id: string;
  equipamento_id: string | null;
  pedido_nuvemshop_id: string | null;
  quantidade_necessaria: number;
  supplier_sku: string | null;
  status: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  equipamento?: {
    id: string;
    nome: string;
    supplier_sku: string | null;
  } | null;
  pedido?: {
    id: string;
    numero_pedido: string | null;
    cliente_nome: string | null;
  } | null;
}

export function useAlertasCompra(status?: string) {
  return useQuery({
    queryKey: ["alertas-compra", status],
    queryFn: async () => {
      let query = supabase
        .from("alertas_compra")
        .select(`
          *,
          equipamento:equipamentos(id, nome, supplier_sku),
          pedido:pedidos_nuvemshop(id, numero_pedido, cliente_nome)
        `)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as AlertaCompra[];
    },
  });
}

export function useAlertasCompraStats() {
  return useQuery({
    queryKey: ["alertas-compra-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_compra")
        .select("status");

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pendente: 0,
        pedido: 0,
        recebido: 0,
        cancelado: 0,
      };

      data?.forEach((alerta) => {
        const status = alerta.status as keyof typeof stats;
        if (status in stats) {
          stats[status]++;
        }
      });

      return stats;
    },
  });
}

export function useAtualizarStatusAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      alertaId, 
      novoStatus 
    }: { 
      alertaId: string; 
      novoStatus: string;
    }) => {
      const { error } = await supabase
        .from("alertas_compra")
        .update({ 
          status: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alertaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas-compra"] });
      queryClient.invalidateQueries({ queryKey: ["alertas-compra-stats"] });
      toast.success("Status do alerta atualizado");
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Erro ao atualizar status");
    },
  });
}
