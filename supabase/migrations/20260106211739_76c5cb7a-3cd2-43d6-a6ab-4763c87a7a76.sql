-- ============================================
-- TRIGGER: Cálculo Automático de Lucro Líquido
-- ============================================

-- 1. Criar função que calcula os detalhes financeiros
CREATE OR REPLACE FUNCTION public.calcular_detalhes_transacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  config_row RECORD;
  taxa_cartao_percent NUMERIC := 0;
  taxa_imposto_percent NUMERIC := 6;
  taxa_pix_percent NUMERIC := 0;
  taxas_json JSONB;
BEGIN
  -- Buscar configuração financeira
  SELECT taxas_cartao, taxa_imposto_padrao, taxa_pix
  INTO taxas_json, taxa_imposto_percent, taxa_pix_percent
  FROM public.config_financeiro
  LIMIT 1;

  -- Se não encontrar config, usar defaults
  IF taxas_json IS NULL THEN
    taxas_json := '{"debito": 1.99, "credito_1x": 3.5, "credito_2x_6x": 4.9, "credito_7x_12x": 12.5}'::jsonb;
  END IF;
  IF taxa_imposto_percent IS NULL THEN
    taxa_imposto_percent := 6;
  END IF;
  IF taxa_pix_percent IS NULL THEN
    taxa_pix_percent := 0;
  END IF;

  -- Determinar taxa de cartão baseado na forma de pagamento e parcelas
  CASE NEW.forma_pagamento
    WHEN 'dinheiro' THEN
      taxa_cartao_percent := 0;
    WHEN 'pix' THEN
      taxa_cartao_percent := taxa_pix_percent;
    WHEN 'trade_in' THEN
      taxa_cartao_percent := 0;
    WHEN 'cartao_debito' THEN
      taxa_cartao_percent := COALESCE((taxas_json->>'debito')::NUMERIC, 1.99);
    WHEN 'cartao_credito' THEN
      -- Lógica de parcelamento
      IF COALESCE(NEW.parcelas, 1) <= 1 THEN
        taxa_cartao_percent := COALESCE((taxas_json->>'credito_1x')::NUMERIC, 3.5);
      ELSIF NEW.parcelas <= 6 THEN
        taxa_cartao_percent := COALESCE((taxas_json->>'credito_2x_6x')::NUMERIC, 4.9);
      ELSE
        taxa_cartao_percent := COALESCE((taxas_json->>'credito_7x_12x')::NUMERIC, 12.5);
      END IF;
    ELSE
      taxa_cartao_percent := 0;
  END CASE;

  -- Calcular valores para RECEITAS
  IF NEW.tipo = 'receita' THEN
    NEW.taxa_cartao_estimada := ROUND(NEW.valor_bruto * (taxa_cartao_percent / 100), 2);
    NEW.imposto_provisionado := ROUND(NEW.valor_bruto * (taxa_imposto_percent / 100), 2);
    NEW.lucro_liquido := ROUND(
      NEW.valor_bruto 
      - COALESCE(NEW.custo_produto, 0) 
      - NEW.taxa_cartao_estimada 
      - NEW.imposto_provisionado, 
      2
    );
  ELSE
    -- Para DESPESAS: lucro é negativo, sem taxas de cartão
    NEW.taxa_cartao_estimada := 0;
    NEW.imposto_provisionado := 0;
    NEW.lucro_liquido := -NEW.valor_bruto;
  END IF;

  -- Garantir defaults
  NEW.custo_produto := COALESCE(NEW.custo_produto, 0);
  NEW.parcelas := COALESCE(NEW.parcelas, 1);

  RETURN NEW;
END;
$$;

-- 2. Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_calcular_transacao ON public.transacoes;

-- 3. Criar trigger BEFORE INSERT OR UPDATE
CREATE TRIGGER trigger_calcular_transacao
  BEFORE INSERT OR UPDATE ON public.transacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_detalhes_transacao();

-- 4. Adicionar comentário explicativo
COMMENT ON FUNCTION public.calcular_detalhes_transacao() IS 
'Calcula automaticamente taxa_cartao_estimada, imposto_provisionado e lucro_liquido 
baseado nas configurações de config_financeiro e na forma de pagamento/parcelas da transação.';