import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-id, x-webhook-secret',
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const event = body.event || body.type;
    const orderId = body.id ? String(body.id) : 'unknown';

    console.log('Nuvemshop webhook received:', event, 'Order:', orderId);

    // 1. SALVAR JSON BRUTO ANTES DE PROCESSAR (para auditoria) - usar upsert para evitar duplicatas
    try {
      await supabase.from('nuvemshop_orders_raw').upsert({
        nuvemshop_order_id: orderId,
        event_type: event || 'unknown',
        payload: body,
        processed: false,
      }, { 
        onConflict: 'nuvemshop_order_id',
        ignoreDuplicates: false 
      });
      console.log('Raw order saved for audit');
    } catch (rawError) {
      console.error('Failed to save raw order (continuing):', rawError);
    }

    // 2. VALIDAR WEBHOOK SECRET (segurança)
    const { data: integration } = await supabase
      .from('integrations_nuvemshop')
      .select('webhook_secret')
      .limit(1)
      .single();

    if (integration?.webhook_secret) {
      const receivedSecret = req.headers.get('x-webhook-secret');
      if (receivedSecret !== integration.webhook_secret) {
        console.warn('Invalid webhook secret received');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Processar evento
    let processResult = { success: true, message: 'Event handled' };

    switch (event) {
      case 'order/created':
      case 'order/paid':
        processResult = await handleOrderEvent(supabase, body, event);
        break;
      
      case 'order/cancelled':
        processResult = await handleOrderCancelled(supabase, body);
        break;

      default:
        console.log('Unhandled event type:', event);
        processResult = { success: true, message: `Unhandled event: ${event}` };
    }

    // 3. Marcar como processado
    await supabase
      .from('nuvemshop_orders_raw')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString(),
        error_message: processResult.success ? null : processResult.message,
      })
      .eq('nuvemshop_order_id', orderId);

    return new Response(
      JSON.stringify({ event, ...processResult }),
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

async function handleOrderEvent(supabase: any, orderData: NuvemshopOrder, event: string): Promise<{ success: boolean; message: string }> {
  console.log(`Processing ${event} for order ${orderData.id}`);

  // Only process paid orders
  if (event !== 'order/paid' && orderData.payment_status !== 'paid') {
    console.log('Order not paid yet, skipping');
    return { success: true, message: 'Order not paid, skipped' };
  }

  // Check if order already exists in pedidos_nuvemshop
  const { data: existingPedido } = await supabase
    .from('pedidos_nuvemshop')
    .select('id')
    .eq('nuvemshop_order_id', String(orderData.id))
    .single();

  if (existingPedido) {
    console.log('Order already processed:', orderData.id);
    return { success: true, message: 'Order already processed' };
  }

  // Process each product to determine origin
  const itensProcessados: ItemPedido[] = [];
  let custoTotal = 0;
  let temItemFornecedor = false;

  for (const product of orderData.products || []) {
    const itemProcessado = await processarItemPedido(supabase, product);
    itensProcessados.push(itemProcessado);
    
    // CORREÇÃO: Calcular custo total acumulando o custo de cada item
    if (itemProcessado.equipamento_id) {
      const { data: equip } = await supabase
        .from('equipamentos')
        .select('cost_price')
        .eq('id', itemProcessado.equipamento_id)
        .single();
      custoTotal += (equip?.cost_price || 0) * itemProcessado.quantity;
    }
    
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

  // Deduct stock for physical items OR create purchase alerts for virtual items
  for (const item of itensProcessados) {
    if (item.origem === 'estoque_loja' && item.equipamento_id) {
      await deductStock(supabase, item.equipamento_id, item.quantity, pedido.id);
    } else if (item.origem === 'fornecedor_virtual') {
      // NOVO: Criar alerta de compra para itens virtuais
      await createAlertaCompra(supabase, item, pedido.id);
    }
  }

  // Create transaction using tax_rules
  await createTransaction(supabase, orderData, itensProcessados, custoTotal);

  // Sync inventory with Nuvemshop
  try {
    await supabase.functions.invoke('sync-inventory-nuvemshop');
    console.log('Inventory sync triggered');
  } catch (e) {
    console.error('Failed to trigger inventory sync:', e);
  }

  return { success: true, message: `Order processed with ${itensProcessados.length} items` };
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

  // If still not found, try by SKU (sanitizado para evitar SQL injection)
  if (!equipamento && product.sku) {
    const sanitizedSku = product.sku.replace(/[^a-zA-Z0-9\-_\.]/g, '');
    if (sanitizedSku) {
      const { data } = await supabase
        .from('equipamentos')
        .select('id, nome, quantidade_fisica, quantidade_virtual_safe, source_type, supplier_sku, cost_price')
        .or(`supplier_sku.eq.${sanitizedSku},ean.eq.${sanitizedSku}`)
        .limit(1)
        .single();
      equipamento = data;
    }
  }

  // Try by name similarity as last resort
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

// NOVO: Criar alerta de compra para itens virtuais
async function createAlertaCompra(supabase: any, item: ItemPedido, pedidoId: string) {
  const { error } = await supabase
    .from('alertas_compra')
    .insert({
      equipamento_id: item.equipamento_id || null,
      pedido_nuvemshop_id: pedidoId,
      quantidade_necessaria: item.quantity,
      supplier_sku: item.supplier_sku || item.sku,
      status: 'pendente',
      notas: `Pedido Nuvemshop - ${item.product_name} (${item.quantity}x)`,
    });

  if (error) {
    console.error('Error creating alerta_compra:', error);
  } else {
    console.log(`Purchase alert created: ${item.product_name} x${item.quantity}`);
  }
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

  // NOVO: Buscar tax_rules para categoria 'ecommerce'
  const { data: taxRule } = await supabase
    .from('tax_rules')
    .select('estimated_tax_rate, card_fee_rate')
    .eq('category', 'ecommerce')
    .eq('is_active', true)
    .single();

  // Fallback to config_financeiro if no tax_rule found
  let taxaImposto = taxRule?.estimated_tax_rate || 6;
  let taxaCartao = taxRule?.card_fee_rate || 3.5;

  if (!taxRule) {
    const { data: config } = await supabase
      .from('config_financeiro')
      .select('taxa_imposto_padrao')
      .limit(1)
      .single();
    taxaImposto = config?.taxa_imposto_padrao || 6;
  }

  const valorBruto = parseFloat(orderData.total);
  const taxaCartaoValor = (valorBruto * taxaCartao) / 100;
  const impostoProvisionado = (valorBruto * taxaImposto) / 100;
  const lucroLiquido = valorBruto - custoTotal - taxaCartaoValor - impostoProvisionado;

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
      taxa_cartao_estimada: taxaCartaoValor,
      imposto_provisionado: impostoProvisionado,
      lucro_liquido: lucroLiquido,
      centro_de_custo: 'Loja',
      forma_pagamento: 'cartao_credito',
      referencia_id: String(orderData.id),
      data_transacao: orderData.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    });

  if (error) {
    console.error('Error creating transaction:', error);
  } else {
    console.log('Transaction created for order:', orderData.id, `(tax: ${taxaImposto}%, card: ${taxaCartao}%)`);
  }
}

async function handleOrderCancelled(supabase: any, orderData: any): Promise<{ success: boolean; message: string }> {
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
    return { success: true, message: 'Order not found for cancellation' };
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

  // Cancel purchase alerts for virtual items
  await supabase
    .from('alertas_compra')
    .update({ status: 'cancelado' })
    .eq('pedido_nuvemshop_id', pedido.id);

  // Update order status
  await supabase
    .from('pedidos_nuvemshop')
    .update({ status: 'cancelado' })
    .eq('id', pedido.id);

  console.log('Order cancelled:', orderId);
  return { success: true, message: 'Order cancelled and stock restored' };
}
