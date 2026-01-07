-- Adicionar coluna store_credit na tabela clientes para crédito de loja
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS store_credit numeric DEFAULT 0;

-- Adicionar coluna foto_url na tabela trade_ins para foto do equipamento
ALTER TABLE public.trade_ins 
ADD COLUMN IF NOT EXISTS foto_url text;

-- Criar índice para busca rápida de trade-ins por status
CREATE INDEX IF NOT EXISTS idx_trade_ins_status ON public.trade_ins(status);

-- Criar índice para busca de trade-ins antigos (bomba)
CREATE INDEX IF NOT EXISTS idx_trade_ins_data_entrada ON public.trade_ins(data_entrada);