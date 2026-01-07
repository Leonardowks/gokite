import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CreditCard, Banknote, QrCode, Wallet, CheckCircle } from 'lucide-react';
import { useTransacaoAutomatica, getTipoAulaTags } from '@/hooks/useTransacaoAutomatica';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type FormaPagamento = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';

interface AulaParaConfirmar {
  id: string;
  cliente_id: string;
  cliente?: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
  };
  tipo: string;
  local: string;
  data: string;
  hora: string;
  preco: number;
}

interface ConfirmarAulaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aula: AulaParaConfirmar | null;
}

const formasPagamento = [
  { value: 'pix', label: 'PIX', icon: QrCode, cor: 'text-emerald-500' },
  { value: 'cartao_credito', label: 'Cartão Crédito', icon: CreditCard, cor: 'text-blue-500' },
  { value: 'cartao_debito', label: 'Cartão Débito', icon: CreditCard, cor: 'text-purple-500' },
  { value: 'dinheiro', label: 'Dinheiro', icon: Wallet, cor: 'text-amber-500' },
];

export function ConfirmarAulaDialog({ open, onOpenChange, aula }: ConfirmarAulaDialogProps) {
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [parcelas, setParcelas] = useState('1');
  const [isConfirming, setIsConfirming] = useState(false);
  
  const { criarTransacaoCompleta } = useTransacaoAutomatica();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleConfirmar = async () => {
    if (!aula) return;
    
    setIsConfirming(true);
    
    try {
      // 1. Atualizar status da aula para confirmada
      const { error: erroAula } = await supabase
        .from('aulas')
        .update({ status: 'confirmada' })
        .eq('id', aula.id);

      if (erroAula) throw erroAula;

      // 2. Criar transação automática com cliente vinculado
      await criarTransacaoCompleta({
        tipo: 'receita',
        origem: 'aulas',
        descricao: `Aula ${traduzirTipo(aula.tipo)} - ${aula.cliente?.nome || 'Cliente'}`,
        valor_bruto: aula.preco,
        forma_pagamento: formaPagamento,
        parcelas: formaPagamento === 'cartao_credito' ? parseInt(parcelas) : 1,
        centro_de_custo: 'Escola',
        cliente_id: aula.cliente_id,
        referencia_id: aula.id,
        tags_cliente: getTipoAulaTags(aula.tipo),
        atualizar_status_aluno: true,
      });

      // 3. Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['aulas-listagem'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-stats'] });

      toast({
        title: '✅ Aula confirmada!',
        description: `Transação de R$ ${aula.preco.toLocaleString('pt-BR')} registrada automaticamente.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('[ConfirmarAula] Erro:', error);
      toast({
        title: 'Erro ao confirmar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const traduzirTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      'kitesurf_iniciante': 'Kitesurf Iniciante',
      'kitesurf_intermediario': 'Kitesurf Intermediário',
      'kitesurf_avancado': 'Kitesurf Avançado',
      'wing_foil': 'Wing Foil',
      'foil': 'Foil',
      'downwind': 'Downwind',
      'iniciante': 'Iniciante',
      'intermediario': 'Intermediário',
      'avancado': 'Avançado',
    };
    return tipos[tipo] || tipo;
  };

  if (!aula) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Confirmar Aula
          </DialogTitle>
          <DialogDescription>
            Selecione a forma de pagamento para confirmar e registrar automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo da Aula */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Cliente:</span>
            <span className="font-medium">{aula.cliente?.nome || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Tipo:</span>
            <span className="font-medium">{traduzirTipo(aula.tipo)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Data:</span>
            <span className="font-medium">{format(new Date(aula.data), 'dd/MM/yyyy')} às {aula.hora}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 mt-2">
            <span className="text-sm font-medium">Valor:</span>
            <span className="text-lg font-bold text-primary">R$ {aula.preco.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Forma de Pagamento */}
        <div className="space-y-3">
          <Label>Forma de Pagamento</Label>
          <div className="grid grid-cols-2 gap-2">
            {formasPagamento.map((forma) => {
              const Icon = forma.icon;
              const isSelected = formaPagamento === forma.value;
              return (
                <button
                  key={forma.value}
                  type="button"
                  onClick={() => setFormaPagamento(forma.value as FormaPagamento)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : forma.cor}`} />
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {forma.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parcelas (apenas para cartão de crédito) */}
        {formaPagamento === 'cartao_credito' && (
          <div className="space-y-2">
            <Label>Parcelas</Label>
            <Select value={parcelas} onValueChange={setParcelas}>
              <SelectTrigger className="min-h-[48px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}x de R$ {(aula.preco / n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Informação sobre automação */}
        <div className="p-3 rounded-lg bg-success/10 border border-success/20">
          <p className="text-sm text-success">
            ✓ Ao confirmar, a transação será registrada automaticamente no financeiro e o cliente será atualizado para "aluno".
          </p>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-3 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isConfirming}
            className="w-full sm:w-auto min-h-[48px]"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar} 
            disabled={isConfirming} 
            className="gap-2 w-full sm:w-auto min-h-[48px]"
          >
            {isConfirming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Confirmar e Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
