import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NuvemshopIntegration {
  id: string;
  store_id: string;
  access_token: string;
  webhook_secret: string | null;
  status: string;
  store_name: string | null;
  last_sync: string | null;
  auto_create_transactions: boolean;
  auto_sync_products: boolean;
  created_at: string;
  updated_at: string;
}

export function useNuvemshopIntegration() {
  return useQuery({
    queryKey: ["nuvemshop-integration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations_nuvemshop")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as NuvemshopIntegration | null;
    },
  });
}

export function useConnectNuvemshop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      storeId, 
      accessToken 
    }: { 
      storeId: string; 
      accessToken: string;
    }) => {
      // 1. Testar conexão
      const { data: testResult, error: testError } = await supabase.functions.invoke(
        "nuvemshop-sync",
        {
          body: {
            action: "test",
            storeId,
            accessToken,
          },
        }
      );

      if (testError) throw testError;
      if (!testResult?.success) throw new Error("Falha ao conectar com a loja");

      // 2. Salvar no banco
      const { data: existing } = await supabase
        .from("integrations_nuvemshop")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Atualizar existente
        const { error } = await supabase
          .from("integrations_nuvemshop")
          .update({
            store_id: storeId,
            access_token: accessToken,
            status: "connected",
            store_name: testResult.storeName,
            last_sync: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Criar novo
        const { error } = await supabase
          .from("integrations_nuvemshop")
          .insert({
            store_id: storeId,
            access_token: accessToken,
            status: "connected",
            store_name: testResult.storeName,
            last_sync: new Date().toISOString(),
          });

        if (error) throw error;
      }

      return testResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["nuvemshop-integration"] });
      toast.success(`Conectado com sucesso! Loja: ${data.storeName}`);
    },
    onError: (error) => {
      console.error("Connection error:", error);
      toast.error("Erro ao conectar. Verifique suas credenciais.");
    },
  });
}

export function useDisconnectNuvemshop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("integrations_nuvemshop")
        .update({ status: "disconnected" })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nuvemshop-integration"] });
      toast.success("Integração desconectada");
    },
    onError: (error) => {
      console.error("Disconnect error:", error);
      toast.error("Erro ao desconectar");
    },
  });
}

export function useSyncNuvemshop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      storeId, 
      accessToken,
      syncProducts,
      createTransactions,
    }: { 
      storeId: string; 
      accessToken: string;
      syncProducts?: boolean;
      createTransactions?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke("nuvemshop-sync", {
        body: {
          action: "sync",
          storeId,
          accessToken,
          syncProducts,
          createTransactions,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["nuvemshop-integration"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      toast.success(`Sincronização concluída! ${data?.ordersImported || 0} pedidos importados.`);
    },
    onError: (error) => {
      console.error("Sync error:", error);
      toast.error("Erro na sincronização");
    },
  });
}

export function useSyncNuvemshopProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      storeId, 
      accessToken,
    }: { 
      storeId: string; 
      accessToken: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("nuvemshop-sync", {
        body: {
          action: "sync_products",
          storeId,
          accessToken,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success(`Produtos vinculados: ${data?.linkedProducts || 0} de ${data?.totalProducts || 0}`);
    },
    onError: (error) => {
      console.error("Product sync error:", error);
      toast.error("Erro ao sincronizar produtos");
    },
  });
}

export function useUpdateNuvemshopConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<NuvemshopIntegration>;
    }) => {
      const { error } = await supabase
        .from("integrations_nuvemshop")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nuvemshop-integration"] });
    },
  });
}
