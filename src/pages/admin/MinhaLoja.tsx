import { useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  MapPin,
  Plus,
  Search,
  CheckCircle,
  Calendar,
  Wrench,
  Store,
  ScanLine,
  DollarSign,
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { Badge } from "@/components/ui/badge";
import { EstoqueSubmenu } from "@/components/EstoqueSubmenu";
import { EquipamentoDialog } from "@/components/EquipamentoDialog";
import { useEquipamentosListagem, useEquipamentosOcupacao } from "@/hooks/useSupabaseEquipamentos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonPremium } from "@/components/ui/skeleton-premium";

export default function MinhaLoja() {
  const [equipamentoDialogOpen, setEquipamentoDialogOpen] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroLocalizacao, setFiltroLocalizacao] = useState<string>("todas");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  // Buscar apenas produtos próprios (owned) - exclui virtual_supplier
  const { data: todosEquipamentos = [], isLoading } = useEquipamentosListagem({});
  const { data: ocupacao } = useEquipamentosOcupacao();

  // Filtrar apenas produtos próprios (não virtuais do fornecedor)
  const equipamentosProprios = todosEquipamentos.filter(
    (e) => e.source_type !== "virtual_supplier"
  );

  // Aplicar filtros
  const equipamentosFiltrados = equipamentosProprios.filter((eq) => {
    const matchStatus = filtroStatus === "todos" || eq.status === filtroStatus;
    const matchLocal =
      filtroLocalizacao === "todas" ||
      eq.localizacao?.toLowerCase().includes(filtroLocalizacao.toLowerCase());
    const matchTipo = filtroTipo === "todos" || eq.tipo === filtroTipo;
    const matchBusca =
      busca === "" ||
      eq.nome.toLowerCase().includes(busca.toLowerCase()) ||
      eq.tamanho?.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchLocal && matchTipo && matchBusca;
  });

  // Estatísticas
  const total = equipamentosProprios.length;
  const disponiveis = equipamentosProprios.filter((e) => e.status === "disponivel").length;
  const alugados = equipamentosProprios.filter((e) => e.status === "alugado").length;
  const manutencao = equipamentosProprios.filter((e) => e.status === "manutencao").length;
  const comEan = equipamentosProprios.filter((e) => e.ean).length;
  const valorTotal = equipamentosProprios.reduce((acc, e) => acc + (e.sale_price || 0), 0);

  // Tipos únicos para filtro
  const tiposUnicos = [...new Set(equipamentosProprios.map((e) => e.tipo))];

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: "success" | "warning" | "urgent"; label: string }> = {
      disponivel: { variant: "success", label: "Disponível" },
      alugado: { variant: "warning", label: "Alugado" },
      manutencao: { variant: "urgent", label: "Manutenção" },
    };
    return configs[status] || { variant: "neutral" as any, label: status };
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      kite: "🪁 Kite",
      wing: "🦅 Wing",
      barra: "🎛️ Barra",
      prancha_twintip: "🏄 Twintip",
      prancha_kitewave: "🏄 Kitewave",
      trapezio: "🎽 Trapézio",
      acessorio: "🔧 Acessório",
      wetsuit: "🤿 Wetsuit",
    };
    return labels[tipo] || "📦 Outro";
  };

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <SkeletonPremium variant="card" className="h-20" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonPremium key={i} variant="card" className="h-28" />
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
            <PremiumBadge variant="success" size="sm" icon={Store}>
              Pronta Entrega
            </PremiumBadge>
            <PremiumBadge variant="default" size="sm" icon={Package}>
              {total} produtos
            </PremiumBadge>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Minha Loja
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Produtos físicos em estoque, prontos para venda ou aluguel
          </p>
        </div>

        <Button
          className="gap-2 min-h-[44px] w-full sm:w-auto"
          onClick={() => setEquipamentoDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Submenu */}
      <EstoqueSubmenu />

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
                  value={total}
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {(valorTotal / 1000).toFixed(1)}k em valor
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
                  Disponíveis
                </p>
                <AnimatedNumber
                  value={disponiveis}
                  className="text-2xl sm:text-3xl font-bold text-success"
                />
                <p className="text-xs text-muted-foreground mt-1">Prontos para venda</p>
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
                  Escaneáveis
                </p>
                <AnimatedNumber
                  value={comEan}
                  className="text-2xl sm:text-3xl font-bold text-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {total > 0 ? Math.round((comEan / total) * 100) : 0}% com EAN
                </p>
              </div>
              <div className="icon-container shrink-0">
                <ScanLine className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

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
              const loc = ocupacao?.["florianopolis"] || ocupacao?.["Florianópolis"];
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
              const loc = ocupacao?.["taiba"] || ocupacao?.["Taíba"];
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

      {/* Filtros */}
      <PremiumCard>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, tamanho..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 min-h-[44px]"
              />
            </div>

            {/* Filtros em linha */}
            <div className="flex flex-wrap gap-2">
              {/* Status */}
              <div className="flex gap-1.5">
                <Button
                  variant={filtroStatus === "todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroStatus("todos")}
                  className="min-h-[36px] text-xs"
                >
                  Todos
                </Button>
                <Button
                  variant={filtroStatus === "disponivel" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroStatus("disponivel")}
                  className="min-h-[36px] text-xs"
                >
                  Disponíveis ({disponiveis})
                </Button>
                <Button
                  variant={filtroStatus === "alugado" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setFiltroStatus("alugado")}
                  className="min-h-[36px] text-xs"
                >
                  Alugados ({alugados})
                </Button>
                <Button
                  variant={filtroStatus === "manutencao" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setFiltroStatus("manutencao")}
                  className="min-h-[36px] text-xs"
                >
                  Manutenção ({manutencao})
                </Button>
              </div>

              {/* Localização */}
              <Select value={filtroLocalizacao} onValueChange={setFiltroLocalizacao}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Localização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas localizações</SelectItem>
                  <SelectItem value="florianopolis">📍 Florianópolis</SelectItem>
                  <SelectItem value="taiba">📍 Taíba</SelectItem>
                </SelectContent>
              </Select>

              {/* Tipo */}
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos tipos</SelectItem>
                  {tiposUnicos.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {getTipoLabel(tipo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </PremiumCard>

      {/* Grid de Produtos */}
      {equipamentosFiltrados.length === 0 ? (
        <PremiumCard>
          <CardContent className="p-8 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {busca || filtroStatus !== "todos" || filtroLocalizacao !== "todas" || filtroTipo !== "todos"
                ? "Nenhum produto encontrado com os filtros aplicados"
                : "Nenhum produto cadastrado na loja ainda"}
            </p>
            <Button className="mt-4" onClick={() => setEquipamentoDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Produto
            </Button>
          </CardContent>
        </PremiumCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {equipamentosFiltrados.map((eq) => {
            const statusConfig = getStatusBadge(eq.status || "disponivel");
            return (
              <PremiumCard
                key={eq.id}
                hover
                className={eq.status === "manutencao" ? "border-destructive/30" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {getTipoLabel(eq.tipo)}
                        </Badge>
                        <PremiumBadge variant={statusConfig.variant} size="sm">
                          {statusConfig.label}
                        </PremiumBadge>
                      </div>

                      <h3 className="font-semibold text-foreground truncate">{eq.nome}</h3>

                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{eq.localizacao || "Sem localização"}</span>
                        {eq.tamanho && (
                          <>
                            <span>•</span>
                            <span>{eq.tamanho}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        {eq.preco_aluguel_dia > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Aluguel: </span>
                            <span className="font-semibold text-foreground">
                              R$ {eq.preco_aluguel_dia}/dia
                            </span>
                          </div>
                        )}
                        {eq.sale_price && eq.sale_price > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Venda: </span>
                            <span className="font-semibold text-success">
                              R$ {eq.sale_price.toLocaleString("pt-BR")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {eq.ean && (
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <ScanLine className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </PremiumCard>
            );
          })}
        </div>
      )}

      {/* Dialog para novo equipamento */}
      <EquipamentoDialog open={equipamentoDialogOpen} onOpenChange={setEquipamentoDialogOpen} />
    </div>
  );
}
