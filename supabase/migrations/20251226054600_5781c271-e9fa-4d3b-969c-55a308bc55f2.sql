-- Create config_financeiro table for configurable rates
CREATE TABLE public.config_financeiro (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  taxa_cartao_credito numeric NOT NULL DEFAULT 4.0,
  taxa_cartao_debito numeric NOT NULL DEFAULT 2.0,
  taxa_pix numeric NOT NULL DEFAULT 0,
  taxa_imposto_padrao numeric NOT NULL DEFAULT 6.0,
  meta_mensal numeric NOT NULL DEFAULT 15000,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default config row
INSERT INTO public.config_financeiro (id) VALUES (gen_random_uuid());

-- Enable RLS
ALTER TABLE public.config_financeiro ENABLE ROW LEVEL SECURITY;

-- RLS policies for config_financeiro
CREATE POLICY "Allow all operations on config_financeiro" 
ON public.config_financeiro 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create transacoes table for unified financial transactions
CREATE TABLE public.transacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  origem text NOT NULL DEFAULT 'manual',
  descricao text,
  valor_bruto numeric NOT NULL,
  custo_produto numeric DEFAULT 0,
  taxa_cartao_estimada numeric DEFAULT 0,
  imposto_provisionado numeric DEFAULT 0,
  lucro_liquido numeric DEFAULT 0,
  centro_de_custo text NOT NULL DEFAULT 'Escola' CHECK (centro_de_custo IN ('Escola', 'Loja', 'Administrativo', 'Pousada')),
  forma_pagamento text NOT NULL DEFAULT 'dinheiro' CHECK (forma_pagamento IN ('pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'trade_in')),
  parcelas integer DEFAULT 1,
  equipamento_id uuid REFERENCES public.equipamentos(id),
  cliente_id uuid REFERENCES public.clientes(id),
  referencia_id uuid,
  data_transacao date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

-- RLS policies for transacoes
CREATE POLICY "Allow all operations on transacoes" 
ON public.transacoes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_transacoes_updated_at
BEFORE UPDATE ON public.transacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_financeiro_updated_at
BEFORE UPDATE ON public.config_financeiro
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();