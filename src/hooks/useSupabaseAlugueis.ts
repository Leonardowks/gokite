import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AluguelComDetalhes {
  id: string;
  cliente_id: string;
  equipamento_id: string;
  data_inicio: string;
  data_fim: string;
  valor: number;
  status: string | null;
  condicao_devolucao: string | null;
  danos_registrados: string | null;
  created_at: string | null;
  cliente?: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
  };
  equipamento?: {
    id: string;
    nome: string;
    tipo: string;
    tamanho: string | null;
  };
}

/**
 * Hook para listar aluguéis com detalhes de cliente e equipamento
 */
export function useAlugueisListagem(filters?: {
  status?: string;
  searchTerm?: string;
}) {
  return useQuery({
    queryKey: ['alugueis-listagem', filters],
    queryFn: async () => {
      let query = supabase
        .from('aluguel')
        .select(`
          id, cliente_id, equipamento_id, data_inicio, data_fim, valor, status, condicao_devolucao, danos_registrados, created_at,
          clientes!aluguel_cliente_id_fkey(id, nome, email, telefone),
          equipamentos!aluguel_equipamento_id_fkey(id, nome, tipo, tamanho)
        `)
        .order('data_inicio', { ascending: false });

      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to match interface
      return (data || []).map((item: any) => ({
        ...item,
        cliente: item.clientes,
        equipamento: item.equipamentos,
      })) as AluguelComDetalhes[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para aluguéis ativos (com countdown)
 */
export function useAlugueisAtivos() {
  return useQuery({
    queryKey: ['alugueis-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aluguel')
        .select(`
          id, cliente_id, equipamento_id, data_inicio, data_fim, valor, status,
          clientes!aluguel_cliente_id_fkey(id, nome),
          equipamentos!aluguel_equipamento_id_fkey(id, nome, tipo, tamanho)
        `)
        .eq('status', 'ativo')
        .order('data_fim', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        cliente: item.clientes,
        equipamento: item.equipamentos,
      }));
    },
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook para estatísticas de aluguel
 */
export function useAlugueisStats() {
  return useQuery({
    queryKey: ['alugueis-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aluguel')
        .select('id, valor, status, data_inicio');

      if (error) throw error;

      const now = new Date();
      const mesAtual = now.getMonth();
      const anoAtual = now.getFullYear();

      const stats = (data || []).reduce((acc, aluguel) => {
        const dataInicio = new Date(aluguel.data_inicio);
        const isMesAtual = dataInicio.getMonth() === mesAtual && dataInicio.getFullYear() === anoAtual;

        acc.total++;
        if (aluguel.status === 'ativo') acc.ativos++;
        if (aluguel.status === 'finalizado') acc.finalizados++;
        if (isMesAtual) {
          acc.receitaMes += Number(aluguel.valor) || 0;
          acc.aluguesMes++;
        }

        return acc;
      }, { total: 0, ativos: 0, finalizados: 0, receitaMes: 0, aluguesMes: 0 });

      return stats;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para criar novo aluguel
 */
export function useCreateAluguel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aluguel: {
      cliente_id: string;
      equipamento_id: string;
      data_inicio: string;
      data_fim: string;
      valor: number;
    }) => {
      const { data, error } = await supabase
        .from('aluguel')
        .insert({ ...aluguel, status: 'ativo' })
        .select()
        .single();

      if (error) throw error;

      // Atualizar status do equipamento para alugado
      await supabase
        .from('equipamentos')
        .update({ status: 'alugado' })
        .eq('id', aluguel.equipamento_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alugueis-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['alugueis-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['alugueis-stats'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-disponiveis'] });
    },
  });
}

/**
 * Hook para finalizar aluguel (devolução)
 */
export function useFinalizarAluguel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      equipamento_id,
      condicao_devolucao, 
      danos_registrados 
    }: {
      id: string;
      equipamento_id: string;
      condicao_devolucao?: string;
      danos_registrados?: string;
    }) => {
      const { data, error } = await supabase
        .from('aluguel')
        .update({ 
          status: 'finalizado', 
          condicao_devolucao,
          danos_registrados 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar status do equipamento para disponível
      await supabase
        .from('equipamentos')
        .update({ status: 'disponivel' })
        .eq('id', equipamento_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alugueis-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['alugueis-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['alugueis-stats'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-disponiveis'] });
    },
  });
}
