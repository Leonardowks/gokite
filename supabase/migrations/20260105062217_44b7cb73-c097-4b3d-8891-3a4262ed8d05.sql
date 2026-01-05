-- Tabela de configuração da Evolution API
CREATE TABLE public.evolution_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL UNIQUE,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  webhook_url TEXT,
  status TEXT DEFAULT 'desconectado',
  qrcode_base64 TEXT,
  numero_conectado TEXT,
  eventos_ativos TEXT[] DEFAULT ARRAY['MESSAGES_UPSERT', 'CONTACTS_UPSERT'],
  ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
  total_mensagens_sync INTEGER DEFAULT 0,
  total_contatos_sync INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para evolution_config
ALTER TABLE public.evolution_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on evolution_config" 
ON public.evolution_config 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_evolution_config_updated_at
BEFORE UPDATE ON public.evolution_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Expandir conversas_whatsapp com campos da Evolution
ALTER TABLE public.conversas_whatsapp 
ADD COLUMN IF NOT EXISTS message_id TEXT,
ADD COLUMN IF NOT EXISTS instance_name TEXT,
ADD COLUMN IF NOT EXISTS is_from_me BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS message_status TEXT,
ADD COLUMN IF NOT EXISTS quoted_message_id TEXT,
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_mimetype TEXT,
ADD COLUMN IF NOT EXISTS push_name TEXT;

-- Índice para message_id (busca rápida e evitar duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversas_message_id 
ON public.conversas_whatsapp(message_id) 
WHERE message_id IS NOT NULL;

-- Expandir contatos_inteligencia com campos do WhatsApp
ALTER TABLE public.contatos_inteligencia 
ADD COLUMN IF NOT EXISTS evolution_contact_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_profile_name TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_profile_picture TEXT,
ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Índice para busca por telefone normalizado
CREATE INDEX IF NOT EXISTS idx_contatos_telefone 
ON public.contatos_inteligencia(telefone);

-- Tabela de fila para análise em background
CREATE TABLE public.analise_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id UUID REFERENCES public.contatos_inteligencia(id) ON DELETE CASCADE,
  prioridade INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  tentativas INTEGER DEFAULT 0,
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.analise_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on analise_queue" 
ON public.analise_queue 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Habilitar Realtime para conversas_whatsapp
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas_whatsapp;