-- Adicionar colunas para rastreamento de sincronização Nuvemshop
ALTER TABLE equipamentos 
ADD COLUMN IF NOT EXISTS estoque_nuvemshop INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ultima_sync_nuvemshop TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN equipamentos.estoque_nuvemshop IS 'Estoque publicado na Nuvemshop (Físico + Virtual Seguro)';
COMMENT ON COLUMN equipamentos.ultima_sync_nuvemshop IS 'Timestamp da última sincronização com sucesso';
COMMENT ON COLUMN equipamentos.sync_status IS 'Status: synced, pending, error';