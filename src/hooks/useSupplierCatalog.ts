import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SupplierProduct {
  id: string;
  sku: string;
  product_name: string;
  category: string | null;
  brand: string;
  size: string | null;
  color: string | null;
  cost_price: number;
  supplier_stock_qty: number;
  supplier_name: string;
  sheet_url: string | null;
  last_synced_at: string;
  created_at: string;
}

export interface SyncResult {
  success: boolean;
  stats: {
    total_parsed: number;
    new_products: number;
    restock_needed: number;
    already_imported: number;
  };
  columns_detected: string[];
  new_products: Array<{
    sku: string;
    product_name: string;
    category: string | null;
    brand: string;
    size: string | null;
    color: string | null;
    cost_price: number;
    supplier_stock_qty: number;
  }>;
  restock_products: Array<{
    product: {
      sku: string;
      product_name: string;
      size: string | null;
      cost_price: number;
      supplier_stock_qty: number;
    };
    currentStock: string;
  }>;
  already_imported: Array<{
    sku: string;
    product_name: string;
  }>;
  last_synced_at: string;
}

// Hook para listar produtos do catálogo de fornecedor
export function useSupplierProducts(filters?: {
  brand?: string;
  category?: string;
  searchTerm?: string;
}) {
  return useQuery({
    queryKey: ["supplier-products", filters],
    queryFn: async () => {
      let query = supabase
        .from("supplier_catalogs")
        .select("*")
        .order("last_synced_at", { ascending: false });

      if (filters?.brand) {
        query = query.eq("brand", filters.brand);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.searchTerm) {
        query = query.ilike("product_name", `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierProduct[];
    },
  });
}

// Hook para sincronizar com planilha do fornecedor
export function useSyncSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sheetUrl: string): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke("sync-supplier", {
        body: { sheetUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data as SyncResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });
}

// Hook para importar produtos do fornecedor para o estoque
export function useImportSupplierProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (products: Array<{
      sku: string;
      product_name: string;
      category: string | null;
      brand: string;
      size: string | null;
      cost_price: number;
    }>) => {
      const defaultMargin = 1.4; // 40% de margem

      const equipamentos = products.map((p) => ({
        nome: `${p.brand} ${p.product_name}${p.size ? ` ${p.size}` : ""}`,
        tipo: p.category || "kite",
        tamanho: p.size || null,
        status: "disponivel",
        localizacao: "Virtual",
        source_type: "virtual_supplier",
        supplier_sku: p.sku,
        cost_price: p.cost_price,
        sale_price: Math.round(p.cost_price * defaultMargin),
        preco_aluguel_dia: 0,
      }));

      const { data, error } = await supabase
        .from("equipamentos")
        .insert(equipamentos)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-stats"] });
      toast.success(`${data.length} produto(s) importado(s) com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao importar: ${error.message}`);
    },
  });
}

// Hook para estatísticas do catálogo
export function useSupplierStats() {
  return useQuery({
    queryKey: ["supplier-stats"],
    queryFn: async () => {
      // Total de produtos no catálogo do fornecedor
      const { count: totalSupplier } = await supabase
        .from("supplier_catalogs")
        .select("*", { count: "exact", head: true });

      // Produtos já importados (source_type = virtual_supplier)
      const { count: imported } = await supabase
        .from("equipamentos")
        .select("*", { count: "exact", head: true })
        .eq("source_type", "virtual_supplier");

      // Última sincronização
      const { data: lastSync } = await supabase
        .from("supplier_catalogs")
        .select("last_synced_at")
        .order("last_synced_at", { ascending: false })
        .limit(1)
        .single();

      return {
        totalSupplier: totalSupplier || 0,
        imported: imported || 0,
        pending: (totalSupplier || 0) - (imported || 0),
        lastSyncedAt: lastSync?.last_synced_at || null,
      };
    },
  });
}

// Hook para obter URL salva da planilha
export function useSupplierSheetUrl() {
  return useQuery({
    queryKey: ["supplier-sheet-url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("supplier_catalogs")
        .select("sheet_url")
        .not("sheet_url", "is", null)
        .limit(1)
        .single();

      return data?.sheet_url || "";
    },
  });
}