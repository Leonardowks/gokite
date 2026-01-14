import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupplierProduct {
  sku: string;
  product_name: string;
  category: string | null;
  brand: string;
  size: string | null;
  color: string | null;
  cost_price: number;
  supplier_stock_qty: number;
  supplier_name: string;
  sheet_url: string;
  ean: string | null;
}

// Detectar colunas automaticamente baseado nos headers
function detectColumns(headers: string[]): Record<string, number> {
  const columnMap: Record<string, number> = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  console.log("[sync-supplier] Headers encontrados:", headers);
  
  // Padrões expandidos para detectar colunas (Duotone real)
  const patterns: Record<string, RegExp[]> = {
    product_name: [
      /modelo/i, /produto/i, /nome/i, /product/i, /name/i, /descri/i,
      /item/i, /artigo/i, /^art\.?$/i, /^desc$/i, /designa/i
    ],
    size: [
      /tamanho/i, /size/i, /tam/i, /medida/i,
      /m2/i, /^m$/i, /metros/i, /^t$/i, /^sz$/i
    ],
    color: [/cor/i, /color/i, /colour/i, /^c$/i],
    cost_price: [
      /pre[cç]o/i, /price/i, /valor/i, /custo/i, /cost/i, /atacado/i,
      /^pv$/i, /^pc$/i, /^p\.v\.$/i, /^p\.c\.$/i, /dealer/i, /pvp/i,
      /tabela/i, /unit[aá]rio/i, /^val$/i
    ],
    supplier_stock_qty: [
      /quantidade/i, /estoque/i, /qty/i, /stock/i, /quant/i, /disp/i,
      /^qtd/i, /^qt/i, /dispo/i, /unid/i, /^un$/i, /saldo/i
    ],
    category: [
      /categoria/i, /category/i, /tipo/i, /type/i,
      /linha/i, /family/i, /familia/i, /grupo/i
    ],
    brand: [
      /marca/i, /brand/i, /fabricante/i,
      /^fab$/i, /manufacturer/i
    ],
    ean: [
      /ean/i, /barcode/i, /c[oó]digo.?barra/i, /gtin/i, /upc/i,
      /cod\.?\s*barra/i, /^cod$/i, /^c[oó]digo$/i
    ],
  };
  
  for (const [field, regexList] of Object.entries(patterns)) {
    for (let i = 0; i < lowerHeaders.length; i++) {
      for (const regex of regexList) {
        if (regex.test(lowerHeaders[i])) {
          columnMap[field] = i;
          console.log(`[sync-supplier] Coluna '${field}' detectada no índice ${i}: "${headers[i]}"`);
          break;
        }
      }
      if (columnMap[field] !== undefined) break;
    }
  }
  
  return columnMap;
}

