import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProdutoEstoque {
  id: string;
  nome: string;
  tipo: string;
  tamanho: string | null;
  quantidade_fisica: number;
  sale_price: number | null;
  cost_price: number | null;
  ean: string | null;
}

/**
 * Hook para buscar produtos com estoque físico disponível para venda
 */
export function useProdutosComEstoque() {
  return useQuery({
    queryKey: ['produtos-com-estoque'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipamentos')
        .select('id, nome, tipo, tamanho, quantidade_fisica, sale_price, cost_price, ean')
        .gt('quantidade_fisica', 0) // Apenas com estoque > 0
        .order('nome', { ascending: true });

      if (error) throw error;
      return (data || []) as ProdutoEstoque[];
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para deduzir estoque ao realizar venda manual
 */
export function useDeduzirEstoqueVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      equipamentoId,
      quantidade = 1,
      clienteNome,
      transacaoId,
    }: {
      equipamentoId: string;
      quantidade?: number;
      clienteNome?: string;
      transacaoId?: string;
    }) => {
      // 1. Buscar equipamento atual
      const { data: equipamento, error: eqError } = await supabase
        .from('equipamentos')
        .select('id, nome, quantidade_fisica')
        .eq('id', equipamentoId)
        .single();

      if (eqError || !equipamento) {
        throw new Error('Equipamento não encontrado');
      }

      const novaQtd = (equipamento.quantidade_fisica || 0) - quantidade;
      if (novaQtd < 0) {
        throw new Error(`Estoque insuficiente. Disponível: ${equipamento.quantidade_fisica}`);
      }

      // 2. Atualizar quantidade física
      const { error: updateError } = await supabase
        .from('equipamentos')
        .update({ quantidade_fisica: novaQtd })
        .eq('id', equipamentoId);

      if (updateError) throw updateError;

      // 3. Registrar movimentação de estoque
      const { error: movError } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          equipamento_id: equipamentoId,
          tipo: 'saida_venda',
          quantidade: quantidade,
          origem: 'venda_manual',
          notas: `Venda manual para ${clienteNome || 'cliente avulso'}${transacaoId ? ` - Transação: ${transacaoId}` : ''}`,
        });

      if (movError) {
        console.error('Erro ao registrar movimentação:', movError);
        // Não falha a operação por causa do log
      }

      // 4. Sincronizar com Nuvemshop
      try {
        await supabase.functions.invoke('sync-inventory-nuvemshop', {
          body: {
            action: 'sync_single',
            equipamento_id: equipamentoId,
            trigger: 'venda',
          },
        });
      } catch (syncError) {
        console.warn('Sync Nuvemshop falhou (não crítico):', syncError);
      }

      return { 
        equipamentoId, 
        nomeEquipamento: equipamento.nome,
        quantidadeDeduzida: quantidade, 
        estoqueRestante: novaQtd 
      };
    },
    onSuccess: () => {
      // Invalidar caches relacionados a estoque
      queryClient.invalidateQueries({ queryKey: ['produtos-com-estoque'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos-disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-recentes'] });
    },
  });
}
