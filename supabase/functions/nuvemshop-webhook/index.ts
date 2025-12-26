import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-id',
};

interface NuvemshopOrder {
  id: number;
  number: string;
  status: string;
  payment_status: string;
  total: string;
  currency: string;
  created_at: string;
  customer: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  products: Array<{
    id: number;
    name: string;
    quantity: number;
    price: string;
  }>;
  shipping_address?: {
    city: string;
    state: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Nuvemshop webhook received:', JSON.stringify(body, null, 2));

    const event = body.event || body.type;
    const storeId = body.store_id;

    // Handle different event types
    switch (event) {
      case 'order/created':
      case 'order/paid':
        await handleOrderEvent(supabase, body, event);
        break;
      
      case 'order/cancelled':
        console.log('Order cancelled:', body.id);
        // Could update transaction status if needed
        break;

      default:
        console.log('Unhandled event type:', event);
    }

    return new Response(
      JSON.stringify({ success: true, event }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Webhook error:', error);
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

async function handleOrderEvent(supabase: any, orderData: NuvemshopOrder, event: string) {
  console.log(`Processing ${event} for order ${orderData.id}`);

  // Only create transaction for paid orders
  if (event !== 'order/paid' && orderData.payment_status !== 'paid') {
    console.log('Order not paid yet, skipping transaction creation');
    return;
  }

  // Check if transaction already exists for this order
  const { data: existing } = await supabase
    .from('transacoes')
    .select('id')
    .eq('referencia_id', String(orderData.id))
    .eq('origem', 'nuvemshop')
    .single();

  if (existing) {
    console.log('Transaction already exists for order:', orderData.id);
    return;
  }

  // Get config for tax calculations
  const { data: config } = await supabase
    .from('config_financeiro')
    .select('*')
    .limit(1)
    .single();

  const valorBruto = parseFloat(orderData.total);
  const taxaImposto = config?.taxa_imposto_padrao || 6;
  const impostoProvisionado = (valorBruto * taxaImposto) / 100;
  const lucroLiquido = valorBruto - impostoProvisionado;

  // Build description from products
  const productNames = orderData.products?.map(p => p.name).join(', ') || 'Pedido Nuvemshop';
  const customerName = orderData.customer?.name || 'Cliente';

  // Create transaction
  const { data: transacao, error } = await supabase
    .from('transacoes')
    .insert({
      tipo: 'receita',
      origem: 'nuvemshop',
      descricao: `Pedido #${orderData.number || orderData.id} - ${customerName} - ${productNames}`,
      valor_bruto: valorBruto,
      custo_produto: 0,
      taxa_cartao_estimada: 0,
      imposto_provisionado: impostoProvisionado,
      lucro_liquido: lucroLiquido,
      centro_de_custo: 'Loja',
      forma_pagamento: 'pix',
      referencia_id: String(orderData.id),
      data_transacao: orderData.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }

  console.log('Transaction created:', transacao.id);

  // Optionally find or create customer
  if (orderData.customer?.email) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('email', orderData.customer.email)
      .single();

    if (!cliente) {
      // Create new client
      const { data: newCliente } = await supabase
        .from('clientes')
        .insert({
          nome: orderData.customer.name,
          email: orderData.customer.email,
          telefone: orderData.customer.phone || null,
          tags: ['nuvemshop'],
        })
        .select()
        .single();

      if (newCliente) {
        // Update transaction with client ID
        await supabase
          .from('transacoes')
          .update({ cliente_id: newCliente.id })
          .eq('id', transacao.id);
      }
    } else {
      // Update transaction with existing client ID
      await supabase
        .from('transacoes')
        .update({ cliente_id: cliente.id })
        .eq('id', transacao.id);
    }
  }
}
