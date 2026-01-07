import { useState, useEffect } from "react";
import { 
  Package, 
  Barcode, 
  TrendingUp, 
  AlertCircle, 
  Download, 
  ClipboardCheck,
  RefreshCw
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EstoqueSubmenu } from "@/components/EstoqueSubmenu";
import { PremiumCard } from "@/components/ui/premium-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InventarioFilters } from "@/components/inventario/InventarioFilters";
import { InventarioTable } from "@/components/inventario/InventarioTable";
import { ModoContagem } from "@/components/inventario/ModoContagem";
import { DivergenciaDialog } from "@/components/inventario/DivergenciaDialog";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { toast } from "sonner";
import {
  useInventarioCompleto,
  useInventarioStats,
  useInventarioFilterOptions,
  useContagemFisica,
  useExportarInventario,
  useAtualizarQuantidadeFisica,
  type InventarioFilters as IFilters,
} from "@/hooks/useInventario";

export default function Inventario() {
  const [filters, setFilters] = useState<IFilters>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDivergencias, setShowDivergencias] = useState(false);

  // Queries
  const { data: items = [], isLoading, refetch } = useInventarioCompleto(filters);
  const { data: stats } = useInventarioStats();
  const { data: filterOptions = { tipos: [], statuses: [], localizacoes: [], sourceTypes: [] } } = useInventarioFilterOptions();

  // Mutations
  const exportarMutation = useExportarInventario();
  const atualizarQtdMutation = useAtualizarQuantidadeFisica();

  // Contagem física
  const {
    sessao,
    isActive: modoContagemAtivo,
    iniciarContagem,
    registrarContagem,
    encerrarContagem,
    restaurarSessao,
  } = useContagemFisica();

  // Restaurar sessão salva ao montar
  useEffect(() => {
    restaurarSessao();
  }, [restaurarSessao]);

  const handleIniciarContagem = async () => {
    await iniciarContagem();
    toast.success("Modo contagem iniciado", {
      description: "Escaneie os códigos de barras para conferir o estoque"
    });
  };

  const handleEncerrarContagem = () => {
    const sessaoFinal = encerrarContagem();
    if (sessaoFinal && sessaoFinal.itensConferidos.some(i => i.divergencia !== 0)) {
      setShowDivergencias(true);
    } else {
      toast.success("Contagem finalizada", {
        description: "Nenhuma divergência encontrada!"
      });
    }
  };

  const handleAplicarAjustes = async () => {
    if (!sessao) return;

    const divergencias = sessao.itensConferidos.filter(i => i.divergencia !== 0);
    
    try {
      for (const item of divergencias) {
        await atualizarQtdMutation.mutateAsync({
          equipamentoId: item.equipamentoId,
          novaQuantidade: item.quantidadeContada,
          motivo: `Ajuste por contagem física. Sistema: ${item.quantidadeSistema}, Contado: ${item.quantidadeContada}`,
        });
      }

      toast.success("Ajustes aplicados", {
        description: `${divergencias.length} itens foram atualizados`
      });

      setShowDivergencias(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao aplicar ajustes");
    }
  };

  const handleExportar = () => {
    const itemsToExport = selectedIds.length > 0
      ? items.filter(i => selectedIds.includes(i.id))
      : items;
    
    exportarMutation.mutate(itemsToExport, {
      onSuccess: () => {
        toast.success("Inventário exportado com sucesso");
      },
    });
  };

  // Modo contagem ativo
  if (modoContagemAtivo && sessao) {
    return (
      <ModoContagem
        sessao={sessao}
        onScan={registrarContagem}
        onEncerrar={handleEncerrarContagem}
      />
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Inventário"
        description="Gestão completa do estoque com contagem física e conferência"
      >
        <Button variant="outline" onClick={handleExportar} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
        <Button onClick={handleIniciarContagem} className="gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Iniciar Contagem
        </Button>
      </PageHeader>

      <EstoqueSubmenu />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total SKUs</p>
              <AnimatedNumber
                value={stats?.total || 0}
                className="text-2xl font-bold"
              />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/10">
              <Barcode className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Com EAN</p>
              <div className="flex items-baseline gap-2">
                <AnimatedNumber
                  value={stats?.comEan || 0}
                  className="text-2xl font-bold"
                />
                <Badge variant="secondary" className="text-xs">
                  {stats?.percentualEan || 0}%
                </Badge>
              </div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-warning/10">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sem EAN</p>
              <AnimatedNumber
                value={stats?.semEan || 0}
                className="text-2xl font-bold"
              />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unidades</p>
              <AnimatedNumber
                value={stats?.totalUnidades || 0}
                className="text-2xl font-bold"
              />
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* Filters */}
      <InventarioFilters
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
      />

      {/* Selection info */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Badge variant="secondary">{selectedIds.length} selecionados</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds([])}
          >
            Limpar seleção
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleExportar}>
            Exportar selecionados
          </Button>
        </div>
      )}

      {/* Table */}
      <InventarioTable
        items={items}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        isLoading={isLoading}
      />

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Exibindo {items.length} {items.length === 1 ? 'item' : 'itens'}
        </p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3 w-3" />
          Atualizar
        </Button>
      </div>

      {/* Divergência Dialog */}
      <DivergenciaDialog
        open={showDivergencias}
        onOpenChange={setShowDivergencias}
        sessao={sessao}
        onAplicarAjustes={handleAplicarAjustes}
      />
    </div>
  );
}
