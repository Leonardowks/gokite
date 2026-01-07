
-- Atualizar função de cálculo para usar tax_rules por categoria
CREATE OR REPLACE FUNCTION public.calcular_detalhes_transacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  config_row RECORD;
  tax_rule_row RECORD;
  taxa_cartao_percent NUMERIC := 0;
  taxa_imposto_percent NUMERIC := 6;
  taxa_pix_percent NUMERIC := 0;
  taxas_json JSONB;
  categoria_fiscal TEXT;
BEGIN
  -- Mapear origem da transação para categoria fiscal
  CASE NEW.origem
    WHEN 'aula' THEN categoria_fiscal := 'servico_aula';
    WHEN 'pacote' THEN categoria_fiscal := 'servico_aula';
    WHEN 'aluguel' THEN categoria_fiscal := 'servico_aula';
    WHEN 'venda_produto' THEN categoria_fiscal := 'produto_novo';
    WHEN 'ecommerce' THEN categoria_fiscal := 'produto_novo';
    WHEN 'trade_in' THEN categoria_fiscal := 'produto_usado';
    ELSE categoria_fiscal := 'servico_aula'; -- Default
  END CASE;

  -- Buscar regra fiscal específica da categoria
  SELECT estimated_tax_rate, card_fee_rate
  INTO tax_rule_row
  FROM public.tax_rules
  WHERE category = categoria_fiscal AND is_active = true
  LIMIT 1;

  -- Se encontrou regra específica, usar ela
  IF tax_rule_row IS NOT NULL THEN
    taxa_imposto_percent := COALESCE(tax_rule_row.estimated_tax_rate, 6);
  END IF;

  -- Buscar configuração financeira para taxas de cartão
  SELECT taxas_cartao, taxa_pix
  INTO taxas_json, taxa_pix_percent
  FROM public.config_financeiro
  LIMIT 1;

  -- Se não encontrar config, usar defaults
  IF taxas_json IS NULL THEN
    taxas_json := '{"debito": 1.99, "credito_1x": 3.5, "credito_2x_6x": 4.9, "credito_7x_12x": 12.5}'::jsonb;
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
$function$;
