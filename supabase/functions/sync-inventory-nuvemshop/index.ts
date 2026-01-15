import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NUVEMSHOP_API_BASE = "https://api.nuvemshop.com.br/v1";

interface SyncRequest {
  action: "sync_single" | "sync_all";
  equipamento_id?: string;
  trigger?: "entrada" | "venda" | "saida" | "ajuste" | "manual" | "supplier_update" | "verificacao_fisica";
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

interface NuvemshopCredentials {
  store_id: string;
  access_token: string;
  status: string;
}

interface StockCalculation {
  qtd_site: number;
  qtd_fisica: number;
  qtd_virtual_safe: number;
}

interface SyncResultItem {
  equipamento_id: string;
  nome: string;
  qtd_site: number;
  qtd_fisica: number;
  qtd_virtual_safe: number;
  prazo_entrega: number;
  synced: boolean;
  api_called: boolean;
  error?: string;
}

// ============================================
// REGRA DE OURO: Cálculo de Estoque com Buffer
// ============================================
function calcularEstoqueDisponivel(
  equipamento: Equipamento,
  supplierCatalog: SupplierCatalog | null
): StockCalculation {
  const qtdFisica = equipamento.quantidade_fisica || 0;

  // Buffer de Segurança:
  // - Se Qtd_Virtual <= 1: Buffer = 0 (protege última peça do fornecedor)
  // - Se Qtd_Virtual > 1: Buffer = Qtd_Virtual - 1
  let qtdVirtualSafe = 0;
  if (supplierCatalog && (supplierCatalog.supplier_stock_qty || 0) > 1) {
    qtdVirtualSafe = (supplierCatalog.supplier_stock_qty || 0) - 1;
  }

  // Estoque Final Site = Físico + Virtual Seguro
  return {
    qtd_site: qtdFisica + qtdVirtualSafe,
    qtd_fisica: qtdFisica,
    qtd_virtual_safe: qtdVirtualSafe,
  };
}

// Prazo de entrega baseado no tipo de estoque
function calcularPrazoEntrega(
  qtdFisica: number,
  qtdVirtualSafe: number,
  baseDays: number = 3
): number {
  if (qtdFisica > 0) {
    return baseDays; // Estoque físico: prazo padrão
  } else if (qtdVirtualSafe > 0) {
    return baseDays + 5; // Só virtual: +5 dias para cross-docking
  }
  return baseDays;
}

// ============================================
// API Nuvemshop: Atualizar estoque de variante
// ============================================
async function atualizarEstoqueNuvemshop(
  storeId: string,
  accessToken: string,
  productId: string,
  variantId: string | null,
  novoEstoque: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Se tem variant_id, atualiza a variante; senão, atualiza o produto
    const endpoint = variantId
      ? `${NUVEMSHOP_API_BASE}/${storeId}/products/${productId}/variants/${variantId}`
      : `${NUVEMSHOP_API_BASE}/${storeId}/products/${productId}`;

    console.log(`[API] PUT ${endpoint} - stock: ${novoEstoque}`);

    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authentication: `bearer ${accessToken}`,
        "User-Agent": "GoKite CRM (contato@gokite.com.br)",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stock_management: true,
        stock: novoEstoque,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Nuvemshop error ${response.status}: ${errorText}`);
      return { success: false, error: `${response.status}: ${errorText}` };
    }

    const result = await response.json();
    console.log(`[API] Atualizado com sucesso. Stock confirmado: ${result.stock}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[API] Exception: ${message}`);
    return { success: false, error: message };
  }
}

// ============================================
// Processar sincronização de um equipamento
// ============================================
// deno-lint-ignore no-explicit-any
async function processarEquipamento(
  supabase: any,
  equipamento: Equipamento,
  credentials: NuvemshopCredentials | null
): Promise<SyncResultItem> {
  // Buscar catálogo do fornecedor se tiver SKU
  let supplierCatalog: SupplierCatalog | null = null;
  if (equipamento.supplier_sku) {
    const { data: supplier } = await supabase
      .from("supplier_catalogs")
      .select("sku, supplier_stock_qty")
      .eq("sku", equipamento.supplier_sku)
      .single();
    supplierCatalog = supplier;
  }

  // Calcular estoque com a Regra de Ouro
  const stockData = calcularEstoqueDisponivel(equipamento, supplierCatalog);
  const prazoEntrega = calcularPrazoEntrega(
    stockData.qtd_fisica,
    stockData.qtd_virtual_safe,
    equipamento.prazo_entrega_dias || 3
  );

  console.log(`[CALC] ${equipamento.nome}: Física=${stockData.qtd_fisica}, VirtualSafe=${stockData.qtd_virtual_safe}, Site=${stockData.qtd_site}, Prazo=${prazoEntrega}d`);

  let apiCalled = false;
  let apiSuccess = true;
  let apiError: string | undefined;

  // Chamar API Nuvemshop se tiver product_id e credenciais ativas
  if (equipamento.nuvemshop_product_id && credentials?.status === "connected") {
    apiCalled = true;
    const result = await atualizarEstoqueNuvemshop(
      credentials.store_id,
      credentials.access_token,
      equipamento.nuvemshop_product_id,
      equipamento.nuvemshop_variant_id,
      stockData.qtd_site
    );
    apiSuccess = result.success;
    apiError = result.error;
  }

  // Atualizar banco de dados local
  // deno-lint-ignore no-explicit-any
  const updatePayload: any = {
    quantidade_virtual_safe: stockData.qtd_virtual_safe,
    prazo_entrega_dias: prazoEntrega,
  };

  // Se chamou API, registrar resultado
  if (apiCalled) {
    updatePayload.estoque_nuvemshop = stockData.qtd_site;
    updatePayload.ultima_sync_nuvemshop = new Date().toISOString();
    updatePayload.sync_status = apiSuccess ? "synced" : "error";
  }

  await supabase
    .from("equipamentos")
    .update(updatePayload)
    .eq("id", equipamento.id);

  return {
    equipamento_id: equipamento.id,
    nome: equipamento.nome,
    qtd_site: stockData.qtd_site,
    qtd_fisica: stockData.qtd_fisica,
    qtd_virtual_safe: stockData.qtd_virtual_safe,
    prazo_entrega: prazoEntrega,
    synced: apiSuccess,
    api_called: apiCalled,
    error: apiError,
  };
}

// ============================================
// Handler principal
// ============================================
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

    // Buscar credenciais da Nuvemshop
    const { data: nuvemshopConfig } = await supabase
      .from("integrations_nuvemshop")
      .select("store_id, access_token, status")
      .limit(1)
      .single();

    const credentials: NuvemshopCredentials | null = nuvemshopConfig;

    if (!credentials || credentials.status !== "connected") {
      console.log("[sync-inventory-nuvemshop] Nuvemshop não conectada - apenas atualizando banco local");
    }

    const results: SyncResultItem[] = [];

    if (action === "sync_single" && equipamento_id) {
      // Sincronizar um único equipamento
      const { data: equipamento, error: eqError } = await supabase
        .from("equipamentos")
        .select("*")
        .eq("id", equipamento_id)
        .single();

      if (eqError || !equipamento) {
        throw new Error(`Equipamento not found: ${equipamento_id}`);
      }

      const result = await processarEquipamento(supabase, equipamento as Equipamento, credentials);
      results.push(result);

    } else if (action === "sync_all") {
      // Sincronizar todos com nuvemshop_product_id OU supplier_sku
      const { data: equipamentos, error: eqError } = await supabase
        .from("equipamentos")
        .select("*")
        .or("nuvemshop_product_id.not.is.null,supplier_sku.not.is.null");

      if (eqError) throw eqError;

      for (const equipamento of equipamentos || []) {
        const result = await processarEquipamento(supabase, equipamento as Equipamento, credentials);
        results.push(result);
      }
    }

    const syncedCount = results.filter((r) => r.synced).length;
    const apiCalledCount = results.filter((r) => r.api_called).length;
    const errorCount = results.filter((r) => !r.synced && r.api_called).length;

    console.log(`[sync-inventory-nuvemshop] Processados: ${results.length}, API calls: ${apiCalledCount}, Sucesso: ${syncedCount}, Erros: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        synced_count: syncedCount,
        api_called_count: apiCalledCount,
        error_count: errorCount,
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
