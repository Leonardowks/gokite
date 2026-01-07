import { useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, MapPin, DollarSign, Calendar, AlertTriangle, Plus, Wrench, CheckCircle, RefreshCw, ArrowRight, Clock } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { EstoqueSubmenu } from "@/components/EstoqueSubmenu";
import { TradeInRapidoDrawer } from "@/components/TradeInRapidoDrawer";
import { useEquipamentosListagem, useEquipamentosOcupacao } from "@/hooks/useSupabaseEquipamentos";
import { useTradeIns, useTradeInsSummary } from "@/hooks/useTradeIns";
import { useNavigate } from "react-router-dom";

export default function Estoque() {
  const navigate = useNavigate();
  const [tradeInOpen, setTradeInOpen] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Dados do Supabase
  const { data: equipamentos = [], isLoading: loadingEquip } = useEquipamentosListagem({});
  const { data: ocupacao, isLoading: loadingOcupacao } = useEquipamentosOcupacao();
  const { data: tradeIns = [], isLoading: loadingTradeIns } = useTradeIns({ status: "em_estoque", limit: 5 });
  const { data: tradeInsSummary, isLoading: loadingSummary } = useTradeInsSummary();

  // Estatísticas de equipamentos
  const totalEquipamentos = equipamentos.length;
  const disponiveis = equipamentos.filter(e => e.status === 'disponivel').length;
  const alugados = equipamentos.filter(e => e.status === 'alugado').length;
  const manutencao = equipamentos.filter(e => e.status === 'manutencao').length;

  // Trade-ins: bombas (>60 dias)
  const bombasCount = tradeIns.filter(t => {
    const dias = Math.floor((Date.now() - new Date(t.data_entrada).getTime()) / 86400000);
    return dias > 60;
  }).length;

  const equipamentosFiltrados = equipamentos.filter(eq => 
    filtroStatus === 'todos' || eq.status === filtroStatus
  );

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: "success" | "warning" | "urgent"; label: string }> = {
      disponivel: { variant: 'success', label: 'Disponível' },
      alugado: { variant: 'warning', label: 'Alugado' },
      manutencao: { variant: 'urgent', label: 'Manutenção' },
    };
    return configs[status] || { variant: 'neutral' as any, label: status };
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      kite: '🪁 Kite',
      wing: '🦅 Wing',
      barra: '🎛️ Barra',
      prancha_twintip: '🏄 Twintip',
      prancha_kitewave: '🏄 Kitewave',
      trapezio: '🎽 Trapézio',
      acessorio: '🔧 Acessório',
      wetsuit: '🤿 Wetsuit',
    };
    return labels[tipo] || '📦 Outro';
  };

  const isLoading = loadingEquip || loadingOcupacao || loadingTradeIns || loadingSummary;

  if (isLoading) {
    return (
      <div className="space-y-5 sm:space-y-6 animate-fade-in">
        <div className="h-20 bg-muted/50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />)}
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
              {totalEquipamentos} equipamentos
            </PremiumBadge>
            {tradeInsSummary?.qtdEmEstoque ? (
              <PremiumBadge variant="warning" size="sm" icon={RefreshCw}>
                {tradeInsSummary.qtdEmEstoque} trade-ins
              </PremiumBadge>
            ) : null}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Gestão de Estoque
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Equipamentos, trade-ins e inventário da escola
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="gap-2 min-h-[44px] flex-1 sm:flex-initial"
            onClick={() => setTradeInOpen(true)}
          >
            <RefreshCw className="h-4 w-4" />
            Trade-in
          </Button>
          <Button className="gap-2 min-h-[44px] flex-1 sm:flex-initial">
            <Plus className="h-4 w-4" />
            Equipamento
          </Button>
        </div>
      </div>

      {/* Submenu */}
      <EstoqueSubmenu />

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Total
                </p>
                <AnimatedNumber 
                  value={totalEquipamentos} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">{disponiveis} disponíveis</p>
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
                  Disponíveis
                </p>
                <AnimatedNumber 
                  value={disponiveis} 
                  className="text-2xl sm:text-3xl font-bold text-success"
                />
                <p className="text-xs text-muted-foreground mt-1">Prontos para uso</p>
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
                  Alugados
                </p>
                <AnimatedNumber 
                  value={alugados} 
                  className="text-2xl sm:text-3xl font-bold text-warning"
                />
                <p className="text-xs text-muted-foreground mt-1">Em uso agora</p>
              </div>
              <div className="icon-container bg-warning/10 shrink-0">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Manutenção
                </p>
                <AnimatedNumber 
                  value={manutencao} 
                  className="text-2xl sm:text-3xl font-bold text-destructive"
                />
                <p className="text-xs text-muted-foreground mt-1">Precisam reparo</p>
              </div>
              <div className="icon-container bg-destructive/10 shrink-0">
                <Wrench className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Trade-ins Destaque */}
      <PremiumCard className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display">Trade-ins em Estoque</CardTitle>
                <p className="text-sm text-muted-foreground">Equipamentos usados para revenda</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {bombasCount > 0 && (
                <PremiumBadge variant="urgent" size="sm" icon={AlertTriangle} pulse>
                  {bombasCount} bomba{bombasCount > 1 ? 's' : ''}
                </PremiumBadge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => navigate('/estoque/trade-ins')}
              >
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{tradeInsSummary?.qtdEmEstoque || 0}</p>
              <p className="text-xs text-muted-foreground">Em estoque</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-success">{tradeInsSummary?.qtdVendidos || 0}</p>
              <p className="text-xs text-muted-foreground">Vendidos</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-primary">
                R$ {((tradeInsSummary?.valorEmEstoque || 0) / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-muted-foreground">Valor em estoque</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-success">
                R$ {((tradeInsSummary?.lucroTotal || 0) / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-muted-foreground">Lucro total</p>
            </div>
          </div>

          {/* Lista rápida de trade-ins */}
          {tradeIns.length > 0 ? (
            <div className="space-y-2">
              {tradeIns.slice(0, 3).map(item => {
                const dias = Math.floor((Date.now() - new Date(item.data_entrada).getTime()) / 86400000);
                const isBomba = dias > 60;
                return (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                      isBomba ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isBomba ? 'bg-destructive/20' : 'bg-primary/10'
                      }`}>
                        <Package className={`h-4 w-4 ${isBomba ? 'text-destructive' : 'text-primary'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.equipamento_recebido}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {dias} dias em estoque
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">R$ {item.valor_entrada.toLocaleString('pt-BR')}</p>
                      {isBomba && (
                        <PremiumBadge variant="urgent" size="sm">Bomba</PremiumBadge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum trade-in em estoque</p>
              <Button 
                variant="link" 
                size="sm" 
                className="mt-2"
                onClick={() => setTradeInOpen(true)}
              >
                Registrar primeiro trade-in
              </Button>
            </div>
          )}
        </CardContent>
      </PremiumCard>

      {/* Ocupação por Localização */}
      <div className="grid gap-4 md:grid-cols-2">
        <PremiumCard>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              Florianópolis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {(() => {
              const loc = ocupacao?.['florianopolis'] || ocupacao?.['Florianópolis'];
              const taxa = loc ? Math.round((loc.alugados / loc.total) * 100) || 0 : 0;
              return (
                <>
                  <div className="flex items-center gap-4">
                    <AnimatedNumber 
                      value={taxa} 
                      suffix="%"
                      className="text-3xl sm:text-4xl font-bold text-primary"
                    />
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500 rounded-full" 
                        style={{ width: `${taxa}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {loc?.alugados || 0} de {loc?.total || 0} alugados
                  </p>
                </>
              );
            })()}
          </CardContent>
        </PremiumCard>

        <PremiumCard>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-accent" />
              </div>
              Taíba
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {(() => {
              const loc = ocupacao?.['taiba'] || ocupacao?.['Taíba'];
              const taxa = loc ? Math.round((loc.alugados / loc.total) * 100) || 0 : 0;
              return (
                <>
                  <div className="flex items-center gap-4">
                    <AnimatedNumber 
                      value={taxa} 
                      suffix="%"
                      className="text-3xl sm:text-4xl font-bold text-accent"
                    />
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent transition-all duration-500 rounded-full" 
                        style={{ width: `${taxa}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {loc?.alugados || 0} de {loc?.total || 0} alugados
                  </p>
                </>
              );
            })()}
          </CardContent>
        </PremiumCard>
      </div>

      {/* Filtros de Equipamentos */}
      <PremiumCard>
        <CardHeader className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base sm:text-lg font-display">Equipamentos da Escola</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filtroStatus === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('todos')}
                className="min-h-[40px]"
              >
                Todos ({totalEquipamentos})
              </Button>
              <Button
                variant={filtroStatus === 'disponivel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('disponivel')}
                className="min-h-[40px]"
              >
                Disponíveis ({disponiveis})
              </Button>
              <Button
                variant={filtroStatus === 'alugado' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('alugado')}
                className="min-h-[40px]"
              >
                Alugados ({alugados})
              </Button>
              <Button
                variant={filtroStatus === 'manutencao' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('manutencao')}
                className="min-h-[40px]"
              >
                Manutenção ({manutencao})
              </Button>
            </div>
          </div>
        </CardHeader>
      </PremiumCard>

      {/* Grid de Equipamentos */}
      {equipamentosFiltrados.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {equipamentosFiltrados.map((eq) => {
            const statusBadge = getStatusBadge(eq.status || 'disponivel');
            return (
              <PremiumCard key={eq.id} hover className="overflow-hidden">
                <CardHeader className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg font-display">{eq.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {getTipoLabel(eq.tipo || 'outro')} • {eq.tamanho || 'N/A'}
                      </p>
                    </div>
                    <PremiumBadge variant={statusBadge.variant} size="sm">
                      {statusBadge.label}
                    </PremiumBadge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {eq.localizacao === 'florianopolis' ? 'Florianópolis' : eq.localizacao === 'taiba' ? 'Taíba' : eq.localizacao || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-primary">
                      <DollarSign className="h-4 w-4" />
                      R$ {eq.preco_aluguel_dia || 0}/dia
                    </span>
                  </div>
                </CardContent>
              </PremiumCard>
            );
          })}
        </div>
      ) : (
        <PremiumCard>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium text-lg mb-2">Nenhum equipamento encontrado</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {filtroStatus !== 'todos' 
                ? 'Não há equipamentos com este status' 
                : 'Adicione equipamentos ao estoque da escola'}
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Equipamento
            </Button>
          </CardContent>
        </PremiumCard>
      )}

      {/* Trade-in Drawer */}
      <TradeInRapidoDrawer open={tradeInOpen} onOpenChange={setTradeInOpen} />
    </div>
  );
}
