import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TaxRateResult {
  taxRate: number;
  cardFee: number;
}

// Map transaction origins to tax rule categories
const origemToCategoryMap: Record<string, string> = {
  aula: "aula",
  aulas: "aula",
  pacote: "pacote",
  aluguel: "aluguel",
  venda_produto: "venda_produto",
  ecommerce: "ecommerce",
  trade_in: "trade_in",
  pousada: "pousada",
  hospedagem: "pousada",
  manual: "aula", // Default to service
};

/**
 * Get tax rate for a specific transaction origin
 * This uses the tax_rules table to get category-specific rates
 */
export async function getTaxRateForOrigem(origem: string): Promise<TaxRateResult> {
  const category = origemToCategoryMap[origem] || "aula";
  
  const { data, error } = await supabase
    .from("tax_rules")
    .select("estimated_tax_rate, card_fee_rate")
    .eq("category", category)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    // Default values if not found
    return { taxRate: 6.0, cardFee: 3.5 };
  }

  return {
    taxRate: data.estimated_tax_rate,
    cardFee: data.card_fee_rate,
  };
}

/**
 * Hook to get all tax rules for preview calculations
 */
export function useTaxRulesMap() {
  return useQuery({
    queryKey: ["tax-rules-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_rules")
        .select("category, estimated_tax_rate, card_fee_rate")
        .eq("is_active", true);

      if (error) throw error;

      // Create a map for quick lookups
      const map: Record<string, TaxRateResult> = {};
      data.forEach((rule) => {
        map[rule.category] = {
          taxRate: rule.estimated_tax_rate,
          cardFee: rule.card_fee_rate,
        };
      });

      return map;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get tax rate from the map based on transaction origin
 */
export function getTaxRateFromMap(
  taxRulesMap: Record<string, TaxRateResult> | undefined,
  origem: string
): TaxRateResult {
  if (!taxRulesMap) {
    return { taxRate: 6.0, cardFee: 3.5 };
  }

  const category = origemToCategoryMap[origem] || "aula";
  return taxRulesMap[category] || { taxRate: 6.0, cardFee: 3.5 };
}
