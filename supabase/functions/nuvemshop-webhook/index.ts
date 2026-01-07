import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-id',
};

interface NuvemshopProduct {
  id: number;
  product_id: number;
  variant_id?: number;
  name: string;
  quantity: number;
  price: string;
  sku?: string;
}

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
  products: NuvemshopProduct[];
  shipping_address?: {
    address: string;
    city: string;
    province: string;
    zipcode: string;
  };
}

interface ItemPedido {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  origem: 'estoque_loja' | 'fornecedor_virtual';
  equipamento_id?: string;
  supplier_sku?: string;
  sku?: string;
}

Deno.serve(async (req) => {
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

    switch (event) {
      case 'order/created':
      case 'order/paid':
        await handleOrderEvent(supabase, body, event);
        break;
      
      case 'order/cancelled':
        await handleOrderCancelled(supabase, body);
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

  // Only process paid orders
  if (event !== 'order/paid' && orderData.payment_status !== 'paid') {
    console.log('Order not paid yet, skipping');
    return;
  }

  // Check if order already exists in pedidos_nuvemshop
  const { data: existingPedido } = await supabase
    .from('pedidos_nuvemshop')
    .select('id')
    .eq('nuvemshop_order_id', String(orderData.id))
    .single();

  if (existingPedido) {
    console.log('Order already processed:', orderData.id);
    return;
  }

  // Process each product to determine origin
  const itensProcessados: ItemPedido[] = [];
  let custoTotal = 0;
  let temItemFornecedor = false;

  for (const product of orderData.products || []) {
    const itemProcessado = await processarItemPedido(supabase, product);
    itensProcessados.push(itemProcessado);
    
    if (itemProcessado.origem === 'fornecedor_virtual') {
      temItemFornecedor = true;
    }
  }

  // Build shipping address string
  const endereco = orderData.shipping_address 
    ? `${orderData.shipping_address.address}, ${orderData.shipping_address.city} - ${orderData.shipping_address.province}, ${orderData.shipping_address.zipcode}`
    : null;

  // Calculate delivery days based on item origins
  const prazoEnvio = temItemFornecedor ? 7 : 3;

  // Create order in pedidos_nuvemshop
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos_nuvemshop')
    .insert({
      nuvemshop_order_id: String(orderData.id),
      numero_pedido: orderData.number || String(orderData.id),
      status: 'pendente',
      cliente_nome: orderData.customer?.name || null,
      cliente_email: orderData.customer?.email || null,
      cliente_telefone: orderData.customer?.phone || null,
      endereco_entrega: endereco,
      itens: itensProcessados,
      valor_total: parseFloat(orderData.total),
      prazo_envio_dias: prazoEnvio,
    })
    .select()
    .single();

  if (pedidoError) {
    console.error('Error creating pedido:', pedidoError);
    throw pedidoError;
  }

  console.log('Pedido created:', pedido.id, 'with', itensProcessados.length, 'items');

  // Deduct stock for physical items
  for (const item of itensProcessados) {
    if (item.origem === 'estoque_loja' && item.equipamento_id) {
      await deductStock(supabase, item.equipamento_id, item.quantity, pedido.id);
    }
  }

  // Create transaction
  await createTransaction(supabase, orderData, itensProcessados, custoTotal);

  // Sync inventory with Nuvemshop
  try {
    await supabase.functions.invoke('sync-inventory-nuvemshop');
    console.log('Inventory sync triggered');
  } catch (e) {
    console.error('Failed to trigger inventory sync:', e);
  }
}

async function processarItemPedido(supabase: any, product: NuvemshopProduct): Promise<ItemPedido> {
  const productIdStr = String(product.product_id || product.id);
  const variantIdStr = product.variant_id ? String(product.variant_id) : null;
  
  // Try to find matching equipment by nuvemshop IDs
  let equipamento = null;
  
  if (variantIdStr) {
    const { data } = await supabase
      .from('equipamentos')
      .select('id, nome, quantidade_fisica, quantidade_virtual_safe, source_type, supplier_sku, cost_price')
      .eq('nuvemshop_variant_id', variantIdStr)
      .single();
    equipamento = data;
  }
  
  if (!equipamento) {
    const { data } = await supabase
      .from('equipamentos')
      .select('id, nome, quantidade_fisica, quantidade_virtual_safe, source_type, supplier_sku, cost_price')
      .eq('nuvemshop_product_id', productIdStr)
      .single();
    equipamento = data;
  }

  // If still not found, try by name similarity
  if (!equipamento) {
    const { data } = await supabase
      .from('equipamentos')
      .select('id, nome, quantidade_fisica, quantidade_virtual_safe, source_type, supplier_sku, cost_price')
      .ilike('nome', `%${product.name.split(' ').slice(0, 3).join('%')}%`)
      .limit(1)
      .single();
    equipamento = data;
  }

  const price = parseFloat(product.price);

  // Determine origin based on stock availability
  if (equipamento) {
    const hasPhysicalStock = (equipamento.quantidade_fisica || 0) >= product.quantity;
    
    if (hasPhysicalStock) {
      // Physical stock available - ship from store
      return {
        product_id: productIdStr,
        product_name: product.name,
        quantity: product.quantity,
        price: price,
        origem: 'estoque_loja',
        equipamento_id: equipamento.id,
        sku: product.sku,
      };
    } else if (equipamento.source_type === 'virtual_supplier' || (equipamento.quantidade_virtual_safe || 0) > 0) {
      // Virtual stock - need to order from supplier
      return {
        product_id: productIdStr,
        product_name: product.name,
        quantity: product.quantity,
        price: price,
        origem: 'fornecedor_virtual',
        equipamento_id: equipamento.id,
        supplier_sku: equipamento.supplier_sku,
        sku: product.sku,
      };
    }
  }

  // Default: Unknown product - assume supplier order needed
  console.log('Product not found in inventory, assuming virtual:', product.name);
  return {
    product_id: productIdStr,
    product_name: product.name,
    quantity: product.quantity,
    price: price,
    origem: 'fornecedor_virtual',
    sku: product.sku,
  };
}

async function deductStock(supabase: any, equipamentoId: string, quantity: number, pedidoId: string) {
  // Get current stock
  const { data: equip } = await supabase
    .from('equipamentos')
    .select('quantidade_fisica, nome')
    .eq('id', equipamentoId)
    .single();

  if (!equip) return;

  const newQty = Math.max(0, (equip.quantidade_fisica || 0) - quantity);

  // Update stock
  await supabase
    .from('equipamentos')
    .update({ quantidade_fisica: newQty })
    .eq('id', equipamentoId);

  // Log movement
  await supabase
    .from('movimentacoes_estoque')
    .insert({
      equipamento_id: equipamentoId,
      tipo: 'saida',
      quantidade: -quantity,
      origem: 'venda_nuvemshop',
      notas: `Pedido Nuvemshop #${pedidoId} - ${equip.nome}`,
    });

  console.log(`Stock deducted: ${equip.nome} -${quantity} (new: ${newQty})`);
}

async function createTransaction(supabase: any, orderData: NuvemshopOrder, itens: ItemPedido[], custoTotal: number) {
  // Check if transaction already exists
  const { data: existing } = await supabase
    .from('transacoes')
    .select('id')
    .eq('referencia_id', String(orderData.id))
    .eq('origem', 'ecommerce')
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
  const lucroLiquido = valorBruto - custoTotal - impostoProvisionado;

  const productNames = itens.map(p => p.product_name).join(', ');
  const customerName = orderData.customer?.name || 'Cliente';

  const { error } = await supabase
    .from('transacoes')
    .insert({
      tipo: 'receita',
      origem: 'ecommerce',
      descricao: `Pedido #${orderData.number || orderData.id} - ${customerName} - ${productNames}`,
      valor_bruto: valorBruto,
      custo_produto: custoTotal,
      taxa_cartao_estimada: 0,
      imposto_provisionado: impostoProvisionado,
      lucro_liquido: lucroLiquido,
      centro_de_custo: 'Loja',
      forma_pagamento: 'pix',
      referencia_id: String(orderData.id),
      data_transacao: orderData.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    });

  if (error) {
    console.error('Error creating transaction:', error);
  } else {
    console.log('Transaction created for order:', orderData.id);
  }
}

async function handleOrderCancelled(supabase: any, orderData: any) {
  const orderId = String(orderData.id);
  console.log('Processing order cancellation:', orderId);

  // Find the order
  const { data: pedido } = await supabase
    .from('pedidos_nuvemshop')
    .select('id, itens, status')
    .eq('nuvemshop_order_id', orderId)
    .single();

  if (!pedido) {
    console.log('Order not found for cancellation:', orderId);
    return;
  }

  // Restore stock for physical items that were deducted
  const itens = pedido.itens as ItemPedido[];
  for (const item of itens) {
    if (item.origem === 'estoque_loja' && item.equipamento_id) {
      // Get current stock
      const { data: equip } = await supabase
        .from('equipamentos')
        .select('quantidade_fisica, nome')
        .eq('id', item.equipamento_id)
        .single();

      if (equip) {
        const newQty = (equip.quantidade_fisica || 0) + item.quantity;

        await supabase
          .from('equipamentos')
          .update({ quantidade_fisica: newQty })
          .eq('id', item.equipamento_id);

        await supabase
          .from('movimentacoes_estoque')
          .insert({
            equipamento_id: item.equipamento_id,
            tipo: 'entrada',
            quantidade: item.quantity,
            origem: 'cancelamento_nuvemshop',
            notas: `Cancelamento pedido #${orderId} - ${equip.nome}`,
          });

        console.log(`Stock restored: ${equip.nome} +${item.quantity}`);
      }
    }
  }

  // Update order status
  await supabase
    .from('pedidos_nuvemshop')
    .update({ status: 'cancelado' })
    .eq('id', pedido.id);

  console.log('Order cancelled:', orderId);
}
