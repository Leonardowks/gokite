-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all operations on contatos_inteligencia" ON public.contatos_inteligencia;
DROP POLICY IF EXISTS "Allow all operations on conversas_whatsapp" ON public.conversas_whatsapp;

-- Create new PERMISSIVE policies for contatos_inteligencia
CREATE POLICY "Allow public read on contatos_inteligencia" 
ON public.contatos_inteligencia 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on contatos_inteligencia" 
ON public.contatos_inteligencia 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update on contatos_inteligencia" 
ON public.contatos_inteligencia 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete on contatos_inteligencia" 
ON public.contatos_inteligencia 
FOR DELETE 
USING (true);

-- Create new PERMISSIVE policies for conversas_whatsapp
CREATE POLICY "Allow public read on conversas_whatsapp" 
ON public.conversas_whatsapp 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on conversas_whatsapp" 
ON public.conversas_whatsapp 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update on conversas_whatsapp" 
ON public.conversas_whatsapp 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete on conversas_whatsapp" 
ON public.conversas_whatsapp 
FOR DELETE 
USING (true);