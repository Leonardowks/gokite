-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de pacotes
CREATE TABLE IF NOT EXISTS public.pacotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo_pacote TEXT NOT NULL,
  horas_total INTEGER NOT NULL CHECK (horas_total > 0),
  horas_usadas INTEGER DEFAULT 0 CHECK (horas_usadas >= 0),
  data_inicio DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  valor_pago NUMERIC(10, 2) NOT NULL CHECK (valor_pago >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de aulas
CREATE TABLE IF NOT EXISTS public.aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  instrutor TEXT NOT NULL,
  local TEXT NOT NULL,
  status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada', 'concluida', 'cancelada')),
  preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
  pacote_id UUID REFERENCES public.pacotes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de equipamentos
CREATE TABLE IF NOT EXISTS public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  tamanho TEXT,
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'alugado', 'manutencao')),
  preco_aluguel_dia NUMERIC(10, 2) NOT NULL CHECK (preco_aluguel_dia >= 0),
  localizacao TEXT,
  data_proxima_manutencao DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de aluguel
CREATE TABLE IF NOT EXISTS public.aluguel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  valor NUMERIC(10, 2) NOT NULL CHECK (valor >= 0),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
  condicao_devolucao TEXT,
  danos_registrados TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de pedidos e-commerce
CREATE TABLE IF NOT EXISTS public.pedidos_ecommerce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data_pedido TIMESTAMP WITH TIME ZONE DEFAULT now(),
  itens JSONB NOT NULL,
  valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total >= 0),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'enviado', 'entregue', 'cancelado')),
  endereco_entrega TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aluguel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_ecommerce ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Acesso público para leitura (pode ser ajustado depois com autenticação)
CREATE POLICY "Permitir leitura para todos" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para todos" ON public.clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização para todos" ON public.clientes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão para todos" ON public.clientes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura para todos" ON public.pacotes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para todos" ON public.pacotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização para todos" ON public.pacotes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão para todos" ON public.pacotes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura para todos" ON public.aulas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para todos" ON public.aulas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização para todos" ON public.aulas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão para todos" ON public.aulas FOR DELETE USING (true);

CREATE POLICY "Permitir leitura para todos" ON public.equipamentos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para todos" ON public.equipamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização para todos" ON public.equipamentos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão para todos" ON public.equipamentos FOR DELETE USING (true);

CREATE POLICY "Permitir leitura para todos" ON public.aluguel FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para todos" ON public.aluguel FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização para todos" ON public.aluguel FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão para todos" ON public.aluguel FOR DELETE USING (true);

CREATE POLICY "Permitir leitura para todos" ON public.pedidos_ecommerce FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para todos" ON public.pedidos_ecommerce FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização para todos" ON public.pedidos_ecommerce FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão para todos" ON public.pedidos_ecommerce FOR DELETE USING (true);

-- Criar função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pacotes_updated_at BEFORE UPDATE ON public.pacotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aulas_updated_at BEFORE UPDATE ON public.aulas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aluguel_updated_at BEFORE UPDATE ON public.aluguel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_ecommerce_updated_at BEFORE UPDATE ON public.pedidos_ecommerce
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para melhorar performance
CREATE INDEX idx_clientes_email ON public.clientes(email);
CREATE INDEX idx_clientes_status ON public.clientes(status);
CREATE INDEX idx_aulas_cliente_id ON public.aulas(cliente_id);
CREATE INDEX idx_aulas_data ON public.aulas(data);
CREATE INDEX idx_aulas_status ON public.aulas(status);
CREATE INDEX idx_pacotes_cliente_id ON public.pacotes(cliente_id);
CREATE INDEX idx_equipamentos_status ON public.equipamentos(status);
CREATE INDEX idx_aluguel_cliente_id ON public.aluguel(cliente_id);
CREATE INDEX idx_aluguel_equipamento_id ON public.aluguel(equipamento_id);
CREATE INDEX idx_aluguel_status ON public.aluguel(status);
CREATE INDEX idx_pedidos_ecommerce_cliente_id ON public.pedidos_ecommerce(cliente_id);
CREATE INDEX idx_pedidos_ecommerce_status ON public.pedidos_ecommerce(status);