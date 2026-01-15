-- Tabela para rastrear importações de NF-e
CREATE TABLE public.importacoes_nfe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_nfe TEXT NOT NULL,
  chave_acesso TEXT,
  fornecedor_cnpj TEXT,
  fornecedor_nome TEXT,
  data_emissao DATE,
  valor_total NUMERIC(12,2),
  qtd_produtos INTEGER DEFAULT 0,
  qtd_duplicatas INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processado',
  xml_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar campo nfe_id em contas_a_pagar
ALTER TABLE public.contas_a_pagar 
ADD COLUMN nfe_id UUID REFERENCES public.importacoes_nfe(id);

-- Adicionar campo nfe_id em movimentacoes_estoque
ALTER TABLE public.movimentacoes_estoque 
ADD COLUMN nfe_id UUID REFERENCES public.importacoes_nfe(id);

-- Enable RLS
ALTER TABLE public.importacoes_nfe ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (sem auth por enquanto)
CREATE POLICY "Allow all operations on importacoes_nfe" 
ON public.importacoes_nfe 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_importacoes_nfe_updated_at
BEFORE UPDATE ON public.importacoes_nfe
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index para busca por chave de acesso
CREATE INDEX idx_importacoes_nfe_chave ON public.importacoes_nfe(chave_acesso);