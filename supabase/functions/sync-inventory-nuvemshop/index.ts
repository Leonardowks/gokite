import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  action: "sync_single" | "sync_all";
  equipamento_id?: string;
  trigger: "entrada" | "venda" | "ajuste";
}

interface Equipamento {
  id: string;
  nome: string;
  quantidade_fisica: number;
  quantidade_virtual_safe: number;
  nuvemshop_product_id: string | null;
  nuvemshop_variant_id: string | null;
  prazo_entrega_dias: number;
  supplier_sku: string | null;
  source_type: string | null;
}

interface SupplierCatalog {
  sku: string;
  supplier_stock_qty: number | null;
}

// Calculate safe available stock with buffer
function calcularEstoqueDisponivel(
  equipamento: Equipamento,
  supplierCatalog: SupplierCatalog | null
): { qtd_site: number; qtd_fisica: number; qtd_virtual_safe: number } {
  const qtdFisica = equipamento.quantidade_fisica || 0;

  // Buffer de segurança: só considera virtual se fornecedor tem >1 unidade
  let qtdVirtualSafe = 0;
  if (supplierCatalog && (supplierCatalog.supplier_stock_qty || 0) > 1) {
    qtdVirtualSafe = (supplierCatalog.supplier_stock_qty || 0) - 1; // Buffer de 1
  }

  return {
    qtd_site: qtdFisica + qtdVirtualSafe,
    qtd_fisica: qtdFisica,
    qtd_virtual_safe: qtdVirtualSafe,
  };
}

// Calculate delivery days based on stock type
function calcularPrazoEntrega(
  qtdFisica: number,
  qtdVirtualSafe: number,
  baseDays: number = 3
): number {
  if (qtdFisica > 0) {
    return baseDays; // Physical stock - standard delivery
  } else if (qtdVirtualSafe > 0) {
    return baseDays + 5; // Virtual stock - add 5 days for cross-docking
  }
  return baseDays;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, equipamento_id, trigger }: SyncRequest = await req.json();

    console.log(`[sync-inventory-nuvemshop] Action: ${action}, Trigger: ${trigger}, Equipamento: ${equipamento_id || "all"}`);

    const results: any[] = [];

    if (action === "sync_single" && equipamento_id) {
      // Sync single equipment
      const { data: equipamento, error: eqError } = await supabase
        .from("equipamentos")
        .select("*")
        .eq("id", equipamento_id)
        .single();

      if (eqError || !equipamento) {
        throw new Error(`Equipamento not found: ${equipamento_id}`);
      }

      // Get supplier catalog if exists
      let supplierCatalog: SupplierCatalog | null = null;
      if (equipamento.supplier_sku) {
        const { data: supplier } = await supabase
          .from("supplier_catalogs")
          .select("sku, supplier_stock_qty")
          .eq("sku", equipamento.supplier_sku)
          .single();
        supplierCatalog = supplier;
      }

      const stockData = calcularEstoqueDisponivel(equipamento as Equipamento, supplierCatalog);
      const prazoEntrega = calcularPrazoEntrega(
        stockData.qtd_fisica,
        stockData.qtd_virtual_safe,
        equipamento.prazo_entrega_dias || 3
      );

      // Update equipment with calculated virtual safe stock
      await supabase
        .from("equipamentos")
        .update({
          quantidade_virtual_safe: stockData.qtd_virtual_safe,
          prazo_entrega_dias: prazoEntrega,
        })
        .eq("id", equipamento_id);

      // TODO: When Nuvemshop API credentials are configured, update product stock there
      // For now, we just log and update local data
      console.log(`[sync-inventory-nuvemshop] Equipment ${equipamento.nome}:`, {
        qtd_site: stockData.qtd_site,
        qtd_fisica: stockData.qtd_fisica,
        qtd_virtual_safe: stockData.qtd_virtual_safe,
        prazo_entrega: prazoEntrega,
      });

      results.push({
        equipamento_id,
        nome: equipamento.nome,
        ...stockData,
        prazo_entrega: prazoEntrega,
        synced: true,
      });
    } else if (action === "sync_all") {
      // Sync all equipment
      const { data: equipamentos, error: eqError } = await supabase
        .from("equipamentos")
        .select("*")
        .not("nuvemshop_product_id", "is", null);

      if (eqError) throw eqError;

      for (const equipamento of equipamentos || []) {
        let supplierCatalog: SupplierCatalog | null = null;
        if (equipamento.supplier_sku) {
          const { data: supplier } = await supabase
            .from("supplier_catalogs")
            .select("sku, supplier_stock_qty")
            .eq("sku", equipamento.supplier_sku)
            .single();
          supplierCatalog = supplier;
        }

        const stockData = calcularEstoqueDisponivel(equipamento as Equipamento, supplierCatalog);
        const prazoEntrega = calcularPrazoEntrega(
          stockData.qtd_fisica,
          stockData.qtd_virtual_safe,
          equipamento.prazo_entrega_dias || 3
        );

        await supabase
          .from("equipamentos")
          .update({
            quantidade_virtual_safe: stockData.qtd_virtual_safe,
            prazo_entrega_dias: prazoEntrega,
          })
          .eq("id", equipamento.id);

        results.push({
          equipamento_id: equipamento.id,
          nome: equipamento.nome,
          ...stockData,
          prazo_entrega: prazoEntrega,
          synced: true,
        });
      }
    }

    console.log(`[sync-inventory-nuvemshop] Synced ${results.length} items`);

    return new Response(
      JSON.stringify({
        success: true,
        synced_count: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[sync-inventory-nuvemshop] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
