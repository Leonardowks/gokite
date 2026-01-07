import { supabase } from '@/integrations/supabase/client';

type TipoMovimentacao = 'credito' | 'debito' | 'saldo';

interface NotificacaoCreditoInput {
  clienteId: string;
  tipoMovimentacao: TipoMovimentacao;
  valor: number;
  novoSaldo: number;
  motivo?: string;
}

/**
 * Hook para enviar notificações WhatsApp sobre movimentações de crédito de loja
 */
export function useStoreCreditNotification() {
  
  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const gerarMensagem = (
    nomeCliente: string,
    tipo: TipoMovimentacao,
    valor: number,
    novoSaldo: number,
    motivo?: string
  ): string => {
    const saudacao = `Olá, ${nomeCliente}! 👋`;
    const assinatura = `\n\n🏄 *GoKite* - Sua escola de kitesurf`;
    
    switch (tipo) {
      case 'credito':
        return `${saudacao}

✅ *Crédito adicionado à sua conta!*

💰 *Valor:* ${formatarMoeda(valor)}
${motivo ? `📝 *Motivo:* ${motivo}` : ''}

💳 *Seu novo saldo:* ${formatarMoeda(novoSaldo)}

Use seu crédito em aulas, equipamentos ou na nossa loja!${assinatura}`;

      case 'debito':
        return `${saudacao}

📝 *Movimentação na sua conta*

💸 *Crédito utilizado:* ${formatarMoeda(valor)}
${motivo ? `📋 *Referência:* ${motivo}` : ''}

💳 *Seu saldo atual:* ${formatarMoeda(novoSaldo)}

Obrigado por usar seu crédito conosco!${assinatura}`;

      case 'saldo':
        return `${saudacao}

📊 *Consulta de Saldo*

💳 *Seu crédito disponível:* ${formatarMoeda(novoSaldo)}

Use seu crédito em aulas, equipamentos ou na nossa loja!${assinatura}`;

      default:
        return '';
    }
  };

  const enviarNotificacao = async (input: NotificacaoCreditoInput): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Buscar dados do cliente (nome e telefone)
      const { data: cliente, error: erroCliente } = await supabase
        .from('clientes')
        .select('nome, telefone')
        .eq('id', input.clienteId)
        .single();

      if (erroCliente || !cliente) {
        console.warn('[StoreCreditNotification] Cliente não encontrado:', input.clienteId);
        return { success: false, error: 'Cliente não encontrado' };
      }

      if (!cliente.telefone) {
        console.warn('[StoreCreditNotification] Cliente sem telefone:', cliente.nome);
        return { success: false, error: 'Cliente não possui telefone cadastrado' };
      }

      // 2. Gerar mensagem personalizada
      const mensagem = gerarMensagem(
        cliente.nome.split(' ')[0], // Primeiro nome
        input.tipoMovimentacao,
        input.valor,
        input.novoSaldo,
        input.motivo
      );

      // 3. Enviar via Edge Function
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          phone: cliente.telefone,
          message: mensagem,
        },
      });

      if (error) {
        console.error('[StoreCreditNotification] Erro ao enviar:', error);
        return { success: false, error: error.message };
      }

      console.log('[StoreCreditNotification] Notificação enviada com sucesso:', {
        cliente: cliente.nome,
        tipo: input.tipoMovimentacao,
        valor: input.valor,
      });

      return { success: true };
    } catch (error: any) {
      console.error('[StoreCreditNotification] Erro inesperado:', error);
      return { success: false, error: error.message || 'Erro desconhecido' };
    }
  };

  return {
    enviarNotificacao,
    formatarMoeda,
  };
}
