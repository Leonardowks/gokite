-- Criar tabela para catálogo de fornecedores
CREATE TABLE public.supplier_catalogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  brand TEXT DEFAULT 'Duotone',
  size TEXT,
  color TEXT,
  cost_price NUMERIC NOT NULL,
  supplier_stock_qty INTEGER DEFAULT 0,
  supplier_name TEXT DEFAULT 'Duotone Sul',
  sheet_url TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.supplier_catalogs ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Allow all operations on supplier_catalogs" 
ON public.supplier_catalogs 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Adicionar campos na tabela equipamentos para controle de origem
ALTER TABLE public.equipamentos 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'owned',
ADD COLUMN IF NOT EXISTS supplier_sku TEXT,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC,
ADD COLUMN IF NOT EXISTS sale_price NUMERIC;

-- Trigger para updated_at
CREATE TRIGGER update_supplier_catalogs_updated_at
BEFORE UPDATE ON public.supplier_catalogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();