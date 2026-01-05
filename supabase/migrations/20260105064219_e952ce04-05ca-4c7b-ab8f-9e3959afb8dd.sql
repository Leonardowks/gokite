-- Adicionar campo remote_jid para armazenar JID completo do WhatsApp
ALTER TABLE contatos_inteligencia 
ADD COLUMN IF NOT EXISTS remote_jid TEXT;

-- Índice único para remote_jid (quando não nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contatos_remote_jid 
ON contatos_inteligencia(remote_jid) 
WHERE remote_jid IS NOT NULL;

-- Tabela para tracking de jobs de sincronização
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'contacts', 'messages', 'full'
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'em_andamento', 'concluido', 'erro', 'cancelado'
  progresso_atual INTEGER DEFAULT 0,
  progresso_total INTEGER DEFAULT 0,
  chats_processados INTEGER DEFAULT 0,
  contatos_criados INTEGER DEFAULT 0,
  contatos_atualizados INTEGER DEFAULT 0,
  mensagens_criadas INTEGER DEFAULT 0,
  mensagens_puladas INTEGER DEFAULT 0,
  erros INTEGER DEFAULT 0,
  logs JSONB DEFAULT '[]'::jsonb,
  resultado JSONB,
  erro TEXT,
  iniciado_em TIMESTAMP WITH TIME ZONE,
  concluido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para sync_jobs
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on sync_jobs" 
ON sync_jobs FOR ALL 
USING (true) 
WITH CHECK (true);

-- Realtime para sync_jobs (para atualização em tempo real no frontend)
ALTER PUBLICATION supabase_realtime ADD TABLE sync_jobs;