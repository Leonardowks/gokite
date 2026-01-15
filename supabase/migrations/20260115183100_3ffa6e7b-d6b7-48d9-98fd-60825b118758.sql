-- Tabela para armazenar credenciais da integração Nuvemshop
CREATE TABLE IF NOT EXISTS public.integrations_nuvemshop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  webhook_secret TEXT,
  status TEXT DEFAULT 'disconnected',
  store_name TEXT,
  last_sync TIMESTAMPTZ,
  auto_create_transactions BOOLEAN DEFAULT true,
  auto_sync_products BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para integrations_nuvemshop
ALTER TABLE public.integrations_nuvemshop ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on integrations_nuvemshop" ON public.integrations_nuvemshop FOR ALL USING (true) WITH CHECK (true);

-- Tabela para armazenar JSON bruto dos webhooks para auditoria
CREATE TABLE IF NOT EXISTS public.nuvemshop_orders_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nuvemshop_order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_nuvemshop_orders_raw_order_id ON public.nuvemshop_orders_raw(nuvemshop_order_id);
CREATE INDEX idx_nuvemshop_orders_raw_processed ON public.nuvemshop_orders_raw(processed);

-- RLS para nuvemshop_orders_raw
ALTER TABLE public.nuvemshop_orders_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on nuvemshop_orders_raw" ON public.nuvemshop_orders_raw FOR ALL USING (true) WITH CHECK (true);

-- Tabela para alertas de compra (itens virtuais que precisam ser pedidos)
CREATE TABLE IF NOT EXISTS public.alertas_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  pedido_nuvemshop_id UUID REFERENCES public.pedidos_nuvemshop(id) ON DELETE SET NULL,
  quantidade_necessaria INTEGER NOT NULL,
  supplier_sku TEXT,
  status TEXT DEFAULT 'pendente',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para alertas pendentes
CREATE INDEX idx_alertas_compra_status ON public.alertas_compra(status);

-- RLS para alertas_compra
ALTER TABLE public.alertas_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on alertas_compra" ON public.alertas_compra FOR ALL USING (true) WITH CHECK (true);

-- Trigger para updated_at em integrations_nuvemshop
CREATE TRIGGER update_integrations_nuvemshop_updated_at
  BEFORE UPDATE ON public.integrations_nuvemshop
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em alertas_compra
CREATE TRIGGER update_alertas_compra_updated_at
  BEFORE UPDATE ON public.alertas_compra
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();