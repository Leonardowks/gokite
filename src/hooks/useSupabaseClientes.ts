import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 50;

// Tipo para cliente com dados agregados (compatível com a UI existente)
export interface ClienteComAulas {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: string | null;
  tags: string[] | null;
  store_credit: number;
  created_at: string | null;
  total_aulas: number;
  ultima_aula: string | null;
}

/**
 * Hook otimizado para listagem de clientes COM dados de aulas
 * Usa select específico para economizar dados + join com aulas
 */
export function useClientesListagem(searchTerm?: string) {
  return useQuery({
    queryKey: ['clientes-listagem', searchTerm],
    queryFn: async (): Promise<ClienteComAulas[]> => {
      // Buscar clientes
      let query = supabase
        .from('clientes')
        .select('id, nome, email, telefone, status, tags, store_credit, created_at')
        .order('nome', { ascending: true });

      if (searchTerm && searchTerm.trim()) {
        query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
      }

      const { data: clientes, error } = await query.limit(1000);
      if (error) throw error;
      if (!clientes || clientes.length === 0) return [];

      // Buscar aulas para agregar dados
      const clienteIds = clientes.map(c => c.id);
      const { data: aulas, error: aulasError } = await supabase
        .from('aulas')
        .select('cliente_id, data')
        .in('cliente_id', clienteIds);

      if (aulasError) throw aulasError;

      // Agregar dados de aulas por cliente
      const aulasMap = new Map<string, { total: number; ultima: string | null }>();
      
      (aulas || []).forEach(aula => {
        const existing = aulasMap.get(aula.cliente_id) || { total: 0, ultima: null };
        existing.total++;
        if (!existing.ultima || aula.data > existing.ultima) {
          existing.ultima = aula.data;
        }
        aulasMap.set(aula.cliente_id, existing);
      });

      // Combinar clientes com dados de aulas
      return clientes.map(cliente => ({
        ...cliente,
        total_aulas: aulasMap.get(cliente.id)?.total || 0,
        ultima_aula: aulasMap.get(cliente.id)?.ultima || null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook com Infinite Scroll para grandes listas
 */
export function useClientesInfinite(searchTerm?: string) {
  return useInfiniteQuery({
    queryKey: ['clientes-infinite', searchTerm],
    queryFn: async ({ pageParam = 0 }): Promise<ClienteComAulas[]> => {
      let query = supabase
        .from('clientes')
        .select('id, nome, email, telefone, status, tags, store_credit, created_at')
        .order('nome', { ascending: true })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (searchTerm && searchTerm.trim()) {
        query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
      }

      const { data: clientes, error } = await query;
      if (error) throw error;
      if (!clientes || clientes.length === 0) return [];

      // Buscar aulas para agregar
      const clienteIds = clientes.map(c => c.id);
      const { data: aulas } = await supabase
        .from('aulas')
        .select('cliente_id, data')
        .in('cliente_id', clienteIds);

      const aulasMap = new Map<string, { total: number; ultima: string | null }>();
      (aulas || []).forEach(aula => {
        const existing = aulasMap.get(aula.cliente_id) || { total: 0, ultima: null };
        existing.total++;
        if (!existing.ultima || aula.data > existing.ultima) {
          existing.ultima = aula.data;
        }
        aulasMap.set(aula.cliente_id, existing);
      });

      return clientes.map(cliente => ({
        ...cliente,
        total_aulas: aulasMap.get(cliente.id)?.total || 0,
        ultima_aula: aulasMap.get(cliente.id)?.ultima || null,
      }));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para detalhes completos de um cliente
 */
export function useClienteDetalhes(clienteId: string | null) {
  return useQuery({
    queryKey: ['cliente-detalhes', clienteId],
    queryFn: async () => {
      if (!clienteId) return null;

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para criar novo cliente
 */
export function useCreateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cliente: { nome: string; email: string; telefone?: string; status?: string; tags?: string[] }) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert(cliente)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-count'] });
    },
  });
}

/**
 * Hook para atualizar cliente
 */
export function useUpdateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; nome?: string; email?: string; telefone?: string; status?: string; tags?: string[] }) => {
      const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientes-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['cliente-detalhes', data.id] });
    },
  });
}

/**
 * Hook para deletar cliente
 */
export function useDeleteCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clienteId: string) => {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-count'] });
    },
  });
}

/**
 * Hook para contar total de clientes
 */
export function useClientesCount(searchTerm?: string) {
  return useQuery({
    queryKey: ['clientes-count', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });

      if (searchTerm && searchTerm.trim()) {
        query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });
}