// Parse CSV line considerando aspas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// Converter string de preço para número
function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  // Remover R$, espaços, e trocar vírgula por ponto
  const cleaned = priceStr
    .replace(/R\$\s*/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "") // Remove pontos de milhar
    .replace(",", "."); // Troca vírgula decimal por ponto
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Gerar SKU único
function generateSKU(brand: string, name: string, size: string | null, color: string | null): string {
  const brandPart = brand.toUpperCase().slice(0, 3);
  const namePart = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  const sizePart = size ? size.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) : "";
  const colorPart = color ? color.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) : "";
  
  return `${brandPart}-${namePart}${sizePart ? `-${sizePart}` : ""}${colorPart ? `-${colorPart}` : ""}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetUrl } = await req.json();
    
    if (!sheetUrl) {
      return new Response(
        JSON.stringify({ error: "URL da planilha é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[sync-supplier] URL original:", sheetUrl);

    // Extrair gid da URL original (para pegar aba específica)
    const gidMatch = sheetUrl.match(/[?#&]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : null;
    console.log("[sync-supplier] gid detectado:", gid);

    // Converter URL do Google Sheets para formato CSV
    let csvUrl = sheetUrl;
    if (sheetUrl.includes("docs.google.com/spreadsheets")) {
      // Caso comum: link publicado como HTML (termina com /pubhtml) → converter para CSV
      // Ex: .../d/e/<ID>/pubhtml  => .../d/e/<ID>/pub?output=csv
      if (sheetUrl.includes("/pubhtml")) {
        csvUrl = sheetUrl.replace("/pubhtml", "/pub?output=csv");
        if (gid && !csvUrl.includes("gid=")) {
          csvUrl += (csvUrl.includes("?") ? "&" : "?") + `gid=${gid}`;
        }
      }
      // Verificar se já é uma URL de export (publicada)
      else if (sheetUrl.includes("/pub") || sheetUrl.includes("output=csv") || sheetUrl.includes("format=csv")) {
        // Garantir que tem output=csv e preservar gid
        if (!sheetUrl.includes("output=csv") && !sheetUrl.includes("format=csv")) {
          csvUrl = sheetUrl.includes("?")
            ? `${sheetUrl}&output=csv`
            : `${sheetUrl}?output=csv`;
        } else {
          csvUrl = sheetUrl;
        }
        // Adicionar gid se não tiver e foi detectado
        if (gid && !csvUrl.includes("gid=")) {
          csvUrl += `&gid=${gid}`;
        }
      } else if (sheetUrl.includes("/d/e/")) {
        // URL de planilha publicada: extrair ID após /d/e/
        const match = sheetUrl.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
        if (match) {
          csvUrl = `https://docs.google.com/spreadsheets/d/e/${match[1]}/pub?output=csv`;
          if (gid) {
            csvUrl += `&gid=${gid}`;
          }
        }
      } else {
        // URL normal: extrair ID após /d/
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
          if (gid) {
            csvUrl += `&gid=${gid}`;
          }
        }
      }
    }

    console.log("[sync-supplier] CSV URL final:", csvUrl);
    
    // Buscar CSV
    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: "Não foi possível acessar a planilha", 
          code: "FETCH_ERROR",
          message: "Verifique se a planilha está publicada na web como CSV. Vá em Arquivo → Compartilhar → Publicar na Web → CSV.",
          helpUrl: "https://support.google.com/docs/answer/183965"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const csvText = await csvResponse.text();
    
    // Detectar HTML de erro do Google (planilha não publicada ou não existe)
    if (csvText.includes("<!DOCTYPE html") || 
        csvText.includes("file you have requested does not exist") ||
        csvText.includes("Google Sheets") && csvText.includes("<html")) {
      console.log("[sync-supplier] Planilha retornou HTML de erro ao invés de CSV");
      return new Response(
        JSON.stringify({ 
          error: "Planilha inacessível", 
          code: "SHEET_NOT_PUBLIC",
          message: "A planilha não está publicada na web ou não existe. Vá em Arquivo → Compartilhar → Publicar na Web → CSV.",
          helpUrl: "https://support.google.com/docs/answer/183965"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const lines = csvText.split("\n").filter(line => line.trim());
    
    // Log das primeiras linhas para debug
    console.log("[sync-supplier] Primeiras 3 linhas do CSV:", lines.slice(0, 3));
    
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ 
          error: "Planilha vazia ou sem dados",
          code: "EMPTY_SHEET"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse headers
    const headers = parseCSVLine(lines[0]);
    let columnMap = detectColumns(headers);
    
    console.log("[sync-supplier] Colunas detectadas:", columnMap);
    
    // Fallback: se não detectou product_name, usar primeira coluna com texto
    if (columnMap.product_name === undefined) {
      console.log("[sync-supplier] Tentando fallback para product_name...");
      const firstDataLine = parseCSVLine(lines[1]);
      
      for (let i = 0; i < headers.length; i++) {
        const value = firstDataLine[i];
        // Se a coluna tem texto (não apenas números) e não é vazia
        if (value && value.trim() && isNaN(parseFloat(value.replace(/[^\d.-]/g, '')))) {
          columnMap.product_name = i;
          console.log(`[sync-supplier] Fallback: usando coluna ${i} ("${headers[i]}") como product_name`);
          break;
        }
      }
    }
    
    if (columnMap.product_name === undefined) {
      return new Response(
        JSON.stringify({ 
          error: "Não foi possível detectar a coluna de nome/modelo do produto",
          code: "COLUMN_NOT_FOUND",
          headers: headers,
          message: "Nenhuma coluna de nome/modelo foi detectada. Verifique se a planilha tem colunas como 'Modelo', 'Produto' ou 'Nome'."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse products
    const products: SupplierProduct[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      const productName = values[columnMap.product_name]?.trim();
      if (!productName) continue;
      
      const size = columnMap.size !== undefined ? values[columnMap.size]?.trim() || null : null;
      const color = columnMap.color !== undefined ? values[columnMap.color]?.trim() || null : null;
      const brand = columnMap.brand !== undefined ? values[columnMap.brand]?.trim() || "Duotone" : "Duotone";
      const category = columnMap.category !== undefined ? values[columnMap.category]?.trim() || null : null;
      const costPrice = columnMap.cost_price !== undefined ? parsePrice(values[columnMap.cost_price]) : 0;
      const stockQty = columnMap.supplier_stock_qty !== undefined 
        ? parseInt(values[columnMap.supplier_stock_qty]) || 0 
        : 1;
      
      // Capturar EAN/código de barras (limpar para apenas números)
      let ean: string | null = null;
      if (columnMap.ean !== undefined && values[columnMap.ean]) {
        const eanRaw = values[columnMap.ean].trim().replace(/[^0-9]/g, '');
        // Validar EAN (8, 12, 13 ou 14 dígitos)
        if ([8, 12, 13, 14].includes(eanRaw.length)) {
          ean = eanRaw;
        }
      }
      
      const sku = generateSKU(brand, productName, size, color);
      
      products.push({
        sku,
        product_name: productName,
        category,
        brand,
        size,
        color,
        cost_price: costPrice,
        supplier_stock_qty: stockQty,
        supplier_name: "Duotone Sul",
        sheet_url: sheetUrl,
        ean,
      });
    }

    console.log(`[sync-supplier] Produtos parseados: ${products.length}`);

    // Deduplicate by SKU (keep last occurrence)
    const uniqueProducts = Array.from(
      products.reduce((map, product) => map.set(product.sku, product), new Map()).values()
    );
    console.log(`[sync-supplier] Após deduplicação: ${uniqueProducts.length} produtos únicos`);

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert products no catálogo do fornecedor
    const { error: upsertError } = await supabase
      .from("supplier_catalogs")
      .upsert(
        uniqueProducts.map(p => ({
          ...p,
          last_synced_at: new Date().toISOString(),
        })),
        { onConflict: "sku" }
      );

    if (upsertError) {
      console.error("[sync-supplier] Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar produtos", details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === SINCRONIZAR EANs COM EQUIPAMENTOS EXISTENTES ===
    // Atualizar equipamentos que têm supplier_sku mas não têm EAN
    const productsWithEan = products.filter(p => p.ean);
    let eansUpdated = 0;
    
    if (productsWithEan.length > 0) {
      console.log(`[sync-supplier] Sincronizando ${productsWithEan.length} EANs...`);
      
      for (const product of productsWithEan) {
        // Atualizar equipamento pelo supplier_sku onde EAN é null
        const { data: updated, error: updateError } = await supabase
          .from("equipamentos")
          .update({ ean: product.ean })
          .eq("supplier_sku", product.sku)
          .is("ean", null)
          .select("id");
        
        if (!updateError && updated && updated.length > 0) {
          eansUpdated += updated.length;
          console.log(`[sync-supplier] EAN atualizado para SKU ${product.sku}: ${product.ean}`);
        }
      }
      
      console.log(`[sync-supplier] Total EANs sincronizados: ${eansUpdated}`);
    }

    // Buscar equipamentos existentes para comparação
    const { data: existingEquipments } = await supabase
      .from("equipamentos")
      .select("id, nome, supplier_sku, source_type, status, tamanho, ean");

    // Criar mapas para comparação
    const existingBySupplierSku = new Map(
      existingEquipments?.filter(e => e.supplier_sku).map(e => [e.supplier_sku, e]) || []
    );
    
    const existingByName = new Map(
      existingEquipments?.map(e => [e.nome?.toLowerCase().trim(), e]) || []
    );

    // Categorizar produtos
    const newProducts: typeof products = [];
    const restockProducts: { product: SupplierProduct; currentStock: string }[] = [];
    const alreadyImported: typeof products = [];

    for (const product of products) {
      // Verificar se já existe por SKU do fornecedor
      if (existingBySupplierSku.has(product.sku)) {
        const existing = existingBySupplierSku.get(product.sku)!;
        if (existing.status === "vendido" || existing.status === "indisponivel") {
          restockProducts.push({ product, currentStock: "0" });
        } else {
          alreadyImported.push(product);
        }
        continue;
      }
      
      // Verificar se já existe por nome similar
      const nameKey = product.product_name.toLowerCase().trim();
      if (existingByName.has(nameKey)) {
        const existing = existingByName.get(nameKey)!;
        if (existing.status === "vendido" || existing.status === "indisponivel") {
          restockProducts.push({ product, currentStock: "0" });
        } else {
          alreadyImported.push(product);
        }
        continue;
      }
      
      newProducts.push(product);
    }

    const result = {
      success: true,
      stats: {
        total_parsed: products.length,
        new_products: newProducts.length,
        restock_needed: restockProducts.length,
        already_imported: alreadyImported.length,
        eans_synced: eansUpdated,
        eans_in_catalog: productsWithEan.length,
      },
      columns_detected: Object.keys(columnMap),
      new_products: newProducts.slice(0, 50), // Limitar para performance
      restock_products: restockProducts.slice(0, 50),
      already_imported: alreadyImported.slice(0, 20),
      last_synced_at: new Date().toISOString(),
    };

    console.log("[sync-supplier] Resultado final:", {
      total: result.stats.total_parsed,
      novos: result.stats.new_products,
      reposicao: result.stats.restock_needed,
      importados: result.stats.already_imported
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[sync-supplier] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ 
        error: "Erro interno", 
        code: "INTERNAL_ERROR",
        details: message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
