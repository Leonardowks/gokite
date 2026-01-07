-- Tabela para regras fiscais por categoria de receita
CREATE TABLE public.tax_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL UNIQUE,
  label text NOT NULL,
  estimated_tax_rate numeric NOT NULL DEFAULT 6.0,
  card_fee_rate numeric NOT NULL DEFAULT 3.5,
  description text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-tenant app)
CREATE POLICY "Allow all operations on tax_rules" 
ON public.tax_rules 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_tax_rules_updated_at
  BEFORE UPDATE ON public.tax_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir regras padrão por categoria
INSERT INTO public.tax_rules (category, label, estimated_tax_rate, card_fee_rate, description, icon) VALUES
  ('aula', 'Aulas / Serviços', 6.0, 3.5, 'Aulas de kite, wing, foil e outros serviços prestados', 'GraduationCap'),
  ('venda_produto', 'Produto Novo', 8.0, 4.5, 'Venda de equipamentos novos (kites, pranchas, etc.)', 'ShoppingBag'),
  ('venda_usado', 'Produto Usado', 4.0, 3.5, 'Venda de equipamentos seminovos e trade-ins', 'Package'),
  ('aluguel', 'Aluguel de Equipamentos', 6.0, 3.5, 'Locação de kites, pranchas e acessórios', 'Home'),
  ('pousada', 'Hospedagem / Pousada', 5.0, 4.0, 'Diárias e pacotes de hospedagem', 'Bed'),
  ('ecommerce', 'E-commerce', 8.0, 5.0, 'Vendas online com frete e processamento', 'Globe'),
  ('pacote', 'Pacotes de Aulas', 6.0, 4.5, 'Pacotes de horas com desconto', 'Package'),
  ('trade_in', 'Trade-in', 3.0, 2.0, 'Equipamentos recebidos em troca', 'RefreshCw')
ON CONFLICT (category) DO NOTHING;