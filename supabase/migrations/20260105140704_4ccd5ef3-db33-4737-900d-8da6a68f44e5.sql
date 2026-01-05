-- Dropar o índice parcial existente
DROP INDEX IF EXISTS idx_conversas_message_id;

-- Criar um constraint único real para message_id (não parcial)
ALTER TABLE conversas_whatsapp 
ADD CONSTRAINT conversas_whatsapp_message_id_unique UNIQUE (message_id);