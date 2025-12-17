import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 50;

/**
 * Hook otimizado para listagem de clientes
 * Usa select específico para economizar dados
 */
export function useClientesListagem(searchTerm?: string) {
  return useQuery({
    queryKey: ['clientes-listagem', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        // ✅ Select específico - apenas campos necessários para listagem
        .select('id, nome, email, telefone, status, tags')
        .order('nome', { ascending: true });

      // Busca case-insensitive usando índice idx_clientes_nome_lower
      if (searchTerm && searchTerm.trim()) {
        query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook com Infinite Scroll para grandes listas
 * Carrega clientes em páginas de 50
 */
export function useClientesInfinite(searchTerm?: string) {
  return useInfiniteQuery({
    queryKey: ['clientes-infinite', searchTerm],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('clientes')
        .select('id, nome, email, telefone, status, tags')
        .order('nome', { ascending: true })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (searchTerm && searchTerm.trim()) {
        query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // Se última página tem menos que PAGE_SIZE, não há mais páginas
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para detalhes completos de um cliente
 * Usa select('*') porque precisa de todos os campos
 */
export function useClienteDetalhes(clienteId: string | null) {
  return useQuery({
    queryKey: ['cliente-detalhes', clienteId],
    queryFn: async () => {
      if (!clienteId) return null;

      const { data, error } = await supabase
        .from('clientes')
        // ✅ Aqui usa select('*') porque página de detalhes precisa de tudo
        .select('*')
        .eq('id', clienteId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
    staleTime: 2 * 60 * 1000, // 2 minutos
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
    },
  });
}

/**
 * Hook para contar total de clientes (para paginação)
 */
export function useClientesCount(searchTerm?: string) {
  return useQuery({
    queryKey: ['clientes-count', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });

      if (searchTerm && searchTerm.trim()) {
        query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });
}
