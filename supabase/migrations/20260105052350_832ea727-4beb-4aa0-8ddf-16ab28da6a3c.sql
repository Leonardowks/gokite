-- Tabela principal para inteligência de contatos
CREATE TABLE public.contatos_inteligencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT UNIQUE NOT NULL,
  nome TEXT,
  email TEXT,
  
  -- Classificação IA
  status TEXT DEFAULT 'nao_classificado', -- nao_classificado, lead, cliente_ativo, cliente_inativo, invalido
  score_interesse INTEGER DEFAULT 0, -- 0-100
  dores_identificadas TEXT[] DEFAULT '{}', -- ['preco', 'distancia', 'horario', 'equipamento']
  interesse_principal TEXT, -- 'kite', 'wing', 'foil', 'aluguel', 'equipamento_usado'
  
  -- Histórico
  ultimo_contato TIMESTAMP WITH TIME ZONE,
  total_interacoes INTEGER DEFAULT 0,
  origem TEXT DEFAULT 'importacao', -- 'whatsapp', 'instagram', 'site', 'indicacao', 'importacao'
  
  -- Remarketing
  campanha_sugerida TEXT, -- 'reativacao', 'upsell', 'trade_in', 'indicacao'
  mensagem_personalizada TEXT,
  prioridade TEXT DEFAULT 'baixa', -- baixa, media, alta, urgente
  
  -- Vinculação CRM
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  
  -- Metadados
  dados_brutos JSONB DEFAULT '{}',
  resumo_ia TEXT,
  classificado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contatos_inteligencia ENABLE ROW LEVEL SECURITY;

-- Policy para permitir todas as operações
CREATE POLICY "Allow all operations on contatos_inteligencia"
ON public.contatos_inteligencia
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_contatos_inteligencia_updated_at
BEFORE UPDATE ON public.contatos_inteligencia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_contatos_inteligencia_status ON public.contatos_inteligencia(status);
CREATE INDEX idx_contatos_inteligencia_score ON public.contatos_inteligencia(score_interesse DESC);
CREATE INDEX idx_contatos_inteligencia_prioridade ON public.contatos_inteligencia(prioridade);
CREATE INDEX idx_contatos_inteligencia_cliente ON public.contatos_inteligencia(cliente_id);
CREATE INDEX idx_contatos_inteligencia_telefone ON public.contatos_inteligencia(telefone);

-- Tabela para campanhas salvas
CREATE TABLE public.campanhas_remarketing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  segmento_filtros JSONB NOT NULL DEFAULT '{}',
  template_mensagem TEXT,
  total_contatos INTEGER DEFAULT 0,
  status TEXT DEFAULT 'rascunho', -- rascunho, ativa, pausada, finalizada
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campanhas_remarketing ENABLE ROW LEVEL SECURITY;

-- Policy para permitir todas as operações
CREATE POLICY "Allow all operations on campanhas_remarketing"
ON public.campanhas_remarketing
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_campanhas_remarketing_updated_at
BEFORE UPDATE ON public.campanhas_remarketing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();