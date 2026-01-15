import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncParams {
  action: "sync_single" | "sync_all";
  equipamentoId?: string;
  trigger?: "entrada" | "venda" | "ajuste" | "manual" | "supplier_update";
}

interface SyncResult {
  success: boolean;
  synced_count: number;
  api_called_count: number;
  error_count: number;
  results: Array<{
    equipamento_id: string;
    nome: string;
    qtd_site: number;
    qtd_fisica: number;
    qtd_virtual_safe: number;
    prazo_entrega: number;
    synced: boolean;
    api_called: boolean;
    error?: string;
  }>;
}

export function useSyncNuvemshopInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, equipamentoId, trigger = "manual" }: SyncParams): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke("sync-inventory-nuvemshop", {
        body: {
          action,
          equipamento_id: equipamentoId,
          trigger,
        },
      });

      if (error) throw error;
      return data as SyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      
      if (data.api_called_count > 0) {
        if (data.error_count > 0) {
          toast.warning(`Sincronizados ${data.synced_count} de ${data.api_called_count} produtos (${data.error_count} erros)`);
        } else {
          toast.success(`Estoque Nuvemshop atualizado: ${data.synced_count} produtos`);
        }
      } else {
        toast.info(`Estoque local atualizado: ${data.synced_count} produtos (Nuvemshop não conectada)`);
      }
    },
    onError: (error) => {
      console.error("Sync error:", error);
      toast.error("Erro ao sincronizar estoque");
    },
  });
}

// Hook auxiliar para sincronizar um único produto (conveniência)
export function useSyncSingleInventory() {
  const syncMutation = useSyncNuvemshopInventory();

  return {
    ...syncMutation,
    syncSingle: (equipamentoId: string, trigger: SyncParams["trigger"] = "manual") => {
      return syncMutation.mutateAsync({
        action: "sync_single",
        equipamentoId,
        trigger,
      });
    },
  };
}

// Hook auxiliar para sincronizar todos os produtos (conveniência)
export function useSyncAllInventory() {
  const syncMutation = useSyncNuvemshopInventory();

  return {
    ...syncMutation,
    syncAll: (trigger: SyncParams["trigger"] = "manual") => {
      return syncMutation.mutateAsync({
        action: "sync_all",
        trigger,
      });
    },
  };
}
