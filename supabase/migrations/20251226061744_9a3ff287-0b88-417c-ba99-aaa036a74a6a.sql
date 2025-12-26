-- ===== TABELA TRADE-INS (Usados recebidos em troca) =====
CREATE TABLE public.trade_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_recebido TEXT NOT NULL,
  descricao TEXT,
  valor_entrada NUMERIC NOT NULL,
  equipamento_id_entrada UUID,
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  data_saida DATE,
  valor_saida NUMERIC,
  comprador_id UUID,
  lucro_trade_in NUMERIC GENERATED ALWAYS AS (COALESCE(valor_saida, 0) - valor_entrada) STORED,
  status TEXT NOT NULL DEFAULT 'em_estoque',
  transacao_origem_id UUID,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_ins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all operations on trade_ins"
ON public.trade_ins
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_trade_ins_updated_at
BEFORE UPDATE ON public.trade_ins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===== TABELA CONTAS A PAGAR =====
CREATE TABLE public.contas_a_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  categoria TEXT NOT NULL DEFAULT 'outros',
  recorrente BOOLEAN NOT NULL DEFAULT false,
  frequencia_recorrencia TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  fornecedor TEXT,
  centro_de_custo TEXT NOT NULL DEFAULT 'Administrativo',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contas_a_pagar ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all operations on contas_a_pagar"
ON public.contas_a_pagar
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_contas_a_pagar_updated_at
BEFORE UPDATE ON public.contas_a_pagar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();