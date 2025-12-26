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
    const { action, storeId, accessToken, syncProducts, createTransactions } = await req.json();

    console.log('Nuvemshop sync action:', action);

    if (!storeId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing storeId or accessToken' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'test':
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
        console.log('Store connected:', storeData.name?.pt || storeData.name);

        return new Response(
          JSON.stringify({ 
            success: true, 
            storeName: storeData.name?.pt || storeData.name,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'sync':
        let ordersImported = 0;
        let productsImported = 0;

        // Sync orders
        if (createTransactions) {
          ordersImported = await syncOrders(supabase, storeId, accessToken);
        }

        // Sync products (optional)
        if (syncProducts) {
          productsImported = await syncProductsCatalog(supabase, storeId, accessToken);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            ordersImported,
            productsImported,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

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

  // Get config for tax calculations
  const { data: config } = await supabase
    .from('config_financeiro')
    .select('*')
    .limit(1)
    .single();

  let imported = 0;

  for (const order of orders) {
    // Check if already imported
    const { data: existing } = await supabase
      .from('transacoes')
      .select('id')
      .eq('referencia_id', String(order.id))
      .eq('origem', 'nuvemshop')
      .single();

    if (existing) {
      console.log(`Order ${order.id} already imported, skipping`);
      continue;
    }

    const valorBruto = parseFloat(order.total);
    const taxaImposto = config?.taxa_imposto_padrao || 6;
    const impostoProvisionado = (valorBruto * taxaImposto) / 100;
    const lucroLiquido = valorBruto - impostoProvisionado;

    const productNames = order.products?.map((p: any) => p.name?.pt || p.name).join(', ') || 'Pedido';
    const customerName = order.customer?.name || 'Cliente';

    const { error } = await supabase
      .from('transacoes')
      .insert({
        tipo: 'receita',
        origem: 'nuvemshop',
        descricao: `Pedido #${order.number || order.id} - ${customerName} - ${productNames}`,
        valor_bruto: valorBruto,
        custo_produto: 0,
        taxa_cartao_estimada: 0,
        imposto_provisionado: impostoProvisionado,
        lucro_liquido: lucroLiquido,
        centro_de_custo: 'Loja',
        forma_pagamento: 'pix',
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

  // For now, just log products. Could sync to equipamentos table if needed
  // This is a placeholder for future product sync logic
  
  return products.length;
}
