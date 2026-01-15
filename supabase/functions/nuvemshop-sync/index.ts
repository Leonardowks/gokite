import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NUVEMSHOP_API_BASE = 'https://api.nuvemshop.com.br/v1';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { action, storeId, accessToken, syncProducts, createTransactions } = body;

    console.log('Nuvemshop sync action:', action);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Se não vier credenciais, buscar do banco
    if (!storeId || !accessToken) {
      const { data: integration } = await supabase
        .from('integrations_nuvemshop')
        .select('store_id, access_token')
        .eq('status', 'connected')
        .limit(1)
        .single();

      if (integration) {
        storeId = integration.store_id;
        accessToken = integration.access_token;
        console.log('Using credentials from database');
      }
    }

    if (!storeId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing storeId or accessToken' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    switch (action) {
      case 'test': {
        // Test connection by fetching store info
        const storeResponse = await fetch(`${NUVEMSHOP_API_BASE}/${storeId}/store`, {
          headers: {
            'Authentication': `bearer ${accessToken}`,
            'User-Agent': 'GoKite CRM (contato@gokite.com.br)',
          },
        });

        if (!storeResponse.ok) {
          const errorText = await storeResponse.text();
          console.error('Nuvemshop API error:', errorText);
          throw new Error('Não foi possível conectar à loja. Verifique suas credenciais.');
        }

        const storeData = await storeResponse.json();
        const storeName = storeData.name?.pt || storeData.name;
        console.log('Store connected:', storeName);

        return new Response(
          JSON.stringify({ 
            success: true, 
            storeName,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync': {
        let ordersImported = 0;
        let productsImported = 0;

        // Sync orders
        if (createTransactions !== false) {
          ordersImported = await syncOrders(supabase, storeId, accessToken);
        }

        // Sync products (optional)
        if (syncProducts) {
          productsImported = await syncProductsCatalog(supabase, storeId, accessToken);
        }

        // Atualizar last_sync na integração
        await supabase
          .from('integrations_nuvemshop')
          .update({ last_sync: new Date().toISOString() })
          .eq('store_id', storeId);

        return new Response(
          JSON.stringify({ 
            success: true, 
            ordersImported,
            productsImported,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync_products': {
        // NOVO: Sincronizar produtos e vincular por SKU
        const result = await linkProductsBySku(supabase, storeId, accessToken);

        return new Response(
          JSON.stringify({ 
            success: true, 
            ...result,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error: unknown) {
    console.error('Sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function syncOrders(supabase: any, storeId: string, accessToken: string): Promise<number> {
  console.log('Syncing orders from Nuvemshop...');

  // Fetch recent paid orders (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceDate = thirtyDaysAgo.toISOString();

  const ordersResponse = await fetch(
    `${NUVEMSHOP_API_BASE}/${storeId}/orders?payment_status=paid&created_at_min=${sinceDate}&per_page=50`,
    {
      headers: {
        'Authentication': `bearer ${accessToken}`,
        'User-Agent': 'GoKite CRM (contato@gokite.com.br)',
      },
    }
  );

  if (!ordersResponse.ok) {
    console.error('Failed to fetch orders');
    return 0;
  }

  const orders = await ordersResponse.json();
  console.log(`Found ${orders.length} paid orders`);

  // Buscar tax_rules para ecommerce
  const { data: taxRule } = await supabase
    .from('tax_rules')
    .select('estimated_tax_rate, card_fee_rate')
    .eq('category', 'ecommerce')
    .eq('is_active', true)
    .single();

  const taxaImposto = taxRule?.estimated_tax_rate || 6;
  const taxaCartao = taxRule?.card_fee_rate || 3.5;

  let imported = 0;

  for (const order of orders) {
    // Check if already imported
    const { data: existing } = await supabase
      .from('transacoes')
      .select('id')
      .eq('referencia_id', String(order.id))
      .eq('origem', 'ecommerce')
      .single();

    if (existing) {
      console.log(`Order ${order.id} already imported, skipping`);
      continue;
    }

    const valorBruto = parseFloat(order.total);
    const taxaCartaoValor = (valorBruto * taxaCartao) / 100;
    const impostoProvisionado = (valorBruto * taxaImposto) / 100;
    const lucroLiquido = valorBruto - taxaCartaoValor - impostoProvisionado;

    const productNames = order.products?.map((p: any) => p.name?.pt || p.name).join(', ') || 'Pedido';
    const customerName = order.customer?.name || 'Cliente';

    const { error } = await supabase
      .from('transacoes')
      .insert({
        tipo: 'receita',
        origem: 'ecommerce',
        descricao: `Pedido #${order.number || order.id} - ${customerName} - ${productNames}`,
        valor_bruto: valorBruto,
        custo_produto: 0,
        taxa_cartao_estimada: taxaCartaoValor,
        imposto_provisionado: impostoProvisionado,
        lucro_liquido: lucroLiquido,
        centro_de_custo: 'Loja',
        forma_pagamento: 'cartao_credito',
        referencia_id: String(order.id),
        data_transacao: order.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      });

    if (!error) {
      imported++;
      console.log(`Imported order ${order.id}`);
    }
  }

  return imported;
}

async function syncProductsCatalog(supabase: any, storeId: string, accessToken: string): Promise<number> {
  console.log('Syncing products from Nuvemshop...');

  const productsResponse = await fetch(
    `${NUVEMSHOP_API_BASE}/${storeId}/products?per_page=100`,
    {
      headers: {
        'Authentication': `bearer ${accessToken}`,
        'User-Agent': 'GoKite CRM (contato@gokite.com.br)',
      },
    }
  );

  if (!productsResponse.ok) {
    console.error('Failed to fetch products');
    return 0;
  }

  const products = await productsResponse.json();
  console.log(`Found ${products.length} products`);

  // For now, just return count. Linking happens in link_products action
  return products.length;
}

// NOVO: Vincular produtos Nuvemshop com equipamentos por SKU
async function linkProductsBySku(
  supabase: any, 
  storeId: string, 
  accessToken: string
): Promise<{ totalProducts: number; linkedProducts: number; unlinkedProducts: string[] }> {
  console.log('Linking products by SKU...');

  // Buscar todos produtos da Nuvemshop
  const productsResponse = await fetch(
    `${NUVEMSHOP_API_BASE}/${storeId}/products?per_page=200`,
    {
      headers: {
        'Authentication': `bearer ${accessToken}`,
        'User-Agent': 'GoKite CRM (contato@gokite.com.br)',
      },
    }
  );

  if (!productsResponse.ok) {
    throw new Error('Failed to fetch products from Nuvemshop');
  }

  const products = await productsResponse.json();
  console.log(`Found ${products.length} products in Nuvemshop`);

  let linkedCount = 0;
  const unlinkedProducts: string[] = [];

  for (const product of products) {
    const productName = product.name?.pt || product.name || 'Unnamed';
    const nuvemshopProductId = String(product.id);
    
    // Processar variantes (ou produto sem variantes)
    const variants = product.variants?.length > 0 ? product.variants : [product];
    
    for (const variant of variants) {
      const sku = variant.sku;
      const nuvemshopVariantId = variant.id ? String(variant.id) : null;
      
      if (!sku) {
        console.log(`Product ${productName} has no SKU, skipping`);
        continue;
      }

      // Buscar equipamento por SKU ou EAN
      const { data: equip, error } = await supabase
        .from('equipamentos')
        .select('id, nome, nuvemshop_product_id')
        .or(`supplier_sku.eq.${sku},ean.eq.${sku}`)
        .limit(1)
        .maybeSingle();

      if (equip) {
        // Atualizar equipamento com IDs da Nuvemshop
        const { error: updateError } = await supabase
          .from('equipamentos')
          .update({
            nuvemshop_product_id: nuvemshopProductId,
            nuvemshop_variant_id: nuvemshopVariantId,
          })
          .eq('id', equip.id);

        if (!updateError) {
          linkedCount++;
          console.log(`Linked: ${productName} (SKU: ${sku}) -> ${equip.nome}`);
        }
      } else {
        unlinkedProducts.push(`${productName} (SKU: ${sku})`);
        console.log(`No match found for: ${productName} (SKU: ${sku})`);
      }
    }
  }

  console.log(`Linking complete: ${linkedCount} products linked, ${unlinkedProducts.length} unlinked`);

  return {
    totalProducts: products.length,
    linkedProducts: linkedCount,
    unlinkedProducts: unlinkedProducts.slice(0, 20), // Limitar a 20 para não sobrecarregar resposta
  };
}
