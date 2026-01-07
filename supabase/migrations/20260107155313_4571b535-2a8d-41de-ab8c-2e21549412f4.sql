-- Adicionar campo fiscal_category na tabela equipamentos
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS fiscal_category TEXT DEFAULT 'venda_produto';