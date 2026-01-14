import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Store,
  Cloud,
  Recycle,
  Plus,
  ArrowRight,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { EstoqueSubmenu } from "@/components/EstoqueSubmenu";
import { TradeInRapidoDrawer } from "@/components/TradeInRapidoDrawer";
import { EquipamentoDialog } from "@/components/EquipamentoDialog";
import { useEquipamentosListagem } from "@/hooks/useSupabaseEquipamentos";
import { useTradeInsSummary } from "@/hooks/useTradeIns";
import { useSupplierStats } from "@/hooks/useSupplierCatalog";
import { useNavigate } from "react-router-dom";
import { SkeletonPremium } from "@/components/ui/skeleton-premium";

export default function Estoque() {
  const navigate = useNavigate();
  const [tradeInOpen, setTradeInOpen] = useState(false);
  const [equipamentoDialogOpen, setEquipamentoDialogOpen] = useState(false);

  // Dados do Supabase
  const { data: equipamentos = [], isLoading: loadingEquip } = useEquipamentosListagem({});
  const { data: tradeInsSummary, isLoading: loadingSummary } = useTradeInsSummary();
  const { data: supplierStats, isLoading: loadingSupplier } = useSupplierStats();

  // Produtos próprios (físicos na loja)
  const produtosProprios = equipamentos.filter((e) => e.source_type !== "virtual_supplier");
  const totalProprios = produtosProprios.length;
  const valorProprios = produtosProprios.reduce((acc, e) => acc + (e.sale_price || 0), 0);

  // Trade-ins: usados
  const qtdUsados = tradeInsSummary?.qtdEmEstoque || 0;
  const valorUsados = tradeInsSummary?.valorEmEstoque || 0;

  // Bombas (>60 dias em estoque)
  const qtdBomba = tradeInsSummary?.qtdBomba || 0;

  // Produtos sob encomenda
  const qtdSobEncomenda = supplierStats?.totalSupplier || 0;
  const novosSobEncomenda = supplierStats?.pending || 0;

  // Valor total do estoque
  const valorTotalEstoque = valorProprios + valorUsados;

  const isLoading = loadingEquip || loadingSummary || loadingSupplier;

  if (isLoading) {
    return (
      <div className="space-y-5 sm:space-y-6 animate-fade-in">
        <div className="h-20 bg-muted/50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonPremium key={i} variant="card" className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PremiumBadge variant="default" size="sm" icon={Package}>
              {totalProprios + qtdUsados} produtos
            </PremiumBadge>
            <PremiumBadge variant="success" size="sm" icon={DollarSign}>
              R$ {(valorTotalEstoque / 1000).toFixed(1)}k
            </PremiumBadge>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Gestão de Estoque
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Visão geral de produtos, usados e catálogo virtual
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="gap-2 min-h-[44px] flex-1 sm:flex-initial"
            onClick={() => setTradeInOpen(true)}
          >
            <Recycle className="h-4 w-4" />
            Trade-in
          </Button>
          <Button
            className="gap-2 min-h-[44px] flex-1 sm:flex-initial"
            onClick={() => setEquipamentoDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Produto
          </Button>
        </div>
      </div>

      {/* Submenu */}
      <EstoqueSubmenu />

      {/* 3 Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Minha Loja */}
        <PremiumCard
          hover
          className="cursor-pointer group border-2 border-transparent hover:border-primary/30 transition-all"
          onClick={() => navigate("/estoque/loja")}
        >
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-success" />
              </div>
              <PremiumBadge variant="success" size="sm">
                Pronta Entrega
              </PremiumBadge>
            </div>

            <h2 className="text-xl font-display font-bold text-foreground mb-1">
              Minha Loja
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Produtos físicos em estoque, prontos para venda ou aluguel
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Produtos</span>
                <AnimatedNumber
                  value={totalProprios}
                  className="text-lg font-bold text-foreground"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor total</span>
                <span className="text-lg font-bold text-success">
                  R$ {(valorProprios / 1000).toFixed(1)}k
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full mt-4 gap-2 group-hover:bg-primary/10"
            >
              Acessar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </CardContent>
        </PremiumCard>

        {/* Card: Sob Encomenda */}
        <PremiumCard
          hover
          className="cursor-pointer group border-2 border-transparent hover:border-primary/30 transition-all"
          onClick={() => navigate("/estoque/sob-encomenda")}
        >
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <PremiumBadge variant="default" size="sm" icon={TrendingUp}>
                3-7 dias
              </PremiumBadge>
            </div>

            <h2 className="text-xl font-display font-bold text-foreground mb-1">
              Sob Encomenda
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Catálogo Duotone - produtos que você pode oferecer sem ter em mãos
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">No catálogo</span>
                <AnimatedNumber
                  value={qtdSobEncomenda}
                  className="text-lg font-bold text-foreground"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Novos disponíveis</span>
                <span className="text-lg font-bold text-primary">
                  {novosSobEncomenda}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full mt-4 gap-2 group-hover:bg-primary/10"
            >
              Explorar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </CardContent>
        </PremiumCard>

        {/* Card: Usados */}
        <PremiumCard
          hover
          className={`cursor-pointer group border-2 transition-all ${
            qtdBomba > 0
              ? "border-destructive/30 hover:border-destructive/50"
              : "border-transparent hover:border-primary/30"
          }`}
          onClick={() => navigate("/estoque/usados")}
        >
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  qtdBomba > 0 ? "bg-destructive/10" : "bg-warning/10"
                }`}
              >
                <Recycle
                  className={`h-6 w-6 ${
                    qtdBomba > 0 ? "text-destructive" : "text-warning"
                  }`}
                />
              </div>
              {qtdBomba > 0 ? (
                <PremiumBadge variant="urgent" size="sm" icon={AlertTriangle} pulse>
                  {qtdBomba} bomba(s)
                </PremiumBadge>
              ) : (
                <PremiumBadge variant="warning" size="sm">
                  Trade-in
                </PremiumBadge>
              )}
            </div>

            <h2 className="text-xl font-display font-bold text-foreground mb-1">
              Usados
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Equipamentos recebidos em troca, disponíveis para revenda
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Em estoque</span>
                <AnimatedNumber
                  value={qtdUsados}
                  className="text-lg font-bold text-foreground"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor estimado</span>
                <span className="text-lg font-bold text-warning">
                  R$ {(valorUsados / 1000).toFixed(1)}k
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full mt-4 gap-2 group-hover:bg-primary/10"
            >
              Gerenciar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </CardContent>
        </PremiumCard>
      </div>

      {/* KPIs Secundários */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumCard hover>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-lg font-bold text-foreground">
                  R$ {(valorTotalEstoque / 1000).toFixed(1)}k
                </p>
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Itens</p>
                <p className="text-lg font-bold text-foreground">
                  {totalProprios + qtdUsados}
                </p>
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <RefreshCw className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lucro Trade-ins</p>
                <p className="text-lg font-bold text-success">
                  R$ {((tradeInsSummary?.lucroTotal || 0) / 1000).toFixed(1)}k
                </p>
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard
          hover
          className={qtdBomba > 0 ? "border-destructive/30" : ""}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  qtdBomba > 0 ? "bg-destructive/10" : "bg-muted"
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${
                    qtdBomba > 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Alertas</p>
                <p
                  className={`text-lg font-bold ${
                    qtdBomba > 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {qtdBomba} bomba(s)
                </p>
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Dialogs */}
      <TradeInRapidoDrawer open={tradeInOpen} onOpenChange={setTradeInOpen} />
      <EquipamentoDialog
        open={equipamentoDialogOpen}
        onOpenChange={setEquipamentoDialogOpen}
      />
    </div>
  );
}
