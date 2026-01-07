import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaxRule {
  id: string;
  category: string;
  label: string;
  estimated_tax_rate: number;
  card_fee_rate: number;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxRuleUpdate {
  estimated_tax_rate?: number;
  card_fee_rate?: number;
  is_active?: boolean;
}

// Hook para buscar todas as regras fiscais
export function useTaxRules() {
  return useQuery({
    queryKey: ["tax-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_rules")
        .select("*")
        .order("label", { ascending: true });

      if (error) throw error;
      return data as TaxRule[];
    },
  });
}

// Hook para buscar regra por categoria
export function useTaxRuleByCategory(category: string | null) {
  return useQuery({
    queryKey: ["tax-rules", category],
    queryFn: async () => {
      if (!category) return null;
      const { data, error } = await supabase
        .from("tax_rules")
        .select("*")
        .eq("category", category)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data as TaxRule;
    },
    enabled: !!category,
  });
}

// Hook para atualizar uma regra fiscal
export function useUpdateTaxRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaxRuleUpdate }) => {
      const { data, error } = await supabase
        .from("tax_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as TaxRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] });
    },
  });
}

// Helper para obter taxa por categoria (usado em transações)
export async function getTaxRateByCategory(category: string): Promise<{ taxRate: number; cardFee: number }> {
  const { data, error } = await supabase
    .from("tax_rules")
    .select("estimated_tax_rate, card_fee_rate")
    .eq("category", category)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    // Valores padrão se não encontrar
    return { taxRate: 6.0, cardFee: 3.5 };
  }

  return {
    taxRate: data.estimated_tax_rate,
    cardFee: data.card_fee_rate,
  };
}
