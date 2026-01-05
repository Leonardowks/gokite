-- Criar bucket para mídias do WhatsApp
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Política para qualquer usuário autenticado fazer upload
CREATE POLICY "Authenticated users can upload media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-media');

-- Política para leitura pública
CREATE POLICY "Public read access for whatsapp media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Política para deletar próprios arquivos
CREATE POLICY "Users can delete own media"
ON storage.objects
FOR DELETE
USING (bucket_id = 'whatsapp-media');