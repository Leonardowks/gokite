import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook otimizado para listagem de equipamentos
 * Usa select específico para economizar dados
 */
export function useEquipamentosListagem(filters?: {
  localizacao?: string;
  tipo?: string;
  status?: string;
  searchTerm?: string;
}) {
  return useQuery({
    queryKey: ['equipamentos-listagem', filters],
    queryFn: async () => {
      let query = supabase
        .from('equipamentos')
        // ✅ Select específico - campos necessários para cards/listagem + gestão de estoque + sync Nuvemshop
        .select('id, nome, tipo, status, localizacao, preco_aluguel_dia, tamanho, ean, source_type, sale_price, cost_price, quantidade_fisica, quantidade_virtual_safe, nuvemshop_product_id, nuvemshop_variant_id, estoque_nuvemshop, ultima_sync_nuvemshop, sync_status, supplier_sku, prazo_entrega_dias')
        .order('nome', { ascending: true });

      // Filtros usando índices criados
      if (filters?.localizacao) {
        query = query.eq('localizacao', filters.localizacao);
      }
      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.searchTerm && filters.searchTerm.trim()) {
        query = query.ilike('nome', `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para detalhes completos de um equipamento
 * Usa select('*') porque precisa de todos os campos
 */
export function useEquipamentoDetalhes(equipamentoId: string | null) {
  return useQuery({
    queryKey: ['equipamento-detalhes', equipamentoId],
    queryFn: async () => {
      if (!equipamentoId) return null;

      const { data, error } = await supabase
        .from('equipamentos')
        // ✅ Página de detalhes/edição precisa de todos os campos
        .select('*')
        .eq('id', equipamentoId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!equipamentoId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para equipamentos disponíveis (para seleção em aluguéis)
 * Campos mínimos para dropdown
 */
export function useEquipamentosDisponiveis(localizacao?: string) {
  return useQuery({
    queryKey: ['equipamentos-disponiveis', localizacao],
    queryFn: async () => {
      let query = supabase
        .from('equipamentos')
        // ✅ Apenas campos necessários para dropdown de seleção
        .select('id, nome, tipo, tamanho, preco_aluguel_dia')
        .eq('status', 'disponivel')
        .order('tipo', { ascending: true })
        .order('nome', { ascending: true });

      if (localizacao) {
        query = query.eq('localizacao', localizacao);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minuto (dados mais voláteis)
  });
}

/**
 * Hook para estatísticas de ocupação por localização
 */
export function useEquipamentosOcupacao() {
  return useQuery({
    queryKey: ['equipamentos-ocupacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipamentos')
        // ✅ Apenas campos necessários para cálculo de ocupação
        .select('id, status, localizacao');

      if (error) throw error;

      // Calcular ocupação por localização
      const stats = (data || []).reduce((acc, eq) => {
        const loc = eq.localizacao || 'Sem localização';
        if (!acc[loc]) {
          acc[loc] = { total: 0, alugados: 0, disponiveis: 0, manutencao: 0 };
        }
        acc[loc].total++;
        if (eq.status === 'alugado') acc[loc].alugados++;
        else if (eq.status === 'disponivel') acc[loc].disponiveis++;
        else if (eq.status === 'manutencao') acc[loc].manutencao++;
        return acc;
      }, {} as Record<string, { total: number; alugados: number; disponiveis: number; manutencao: number }>);

      return stats;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para criar novo equipamento
 */
export function useCreateEquipamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipamento: { 
      nome: string; 
      tipo: string; 
      preco_aluguel_dia: number;
      tamanho?: string;
      localizacao?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('equipamentos')
        .insert(equipamento)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-ocupacao'] });
    },
  });
}

/**
 * Hook para atualizar equipamento
 */
export function useUpdateEquipamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string; 
      nome?: string; 
      tipo?: string; 
      preco_aluguel_dia?: number;
      tamanho?: string;
      localizacao?: string;
      status?: string;
      data_proxima_manutencao?: string;
    }) => {
      const { data, error } = await supabase
        .from('equipamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-ocupacao'] });
      queryClient.invalidateQueries({ queryKey: ['equipamento-detalhes', data.id] });
    },
  });
}

/**
 * Hook para deletar equipamento
 */
export function useDeleteEquipamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipamentoId: string) => {
      const { error } = await supabase
        .from('equipamentos')
        .delete()
        .eq('id', equipamentoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-ocupacao'] });
    },
  });
}
