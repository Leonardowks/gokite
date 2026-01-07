import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SupplierProduct {
  id: string;
  sku: string;
  product_name: string;
  category: string | null;
  brand: string | null;
  size: string | null;
  cost_price: number;
  ean: string | null;
  supplier_stock_qty: number | null;
}

interface Equipamento {
  id: string;
  nome: string;
  tipo: string;
  tamanho: string | null;
  ean: string | null;
  cost_price: number | null;
  sale_price: number | null;
  quantidade_fisica: number;
  quantidade_virtual_safe: number;
  source_type: string | null;
}

interface SearchResult {
  found: boolean;
  source: "supplier" | "equipamento" | null;
  supplierProduct?: SupplierProduct;
  equipamento?: Equipamento;
}

export function useSearchByEan(ean: string | null) {
  return useQuery({
    queryKey: ["search-by-ean", ean],
    queryFn: async (): Promise<SearchResult> => {
      if (!ean) return { found: false, source: null };

      // First, search in supplier_catalogs
      const { data: supplierData, error: supplierError } = await supabase
        .from("supplier_catalogs")
        .select("*")
        .or(`ean.eq.${ean},sku.eq.${ean}`)
        .limit(1)
        .maybeSingle();

      if (supplierError) {
        console.error("Error searching supplier:", supplierError);
      }

      if (supplierData) {
        return {
          found: true,
          source: "supplier",
          supplierProduct: supplierData as SupplierProduct,
        };
      }

      // If not found in supplier, search in equipamentos
      const { data: equipamentoData, error: equipamentoError } = await supabase
        .from("equipamentos")
        .select("*")
        .or(`ean.eq.${ean},supplier_sku.eq.${ean}`)
        .limit(1)
        .maybeSingle();

      if (equipamentoError) {
        console.error("Error searching equipamento:", equipamentoError);
      }

      if (equipamentoData) {
        return {
          found: true,
          source: "equipamento",
          equipamento: equipamentoData as unknown as Equipamento,
        };
      }

      return { found: false, source: null };
    },
    enabled: !!ean && ean.length >= 3,
    staleTime: 0,
  });
}

interface EntradaData {
  source: "supplier" | "equipamento";
  supplierId?: string;
  equipamentoId?: string;
  quantidade: number;
  notas?: string;
  // For supplier imports
  supplierProduct?: SupplierProduct;
  precoVenda?: number;
}

export function useConfirmarEntrada() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EntradaData) => {
      if (data.source === "supplier" && data.supplierProduct) {
        // Create new equipamento from supplier product
        const { data: novoEquipamento, error: createError } = await supabase
          .from("equipamentos")
          .insert({
            nome: data.supplierProduct.product_name,
            tipo: data.supplierProduct.category || "kite",
            tamanho: data.supplierProduct.size,
            ean: data.supplierProduct.ean,
            supplier_sku: data.supplierProduct.sku,
            cost_price: data.supplierProduct.cost_price,
            sale_price: data.precoVenda || data.supplierProduct.cost_price * 1.4,
            preco_aluguel_dia: 0,
            quantidade_fisica: data.quantidade,
            quantidade_virtual_safe: 0,
            source_type: "owned",
            status: "disponivel",
            fiscal_category: "venda_produto",
          })
          .select()
          .single();

        if (createError) throw createError;

        // Record the movement
        await supabase.from("movimentacoes_estoque").insert({
          equipamento_id: novoEquipamento.id,
          tipo: "entrada_fisica",
          quantidade: data.quantidade,
          origem: "scanner",
          notas: data.notas || `Entrada via scanner - SKU: ${data.supplierProduct.sku}`,
        });

        // Trigger Nuvemshop sync
        try {
          await supabase.functions.invoke("sync-inventory-nuvemshop", {
            body: {
              action: "sync_single",
              equipamento_id: novoEquipamento.id,
              trigger: "entrada",
            },
          });
        } catch (e) {
          console.warn("Nuvemshop sync failed, will retry later:", e);
        }

        return novoEquipamento;
      } else if (data.source === "equipamento" && data.equipamentoId) {
        // Update existing equipamento quantity
        const { data: equipamento, error: fetchError } = await supabase
          .from("equipamentos")
          .select("quantidade_fisica")
          .eq("id", data.equipamentoId)
          .single();

        if (fetchError) throw fetchError;

        const novaQuantidade = (equipamento.quantidade_fisica || 0) + data.quantidade;

        const { data: updated, error: updateError } = await supabase
          .from("equipamentos")
          .update({
            quantidade_fisica: novaQuantidade,
            source_type: "owned",
            status: "disponivel",
          })
          .eq("id", data.equipamentoId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Record the movement
        await supabase.from("movimentacoes_estoque").insert({
          equipamento_id: data.equipamentoId,
          tipo: "entrada_fisica",
          quantidade: data.quantidade,
          origem: "scanner",
          notas: data.notas || "Entrada via scanner - Reposição de estoque",
        });

        // Trigger Nuvemshop sync
        try {
          await supabase.functions.invoke("sync-inventory-nuvemshop", {
            body: {
              action: "sync_single",
              equipamento_id: data.equipamentoId,
              trigger: "entrada",
            },
          });
        } catch (e) {
          console.warn("Nuvemshop sync failed, will retry later:", e);
        }

        return updated;
      }

      throw new Error("Dados de entrada inválidos");
    },
    onSuccess: () => {
      toast.success("Entrada registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes-estoque"] });
    },
    onError: (error) => {
      console.error("Entrada error:", error);
      toast.error("Erro ao registrar entrada");
    },
  });
}

export function useMovimentacoesRecentes(limit = 10) {
  return useQuery({
    queryKey: ["movimentacoes-estoque", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_estoque")
        .select(`
          *,
          equipamentos (
            id,
            nome,
            tipo,
            tamanho
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}
