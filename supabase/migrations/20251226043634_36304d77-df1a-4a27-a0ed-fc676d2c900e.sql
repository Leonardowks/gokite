-- Create despesas table for expense tracking
CREATE TABLE public.despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  valor DECIMAL(10,2) NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outros',
  descricao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.despesas IS 'Tabela para registro de despesas operacionais';

-- Create index for common queries
CREATE INDEX idx_despesas_data ON public.despesas(data);
CREATE INDEX idx_despesas_categoria ON public.despesas(categoria);

-- Enable RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (since auth is temporarily disabled)
CREATE POLICY "Allow all operations on despesas" 
ON public.despesas 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_despesas_updated_at
BEFORE UPDATE ON public.despesas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();