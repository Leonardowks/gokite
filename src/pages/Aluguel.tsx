import { useState } from "react";
import { Package, DollarSign, Clock, CheckCircle, Plus, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { AluguelDialog } from "@/components/AluguelDialog";
import { useToast } from "@/hooks/use-toast";
import { useEquipamentosListagem, useEquipamentosOcupacao } from "@/hooks/useSupabaseEquipamentos";
import { useAlugueisListagem, useAlugueisStats, useCreateAluguel, useFinalizarAluguel, type AluguelComDetalhes } from "@/hooks/useSupabaseAlugueis";
import { format, differenceInDays, differenceInHours, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function getCountdown(dataFim: string) {
  const fim = new Date(dataFim);
  const now = new Date();
  
  if (isPast(fim)) {
    const horasAtrasadas = differenceInHours(now, fim);
    return { text: `${horasAtrasadas}h atrasado`, isLate: true };
  }
  
  const dias = differenceInDays(fim, now);
  const horas = differenceInHours(fim, now) % 24;
  
  if (dias > 0) {
    return { text: `${dias}d ${horas}h restantes`, isLate: false };
  }
  return { text: `${horas}h restantes`, isLate: false };
}

export default function Aluguel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [devolucaoDialog, setDevolucaoDialog] = useState<AluguelComDetalhes | null>(null);
  const { toast } = useToast();

  // Hooks do Supabase
  const { data: equipamentos = [], isLoading: loadingEquip } = useEquipamentosListagem();
  const { data: alugueis = [], isLoading: loadingAlugueis } = useAlugueisListagem();
  const { data: stats, isLoading: loadingStats } = useAlugueisStats();
  const { data: ocupacao } = useEquipamentosOcupacao();
  
  const createMutation = useCreateAluguel();
  const finalizarMutation = useFinalizarAluguel();

  const handleCreateAluguel = async (data: {
    cliente_id: string;
    equipamento_id: string;
    data_inicio: string;
    data_fim: string;
    valor: number;
  }) => {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Aluguel registrado!", description: "O equipamento foi reservado com sucesso." });
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível registrar o aluguel.", variant: "destructive" });
    }
  };

  const handleDevolucao = async () => {
    if (!devolucaoDialog) return;
    
    try {
      await finalizarMutation.mutateAsync({
        id: devolucaoDialog.id,
        equipamento_id: devolucaoDialog.equipamento_id,
        condicao_devolucao: "bom",
      });
      toast({ title: "Devolução registrada!", description: "O equipamento está disponível novamente." });
      setDevolucaoDialog(null);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível registrar a devolução.", variant: "destructive" });
    }
  };

  // Stats calculadas
  const equipDisponiveis = equipamentos.filter(e => e.status === 'disponivel').length;
  const equipAlugados = equipamentos.filter(e => e.status === 'alugado').length;
  const alugueisAtivos = alugueis.filter(a => a.status === 'ativo');
  const taxaOcupacao = equipamentos.length > 0 
    ? Math.round((equipAlugados / equipamentos.length) * 100) 
    : 0;

  const isLoading = loadingEquip || loadingAlugueis || loadingStats;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PremiumBadge variant="default" size="sm" icon={Package}>
              {equipamentos.length} equipamentos
            </PremiumBadge>
            {alugueisAtivos.length > 0 && (
              <PremiumBadge variant="success" size="sm" pulse>
                {alugueisAtivos.length} ativos
              </PremiumBadge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Aluguel de Equipamentos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestão de aluguéis e equipamentos para kitesurf
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 min-h-[44px] w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo Aluguel
        </Button>
      </div>

      {/* KPIs Premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Disponíveis
                </p>
                <AnimatedNumber 
                  value={equipDisponiveis} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container bg-success/10 shrink-0">
                <Package className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Alugados
                </p>
                <AnimatedNumber 
                  value={equipAlugados} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container bg-warning/10 shrink-0">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Receita do Mês
                </p>
                <AnimatedNumber 
                  value={stats?.receitaMes || 0} 
                  format="currency"
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container shrink-0">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Taxa Ocupação
                </p>
                <AnimatedNumber 
                  value={taxaOcupacao} 
                  suffix="%"
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container bg-accent/10 shrink-0">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Aluguéis Ativos */}
      <PremiumCard featured={alugueisAtivos.length > 0}>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            Aluguéis Ativos
            {alugueisAtivos.length > 0 && (
              <Badge variant="secondary" className="ml-2">{alugueisAtivos.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : alugueisAtivos.length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhum aluguel ativo no momento</p>
              <Button variant="outline" onClick={() => setDialogOpen(true)} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Registrar Aluguel
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {alugueisAtivos.map((aluguel) => {
                const countdown = getCountdown(aluguel.data_fim);
                return (
                  <div 
                    key={aluguel.id}
                    className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                      countdown.isLate 
                        ? 'border-destructive/50 bg-destructive/5' 
                        : 'border-border/50 bg-muted/20 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{aluguel.equipamento?.nome}</p>
                          <p className="text-xs text-muted-foreground">{aluguel.equipamento?.tipo}</p>
                        </div>
                      </div>
                      {countdown.isLate && (
                        <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{aluguel.cliente?.nome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Período:</span>
                        <span className="font-medium">
                          {format(new Date(aluguel.data_inicio), "dd/MM", { locale: ptBR })} - {format(new Date(aluguel.data_fim), "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-bold text-primary">R$ {aluguel.valor}</span>
                      </div>
                    </div>

                    <div className={`p-2 rounded-lg text-center text-sm font-medium mb-3 ${
                      countdown.isLate 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {countdown.text}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2"
                      onClick={() => setDevolucaoDialog(aluguel)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Registrar Devolução
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </PremiumCard>

      {/* Lista de Equipamentos */}
      <PremiumCard>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-accent" />
            </div>
            Equipamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {loadingEquip ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : equipamentos.length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhum equipamento cadastrado</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {equipamentos.map((equip) => (
                <div 
                  key={equip.id}
                  className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant={
                      equip.status === 'disponivel' ? 'default' : 
                      equip.status === 'alugado' ? 'secondary' : 
                      'outline'
                    }>
                      {equip.status === 'disponivel' ? 'Disponível' : 
                       equip.status === 'alugado' ? 'Alugado' : 
                       equip.status === 'manutencao' ? 'Manutenção' : equip.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-1">{equip.nome}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Tipo:</span>
                      <span className="font-medium text-foreground">{equip.tipo}</span>
                    </div>
                    {equip.tamanho && (
                      <div className="flex justify-between">
                        <span>Tamanho:</span>
                        <span className="font-medium text-foreground">{equip.tamanho}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Diária:</span>
                      <span className="font-bold text-primary">R$ {equip.preco_aluguel_dia}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </PremiumCard>

      {/* Dialog de Novo Aluguel */}
      <AluguelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleCreateAluguel}
        isLoading={createMutation.isPending}
      />

      {/* Dialog de Devolução */}
      <AlertDialog open={!!devolucaoDialog} onOpenChange={() => setDevolucaoDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Devolução</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmar a devolução do equipamento <strong>{devolucaoDialog?.equipamento?.nome}</strong> alugado por <strong>{devolucaoDialog?.cliente?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDevolucao} disabled={finalizarMutation.isPending}>
              {finalizarMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar Devolução"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
