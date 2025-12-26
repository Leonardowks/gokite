import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AulaSupabase {
  id: string;
  cliente_id: string;
  tipo: string;
  local: string;
  data: string;
  hora: string;
  instrutor: string;
  preco: number;
  status: string | null;
  pacote_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  cliente?: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
  };
}

export interface AulaInsert {
  cliente_id: string;
  tipo: string;
  local: string;
  data: string;
  hora: string;
  instrutor: string;
  preco: number;
  status?: string;
  pacote_id?: string;
}

export interface AulaUpdate {
  tipo?: string;
  local?: string;
  data?: string;
  hora?: string;
  instrutor?: string;
  preco?: number;
  status?: string;
  pacote_id?: string;
}

/**
 * Hook para listar aulas com detalhes do cliente
 */
export function useAulasListagem(filters?: {
  status?: string;
  local?: string;
  searchTerm?: string;
}) {
  return useQuery({
    queryKey: ['aulas-listagem', filters],
    queryFn: async () => {
      let query = supabase
        .from('aulas')
        .select(`
          id, cliente_id, tipo, local, data, hora, instrutor, preco, status, pacote_id, created_at, updated_at,
          clientes!aulas_cliente_id_fkey(id, nome, email, telefone)
        `)
        .order('data', { ascending: true });

      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }

      if (filters?.local && filters.local !== 'todos') {
        query = query.eq('local', filters.local);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to match interface
      let aulas = (data || []).map((item: any) => ({
        ...item,
        cliente: item.clientes,
      })) as AulaSupabase[];

      // Filter by search term (client name)
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        aulas = aulas.filter(a => 
          a.cliente?.nome?.toLowerCase().includes(term)
        );
      }

      return aulas;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para estatísticas de aulas
 */
export function useAulasStats() {
  return useQuery({
    queryKey: ['aulas-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas')
        .select('id, preco, status');

      if (error) throw error;

      const aulas = data || [];

      return {
        total: aulas.length,
        pendentes: aulas.filter(a => a.status === 'pendente' || a.status === 'agendada').length,
        confirmadas: aulas.filter(a => a.status === 'confirmada').length,
        canceladas: aulas.filter(a => a.status === 'cancelada').length,
        receitaConfirmada: aulas
          .filter(a => a.status === 'confirmada')
          .reduce((sum, a) => sum + (a.preco || 0), 0),
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para criar nova aula + transação automática
 */
export function useCreateAula() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aula: AulaInsert) => {
      const { data, error } = await supabase
        .from('aulas')
        .insert({ ...aula, status: aula.status || 'agendada' })
        .select(`
          id, cliente_id, tipo, local, data, hora, instrutor, preco, status,
          clientes!aulas_cliente_id_fkey(id, nome)
        `)
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-stats'] });
    },
  });
}

/**
 * Hook para atualizar aula - cria transação automática ao confirmar
 */
export function useUpdateAula() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AulaUpdate & { id: string }) => {
      // Get current aula first
      const { data: aulaAtual } = await supabase
        .from('aulas')
        .select(`
          id, cliente_id, tipo, local, data, hora, preco, status,
          clientes!aulas_cliente_id_fkey(id, nome)
        `)
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('aulas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Se mudou para confirmada, criar transação automática
      if (updates.status === 'confirmada' && aulaAtual?.status !== 'confirmada') {
        const clienteNome = (aulaAtual as any)?.clientes?.nome || 'Cliente';
        
        // Get config for tax rates
        const { data: config } = await supabase
          .from('config_financeiro')
          .select('*')
          .limit(1)
          .single();

        const taxaImposto = config?.taxa_imposto_padrao || 6;
        const valorBruto = aulaAtual?.preco || updates.preco || 0;
        const impostoProvisionado = (valorBruto * taxaImposto) / 100;
        const lucroLiquido = valorBruto - impostoProvisionado;

        await supabase.from('transacoes').insert({
          tipo: 'receita',
          origem: 'aulas',
          descricao: `Aula ${aulaAtual?.tipo || updates.tipo} - ${clienteNome}`,
          valor_bruto: valorBruto,
          custo_produto: 0,
          taxa_cartao_estimada: 0,
          imposto_provisionado: impostoProvisionado,
          lucro_liquido: lucroLiquido,
          centro_de_custo: 'Escola',
          forma_pagamento: 'pix',
          cliente_id: aulaAtual?.cliente_id,
          referencia_id: id,
        });

        // Invalidate transacoes queries
        queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-stats'] });
    },
  });
}

/**
 * Hook para deletar aula
 */
export function useDeleteAula() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('aulas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-stats'] });
    },
  });
}
