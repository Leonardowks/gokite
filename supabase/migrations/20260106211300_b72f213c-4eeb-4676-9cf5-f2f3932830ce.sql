-- Migração: Taxas de Cartão Variáveis
-- Adicionar coluna JSONB para taxas de cartão com estrutura flexível

-- 1. Adicionar nova coluna taxas_cartao com default robusto
ALTER TABLE public.config_financeiro
ADD COLUMN IF NOT EXISTS taxas_cartao jsonb NOT NULL DEFAULT '{
  "debito": 1.99,
  "credito_1x": 3.50,
  "credito_2x_6x": 4.90,
  "credito_7x_12x": 12.50
}'::jsonb;

-- 2. Remover colunas antigas (após garantir que a nova existe)
ALTER TABLE public.config_financeiro
DROP COLUMN IF EXISTS taxa_cartao_credito,
DROP COLUMN IF EXISTS taxa_cartao_debito;