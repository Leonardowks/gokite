-- Add lida (read) field to conversas_whatsapp for tracking unread messages
ALTER TABLE public.conversas_whatsapp 
ADD COLUMN IF NOT EXISTS lida boolean NOT NULL DEFAULT false;

-- Create index for faster unread queries
CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_lida 
ON public.conversas_whatsapp(lida) 
WHERE lida = false;

-- Create index for contato + lida queries
CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_contato_lida 
ON public.conversas_whatsapp(contato_id, lida);