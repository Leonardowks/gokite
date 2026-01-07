-- Adicionar campos EAN e Nuvemshop na tabela supplier_catalogs
ALTER TABLE supplier_catalogs 
  ADD COLUMN IF NOT EXISTS ean TEXT,
  ADD COLUMN IF NOT EXISTS nuvemshop_product_id TEXT,
  ADD COLUMN IF NOT EXISTS nuvemshop_variant_id TEXT;

-- Adicionar campos de controle de estoque na tabela equipamentos
ALTER TABLE equipamentos 
  ADD COLUMN IF NOT EXISTS ean TEXT,
  ADD COLUMN IF NOT EXISTS nuvemshop_product_id TEXT,
  ADD COLUMN IF NOT EXISTS nuvemshop_variant_id TEXT,
  ADD COLUMN IF NOT EXISTS quantidade_fisica INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quantidade_virtual_safe INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prazo_entrega_dias INTEGER DEFAULT 3;

-- Criar tabela de movimentações de estoque para auditoria
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id UUID REFERENCES equipamentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada_fisica', 'venda', 'transferencia', 'ajuste', 'entrada_virtual')),
  quantidade INTEGER NOT NULL,
  origem TEXT CHECK (origem IN ('scanner', 'manual', 'nuvemshop_webhook', 'duotone_sync')),
  usuario TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de pedidos Nuvemshop para rastreio de origem
CREATE TABLE IF NOT EXISTS pedidos_nuvemshop (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nuvemshop_order_id TEXT UNIQUE NOT NULL,
  numero_pedido TEXT,
  status TEXT DEFAULT 'pendente',
  itens JSONB DEFAULT '[]'::jsonb,
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  endereco_entrega TEXT,
  valor_total NUMERIC,
  prazo_envio_dias INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_nuvemshop ENABLE ROW LEVEL SECURITY;

-- RLS policies para movimentacoes_estoque
CREATE POLICY "Allow all operations on movimentacoes_estoque" 
  ON movimentacoes_estoque FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- RLS policies para pedidos_nuvemshop
CREATE POLICY "Allow all operations on pedidos_nuvemshop" 
  ON pedidos_nuvemshop FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Trigger para atualizar updated_at em pedidos_nuvemshop
CREATE TRIGGER update_pedidos_nuvemshop_updated_at
  BEFORE UPDATE ON pedidos_nuvemshop
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_equipamento ON movimentacoes_estoque(equipamento_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_estoque(tipo);
CREATE INDEX IF NOT EXISTS idx_equipamentos_ean ON equipamentos(ean);
CREATE INDEX IF NOT EXISTS idx_supplier_catalogs_ean ON supplier_catalogs(ean);
CREATE INDEX IF NOT EXISTS idx_pedidos_nuvemshop_status ON pedidos_nuvemshop(status);