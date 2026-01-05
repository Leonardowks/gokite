-- Tabela para armazenar conversas do WhatsApp
CREATE TABLE public.conversas_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id UUID REFERENCES contatos_inteligencia(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  telefone TEXT NOT NULL,
  data_mensagem TIMESTAMP WITH TIME ZONE NOT NULL,
  remetente TEXT NOT NULL CHECK (remetente IN ('cliente', 'empresa')),
  conteudo TEXT NOT NULL,
  tipo_midia TEXT DEFAULT 'texto',
  sentimento TEXT,
  intencao TEXT,
  palavras_chave TEXT[],
  dados_extraidos JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_conversas_contato ON conversas_whatsapp(contato_id);
CREATE INDEX idx_conversas_telefone ON conversas_whatsapp(telefone);
CREATE INDEX idx_conversas_data ON conversas_whatsapp(data_mensagem DESC);
CREATE INDEX idx_conversas_intencao ON conversas_whatsapp(intencao);

-- Enable RLS
ALTER TABLE conversas_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on conversas_whatsapp"
ON conversas_whatsapp FOR ALL
USING (true)
WITH CHECK (true);

-- Tabela para insights agregados por contato
CREATE TABLE public.insights_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id UUID UNIQUE REFERENCES contatos_inteligencia(id) ON DELETE CASCADE,
  total_mensagens INTEGER DEFAULT 0,
  mensagens_enviadas INTEGER DEFAULT 0,
  mensagens_recebidas INTEGER DEFAULT 0,
  primeira_interacao TIMESTAMP WITH TIME ZONE,
  ultima_interacao TIMESTAMP WITH TIME ZONE,
  tempo_medio_resposta_minutos NUMERIC,
  horario_preferido TEXT,
  dia_preferido TEXT,
  sentimento_geral TEXT,
  principais_interesses TEXT[],
  objecoes_identificadas TEXT[],
  gatilhos_compra TEXT[],
  score_engajamento INTEGER DEFAULT 0,
  probabilidade_conversao NUMERIC,
  proxima_acao_sugerida TEXT,
  resumo_ia TEXT,
  ultima_analise TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE insights_conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on insights_conversas"
ON insights_conversas FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_insights_conversas_updated_at
BEFORE UPDATE ON insights_conversas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Expandir contatos_inteligencia com campos de insights
ALTER TABLE contatos_inteligencia 
ADD COLUMN IF NOT EXISTS conversas_analisadas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sentimento_predominante TEXT,
ADD COLUMN IF NOT EXISTS engajamento_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultima_mensagem TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tempo_resposta_medio_hrs NUMERIC,
ADD COLUMN IF NOT EXISTS objecoes TEXT[],
ADD COLUMN IF NOT EXISTS gatilhos TEXT[];