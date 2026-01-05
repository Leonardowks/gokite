import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ContatoInteligencia {
  id: string;
  telefone: string;
  nome: string | null;
  email: string | null;
  status: string;
  score_interesse: number;
  dores_identificadas: string[];
  interesse_principal: string | null;
  ultimo_contato: string | null;
  total_interacoes: number;
  origem: string;
  campanha_sugerida: string | null;
  mensagem_personalizada: string | null;
  prioridade: string;
  cliente_id: string | null;
  dados_brutos: Record<string, unknown> | null;
  resumo_ia: string | null;
  classificado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContatoFiltros {
  status?: string;
  prioridade?: string;
  interesse?: string;
  dor?: string;
  campanha?: string;
  search?: string;
}

export interface EstatisticasContatos {
  total: number;
  por_status: Record<string, number>;
  por_interesse: Record<string, number>;
  por_dor: Record<string, number>;
  por_prioridade: Record<string, number>;
  por_campanha: Record<string, number>;
  nao_classificados: number;
}

// Query para listar contatos com filtros
export function useContatosInteligencia(filtros?: ContatoFiltros) {
  return useQuery({
    queryKey: ['contatos-inteligencia', filtros],
    queryFn: async () => {
      let query = supabase
        .from('contatos_inteligencia')
        .select('*')
        .order('score_interesse', { ascending: false })
        .order('created_at', { ascending: false });

      if (filtros?.status && filtros.status !== 'todos') {
        query = query.eq('status', filtros.status);
      }

      if (filtros?.prioridade && filtros.prioridade !== 'todas') {
        query = query.eq('prioridade', filtros.prioridade);
      }

      if (filtros?.interesse && filtros.interesse !== 'todos') {
        query = query.eq('interesse_principal', filtros.interesse);
      }

      if (filtros?.dor) {
        query = query.contains('dores_identificadas', [filtros.dor]);
      }

      if (filtros?.campanha && filtros.campanha !== 'todas') {
        query = query.eq('campanha_sugerida', filtros.campanha);
      }

      if (filtros?.search) {
        query = query.or(`nome.ilike.%${filtros.search}%,telefone.ilike.%${filtros.search}%,email.ilike.%${filtros.search}%`);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data as ContatoInteligencia[];
    },
  });
}

// Query para estatísticas
export function useEstatisticasContatos() {
  return useQuery({
    queryKey: ['contatos-estatisticas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contatos_inteligencia')
        .select('status, interesse_principal, dores_identificadas, prioridade, campanha_sugerida');

      if (error) throw error;

      const stats: EstatisticasContatos = {
        total: data?.length || 0,
        por_status: {},
        por_interesse: {},
        por_dor: {},
        por_prioridade: {},
        por_campanha: {},
        nao_classificados: 0,
      };

      data?.forEach((contato) => {
        // Por status
        const status = contato.status || 'nao_classificado';
        stats.por_status[status] = (stats.por_status[status] || 0) + 1;

        if (status === 'nao_classificado') {
          stats.nao_classificados++;
        }

        // Por interesse
        if (contato.interesse_principal) {
          stats.por_interesse[contato.interesse_principal] = 
            (stats.por_interesse[contato.interesse_principal] || 0) + 1;
        }

        // Por dor
        const dores = contato.dores_identificadas as string[] || [];
        dores.forEach((dor) => {
          stats.por_dor[dor] = (stats.por_dor[dor] || 0) + 1;
        });

        // Por prioridade
        if (contato.prioridade) {
          stats.por_prioridade[contato.prioridade] = 
            (stats.por_prioridade[contato.prioridade] || 0) + 1;
        }

        // Por campanha
        if (contato.campanha_sugerida) {
          stats.por_campanha[contato.campanha_sugerida] = 
            (stats.por_campanha[contato.campanha_sugerida] || 0) + 1;
        }
      });

      return stats;
    },
  });
}

// Mutation para importar contatos
export function useImportarContatos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contatos: Array<{ nome?: string; telefone: string; email?: string; origem?: string }>) => {
      const { data, error } = await supabase.functions.invoke('processar-importacao', {
        body: { contatos },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
      queryClient.invalidateQueries({ queryKey: ['contatos-estatisticas'] });
      toast({
        title: 'Importação concluída',
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro na importação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

// Mutation para classificar contatos com IA
export function useClassificarContatos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: { contatoIds?: string[]; batchSize?: number }) => {
      const { data, error } = await supabase.functions.invoke('classificar-contatos', {
        body: { 
          contatoIds: options?.contatoIds,
          batchSize: options?.batchSize || 500
        },
      });

      if (error) throw error;
      return data as { 
        message: string; 
        processed: number; 
        total: number; 
        remaining: number;
        error?: string;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
      queryClient.invalidateQueries({ queryKey: ['contatos-estatisticas'] });
      
      const remaining = data.remaining || 0;
      const description = remaining > 0 
        ? `${data.message}. Restam ${remaining} contatos para classificar.`
        : data.message;
      
      toast({
        title: 'Classificação concluída',
        description,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na classificação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Mutation para atualizar contato manualmente
export function useAtualizarContato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('contatos_inteligencia')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
      queryClient.invalidateQueries({ queryKey: ['contatos-estatisticas'] });
    },
  });
}

// Mutation para excluir contato
export function useExcluirContato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contatos_inteligencia')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
      queryClient.invalidateQueries({ queryKey: ['contatos-estatisticas'] });
      toast({
        title: 'Contato excluído',
      });
    },
  });
}

// Mutation para excluir vários contatos
export function useExcluirContatosEmLote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('contatos_inteligencia')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['contatos-inteligencia'] });
      queryClient.invalidateQueries({ queryKey: ['contatos-estatisticas'] });
      toast({
        title: `${ids.length} contatos excluídos`,
      });
    },
  });
}

// Hook para campanhas
export interface CampanhaRemarketing {
  id: string;
  nome: string;
  descricao: string | null;
  segmento_filtros: ContatoFiltros;
  template_mensagem: string | null;
  total_contatos: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useCampanhas() {
  return useQuery({
    queryKey: ['campanhas-remarketing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campanhas_remarketing')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CampanhaRemarketing[];
    },
  });
}

export function useCriarCampanha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campanha: { 
      nome: string; 
      descricao?: string | null; 
      segmento_filtros: Record<string, unknown>; 
      template_mensagem?: string | null; 
      total_contatos: number; 
      status: string;
    }) => {
      const { data, error } = await supabase
        .from('campanhas_remarketing')
        .insert({
          nome: campanha.nome,
          descricao: campanha.descricao || null,
          segmento_filtros: JSON.parse(JSON.stringify(campanha.segmento_filtros)),
          template_mensagem: campanha.template_mensagem || null,
          total_contatos: campanha.total_contatos,
          status: campanha.status,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanhas-remarketing'] });
      toast({
        title: 'Campanha criada',
      });
    },
  });
}
