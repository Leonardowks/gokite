import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ItemPedido {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  origem: 'estoque_loja' | 'fornecedor_virtual';
  equipamento_id?: string;
  supplier_sku?: string;
}

export interface PedidoNuvemshop {
  id: string;
  nuvemshop_order_id: string;
  numero_pedido: string | null;
  status: string | null;
  cliente_nome: string | null;
  cliente_email: string | null;
  cliente_telefone: string | null;
  endereco_entrega: string | null;
  itens: ItemPedido[];
  valor_total: number | null;
  prazo_envio_dias: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export function usePedidosNuvemshop(statusFilter?: string) {
  return useQuery({
    queryKey: ["pedidos-nuvemshop", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("pedidos_nuvemshop")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "todos") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching pedidos:", error);
        throw error;
      }

      return (data || []).map(p => ({
        ...p,
        itens: (p.itens as unknown as ItemPedido[]) || []
      })) as PedidoNuvemshop[];
    },
  });
}

export function useAtualizarStatusPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pedidoId, novoStatus }: { pedidoId: string; novoStatus: string }) => {
      const { data, error } = await supabase
        .from("pedidos_nuvemshop")
        .update({ 
          status: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", pedidoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos-nuvemshop"] });
      toast.success("Status do pedido atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar pedido:", error);
      toast.error("Erro ao atualizar status do pedido");
    },
  });
}

export function usePedidoStats() {
  return useQuery({
    queryKey: ["pedidos-nuvemshop-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_nuvemshop")
        .select("status, itens");

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pendentes: 0,
        enviados: 0,
        aguardandoFornecedor: 0,
        itensEstoqueLoja: 0,
        itensFornecedor: 0,
      };

      data?.forEach(pedido => {
        if (pedido.status === 'pendente') stats.pendentes++;
        if (pedido.status === 'enviado') stats.enviados++;
        if (pedido.status === 'aguardando_fornecedor') stats.aguardandoFornecedor++;

        const itens = (pedido.itens as unknown as ItemPedido[]) || [];
        itens.forEach(item => {
          if (item.origem === 'estoque_loja') {
            stats.itensEstoqueLoja += item.quantity;
          } else {
            stats.itensFornecedor += item.quantity;
          }
        });
      });

      return stats;
    },
  });
}
