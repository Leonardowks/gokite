import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type FormaPagamento = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'trade_in';
type TipoOrigem = 'aulas' | 'aluguel' | 'venda_produto' | 'trade_in' | 'pacote' | 'ecommerce' | 'manual';
type CentroCusto = 'Escola' | 'Loja' | 'Administrativo' | 'Pousada';

interface ClienteInput {
  nome: string;
  email: string;
  telefone?: string;
}

interface TransacaoAutomaticaInput {
  tipo: 'receita' | 'despesa';
  origem: TipoOrigem;
  descricao: string;
  valor_bruto: number;
  custo_produto?: number;
  forma_pagamento: FormaPagamento;
  parcelas?: number;
  centro_de_custo?: CentroCusto;
  referencia_id?: string;
  equipamento_id?: string;
  // Cliente pode ser ID existente ou dados para criar/buscar
  cliente_id?: string;
  cliente?: ClienteInput;
  // Tags para adicionar ao cliente
  tags_cliente?: string[];
  // Atualizar status do cliente para 'aluno' se for aula
  atualizar_status_aluno?: boolean;
}

interface TransacaoAutomaticaResult {
  transacao: any;
  cliente: any | null;
  cliente_criado: boolean;
}

/**
 * Hook centralizado para criação de transações com automação completa.
 * 
 * Funcionalidades:
 * - Busca/cria cliente automaticamente por email ou telefone
 * - Calcula taxas de cartão baseado em config_financeiro
 * - Calcula imposto provisionado
 * - Calcula lucro líquido
 * - Atualiza status e tags do cliente
 * - Invalida todas as queries relacionadas
 */
export function useTransacaoAutomatica() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (input: TransacaoAutomaticaInput): Promise<TransacaoAutomaticaResult> => {
      let clienteId = input.cliente_id;
      let clienteData = null;
      let clienteCriado = false;

      // 1. Buscar ou criar cliente se dados foram fornecidos
      if (!clienteId && input.cliente) {
        // Primeiro tenta buscar por email
        const { data: clienteExistente } = await supabase
          .from('clientes')
          .select('id, nome, email, telefone, status, tags')
          .or(`email.eq.${input.cliente.email},telefone.eq.${input.cliente.telefone || ''}`)
          .maybeSingle();

        if (clienteExistente) {
          clienteId = clienteExistente.id;
          clienteData = clienteExistente;
        } else {
          // Criar novo cliente
          const { data: novoCliente, error: erroCliente } = await supabase
            .from('clientes')
            .insert({
              nome: input.cliente.nome,
              email: input.cliente.email,
              telefone: input.cliente.telefone || null,
              status: 'lead',
              tags: input.tags_cliente || [],
            })
            .select()
            .single();

          if (erroCliente) throw erroCliente;
          
          clienteId = novoCliente.id;
          clienteData = novoCliente;
          clienteCriado = true;
        }
      }

      // 2. Atualizar cliente se necessário (status e tags)
      if (clienteId && (input.atualizar_status_aluno || input.tags_cliente?.length)) {
        const updates: Record<string, any> = {};
        
        if (input.atualizar_status_aluno) {
          updates.status = 'aluno';
        }
        
        if (input.tags_cliente?.length && clienteData) {
          const tagsAtuais = clienteData.tags || [];
          const novasTags = [...new Set([...tagsAtuais, ...input.tags_cliente])];
          updates.tags = novasTags;
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('clientes')
            .update(updates)
            .eq('id', clienteId);
        }
      }

      // 3. Buscar configurações financeiras
      const { data: config } = await supabase
        .from('config_financeiro')
        .select('*')
        .limit(1)
        .single();

      // 4. Calcular taxas
      const taxaCartaoPercent = config ? (
        input.forma_pagamento === 'cartao_credito' ? config.taxa_cartao_credito :
        input.forma_pagamento === 'cartao_debito' ? config.taxa_cartao_debito :
        input.forma_pagamento === 'pix' ? config.taxa_pix : 0
      ) : 0;

      const taxaImpostoPercent = config?.taxa_imposto_padrao || 6;

      const taxa_cartao_estimada = input.tipo === 'receita'
        ? (input.valor_bruto * taxaCartaoPercent) / 100
        : 0;

      const imposto_provisionado = input.tipo === 'receita'
        ? (input.valor_bruto * taxaImpostoPercent) / 100
        : 0;

      const custo = input.custo_produto || 0;
      
      const lucro_liquido = input.tipo === 'receita'
        ? input.valor_bruto - custo - taxa_cartao_estimada - imposto_provisionado
        : -input.valor_bruto;

      // 5. Criar transação
      const { data: transacao, error: erroTransacao } = await supabase
        .from('transacoes')
        .insert({
          tipo: input.tipo,
          origem: input.origem,
          descricao: input.descricao,
          valor_bruto: input.valor_bruto,
          custo_produto: custo,
          taxa_cartao_estimada,
          imposto_provisionado,
          lucro_liquido,
          forma_pagamento: input.forma_pagamento,
          parcelas: input.parcelas || 1,
          centro_de_custo: input.centro_de_custo || 'Escola',
          cliente_id: clienteId || null,
          referencia_id: input.referencia_id || null,
          equipamento_id: input.equipamento_id || null,
        })
        .select()
        .single();

      if (erroTransacao) throw erroTransacao;

      return {
        transacao,
        cliente: clienteData,
        cliente_criado: clienteCriado,
      };
    },
    onSuccess: (result) => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-summary'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-count'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-stats'] });

      // Feedback para o usuário
      const valorFormatado = result.transacao.valor_bruto.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      let mensagem = `Transação de ${valorFormatado} registrada!`;
      if (result.cliente_criado) {
        mensagem += ` Cliente ${result.cliente?.nome} criado automaticamente.`;
      }

      toast({
        title: '✅ Registrado com sucesso!',
        description: mensagem,
      });
    },
    onError: (error: any) => {
      console.error('[TransacaoAutomatica] Erro:', error);
      toast({
        title: 'Erro ao registrar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return {
    criarTransacaoCompleta: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

/**
 * Função auxiliar para mapear tipo de aula para tags
 */
export function getTipoAulaTags(tipoAula: string): string[] {
  const mapeamento: Record<string, string[]> = {
    'kitesurf_iniciante': ['kitesurf', 'iniciante'],
    'kitesurf_intermediario': ['kitesurf', 'intermediário'],
    'kitesurf_avancado': ['kitesurf', 'avançado'],
    'wing_foil': ['wing foil'],
    'foil': ['foil'],
    'downwind': ['downwind'],
    'iniciante': ['iniciante'],
    'intermediario': ['intermediário'],
    'avancado': ['avançado'],
  };

  return mapeamento[tipoAula] || [];
}

/**
 * Função auxiliar para mapear origem para centro de custo
 */
export function getCentroCustoPorOrigem(origem: TipoOrigem): CentroCusto {
  const mapeamento: Record<TipoOrigem, CentroCusto> = {
    'aulas': 'Escola',
    'aluguel': 'Escola',
    'venda_produto': 'Loja',
    'trade_in': 'Loja',
    'pacote': 'Escola',
    'ecommerce': 'Loja',
    'manual': 'Escola',
  };

  return mapeamento[origem] || 'Escola';
}
