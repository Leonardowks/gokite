import { useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package,
  DollarSign,
  Calendar,
  AlertTriangle,
  Plus,
  TrendingUp,
  Search,
  ArrowUpRight,
  Clock,
  CheckCircle,
  Tag,
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { useTradeIns, useTradeInsSummary, useVenderTradeIn, TradeIn } from "@/hooks/useTradeIns";
import { SkeletonPremium } from "@/components/ui/skeleton-premium";
import { TradeInRapidoDrawer } from "@/components/TradeInRapidoDrawer";
import { VenderTradeInDialog } from "@/components/VenderTradeInDialog";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TradeIns() {
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [tradeInDrawerOpen, setTradeInDrawerOpen] = useState(false);
  const [vendaDialogOpen, setVendaDialogOpen] = useState(false);
  const [tradeInSelecionado, setTradeInSelecionado] = useState<TradeIn | null>(null);

  const { data: tradeIns, isLoading } = useTradeIns();
  const { data: summary } = useTradeInsSummary();

  const tradeInsFiltrados = (tradeIns || []).filter((item) => {
    const matchStatus = filtroStatus === "todos" || item.status === filtroStatus;
    const matchBusca = busca === "" || 
      item.equipamento_recebido.toLowerCase().includes(busca.toLowerCase()) ||
      item.descricao?.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

  const qtdEmEstoque = (tradeIns || []).filter(t => t.status === "em_estoque").length;
  const qtdVendidos = (tradeIns || []).filter(t => t.status === "vendido").length;
  const qtdBomba = (tradeIns || []).filter(t => {
    if (t.status !== "em_estoque") return false;
    const dias = differenceInDays(new Date(), new Date(t.data_entrada));
    return dias > 60;
  }).length;

  const getDiasEmEstoque = (dataEntrada: string) => {
    return differenceInDays(new Date(), new Date(dataEntrada));
  };

  const isBomba = (tradeIn: TradeIn) => {
    if (tradeIn.status !== "em_estoque") return false;
    return getDiasEmEstoque(tradeIn.data_entrada) > 60;
  };

  const handleVender = (tradeIn: TradeIn) => {
    setTradeInSelecionado(tradeIn);
    setVendaDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <SkeletonPremium variant="card" className="h-20" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <SkeletonPremium key={i} variant="card" className="h-28" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <SkeletonPremium key={i} variant="card" className="h-64" />)}
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
              {tradeIns?.length || 0} itens
            </PremiumBadge>
            {qtdBomba > 0 && (
              <PremiumBadge variant="urgent" size="sm" icon={AlertTriangle} pulse>
                {qtdBomba} bomba(s)
              </PremiumBadge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Trade-in & Usados
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Equipamentos recebidos em troca e usados disponíveis para venda
          </p>
        </div>
        
        <Button 
          className="gap-2 min-h-[44px] w-full sm:w-auto"
          onClick={() => setTradeInDrawerOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Novo Trade-in
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Em Estoque
                </p>
                <AnimatedNumber 
                  value={qtdEmEstoque} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {(summary?.valorEmEstoque || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="icon-container shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Vendidos
                </p>
                <AnimatedNumber 
                  value={qtdVendidos} 
                  className="text-2xl sm:text-3xl font-bold text-success"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {(summary?.receitaVendas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="icon-container bg-success/10 shrink-0">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Lucro Total
                </p>
                <AnimatedNumber 
                  value={summary?.lucroTotal || 0} 
                  format="currency"
                  className="text-2xl sm:text-3xl font-bold text-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Margem: {(summary?.margemMedia || 0).toFixed(0)}%
                </p>
              </div>
              <div className="icon-container shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover className={qtdBomba > 0 ? "border-destructive/50" : ""}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Bomba (+60d)
                </p>
                <AnimatedNumber 
                  value={qtdBomba} 
                  className={`text-2xl sm:text-3xl font-bold ${qtdBomba > 0 ? "text-destructive" : "text-foreground"}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Itens parados
                </p>
              </div>
              <div className={`icon-container shrink-0 ${qtdBomba > 0 ? "bg-destructive/10" : ""}`}>
                <AlertTriangle className={`h-5 w-5 ${qtdBomba > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Filtros */}
      <PremiumCard>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipamento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 min-h-[44px]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filtroStatus === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroStatus("todos")}
                className="min-h-[40px]"
              >
                Todos ({tradeIns?.length || 0})
              </Button>
              <Button
                variant={filtroStatus === "em_estoque" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroStatus("em_estoque")}
                className="min-h-[40px]"
              >
                Em Estoque ({qtdEmEstoque})
              </Button>
              <Button
                variant={filtroStatus === "vendido" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFiltroStatus("vendido")}
                className="min-h-[40px]"
              >
                Vendidos ({qtdVendidos})
              </Button>
            </div>
          </div>
        </CardContent>
      </PremiumCard>

      {/* Grid de Trade-ins */}
      {tradeInsFiltrados.length === 0 ? (
        <PremiumCard>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {busca || filtroStatus !== "todos" 
                ? "Nenhum item encontrado com os filtros aplicados"
                : "Nenhum trade-in registrado ainda"}
            </p>
            <Button 
              className="mt-4"
              onClick={() => setTradeInDrawerOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Registrar Trade-in
            </Button>
          </CardContent>
        </PremiumCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tradeInsFiltrados.map((item) => {
            const dias = getDiasEmEstoque(item.data_entrada);
            const bomba = isBomba(item);

            return (
              <PremiumCard 
                key={item.id} 
                hover 
                className={`overflow-hidden ${bomba ? "border-destructive/50 bg-destructive/5" : ""}`}
              >
                {/* Foto ou Placeholder */}
                <div className={`relative h-36 bg-muted/50 flex items-center justify-center ${bomba ? "bg-destructive/10" : ""}`}>
                  {(item as any).foto_url ? (
                    <img
                      src={(item as any).foto_url}
                      alt={item.equipamento_recebido}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground/30" />
                  )}
                  
                  {/* Badge de Status */}
                  <div className="absolute top-2 right-2">
                    {item.status === "vendido" ? (
                      <PremiumBadge variant="success" size="sm">
                        Vendido
                      </PremiumBadge>
                    ) : bomba ? (
                      <PremiumBadge variant="urgent" size="sm" icon={AlertTriangle} pulse>
                        {dias}d parado
                      </PremiumBadge>
                    ) : (
                      <PremiumBadge variant="default" size="sm">
                        {dias}d em estoque
                      </PremiumBadge>
                    )}
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                    {item.equipamento_recebido}
                  </h3>
                  {item.descricao && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {item.descricao}
                    </p>
                  )}

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Tag className="h-3.5 w-3.5" />
                        Valor Entrada
                      </span>
                      <span className="font-medium text-foreground">
                        R$ {item.valor_entrada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    {item.status === "vendido" && item.valor_saida && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <DollarSign className="h-3.5 w-3.5" />
                            Valor Venda
                          </span>
                          <span className="font-medium text-success">
                            R$ {item.valor_saida.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Lucro
                          </span>
                          <span className={`font-bold ${item.lucro_trade_in >= 0 ? "text-success" : "text-destructive"}`}>
                            R$ {item.lucro_trade_in.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        Entrada
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(item.data_entrada), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {item.status === "em_estoque" && (
                    <Button 
                      className="w-full gap-2 min-h-[44px]"
                      onClick={() => handleVender(item)}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Vender
                    </Button>
                  )}
                </CardContent>
              </PremiumCard>
            );
          })}
        </div>
      )}

      {/* Drawers e Dialogs */}
      <TradeInRapidoDrawer open={tradeInDrawerOpen} onOpenChange={setTradeInDrawerOpen} />
      
      {tradeInSelecionado && (
        <VenderTradeInDialog 
          open={vendaDialogOpen} 
          onOpenChange={setVendaDialogOpen}
          tradeIn={tradeInSelecionado}
        />
      )}
    </div>
  );
}
