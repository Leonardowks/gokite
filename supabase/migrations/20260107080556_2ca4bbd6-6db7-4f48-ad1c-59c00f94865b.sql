-- Adicionar campos estruturados para classificação de trade-ins
ALTER TABLE trade_ins ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE trade_ins ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE trade_ins ADD COLUMN IF NOT EXISTS modelo TEXT;
ALTER TABLE trade_ins ADD COLUMN IF NOT EXISTS tamanho TEXT;
ALTER TABLE trade_ins ADD COLUMN IF NOT EXISTS ano INTEGER;
ALTER TABLE trade_ins ADD COLUMN IF NOT EXISTS condicao TEXT DEFAULT 'usado_bom';

-- Galeria de fotos (array de URLs em JSONB)
ALTER TABLE trade_ins ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]';

-- Comentários para documentação
COMMENT ON COLUMN trade_ins.categoria IS 'kite, prancha, wing, barra, trapezio, wetsuit, acessorio';
COMMENT ON COLUMN trade_ins.condicao IS 'novo, seminovo, usado_bom, usado_regular, desgastado';
COMMENT ON COLUMN trade_ins.fotos IS 'Array de URLs das fotos do equipamento';