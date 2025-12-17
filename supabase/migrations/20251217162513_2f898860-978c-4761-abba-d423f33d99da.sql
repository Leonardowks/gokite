-- Índice para busca por nome de clientes (muito frequente na listagem)
CREATE INDEX IF NOT EXISTS idx_clientes_nome 
ON public.clientes USING btree (nome);

-- Índice para busca case-insensitive por nome (ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_clientes_nome_lower 
ON public.clientes USING btree (lower(nome));

-- Índice para busca por email de clientes
CREATE INDEX IF NOT EXISTS idx_clientes_email_lower 
ON public.clientes USING btree (lower(email));

-- Índice para filtro por localização de equipamentos (Floripa/Taíba)
CREATE INDEX IF NOT EXISTS idx_equipamentos_localizacao 
ON public.equipamentos USING btree (localizacao);

-- Índice para filtro por tipo de equipamento
CREATE INDEX IF NOT EXISTS idx_equipamentos_tipo 
ON public.equipamentos USING btree (tipo);

-- Índice para busca por nome de equipamento
CREATE INDEX IF NOT EXISTS idx_equipamentos_nome_lower 
ON public.equipamentos USING btree (lower(nome));