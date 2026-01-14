import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  CheckCircle,
  Tag,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  List,
  Share2,
  Loader2,
  Pencil,
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { useTradeIns, useTradeInsSummary, TradeIn } from "@/hooks/useTradeIns";
import { SkeletonPremium } from "@/components/ui/skeleton-premium";
import { TradeInRapidoDrawer } from "@/components/TradeInRapidoDrawer";
import { TradeInEditDrawer } from "@/components/TradeInEditDrawer";
import { VenderTradeInDialog } from "@/components/VenderTradeInDialog";
import { TradeInsInsights } from "@/components/trade-ins/TradeInsInsights";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CATEGORIAS, 
  CONDICOES, 
  getCategoriaByValue, 
  getCondicaoByValue 
} from "@/lib/tradeInConfig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TradeIns() {
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroCondicao, setFiltroCondicao] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [tradeInDrawerOpen, setTradeInDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [vendaDialogOpen, setVendaDialogOpen] = useState(false);
  const [tradeInSelecionado, setTradeInSelecionado] = useState<TradeIn | null>(null);

  const { data: tradeIns, isLoading } = useTradeIns();
  const { data: summary } = useTradeInsSummary();

  const tradeInsFiltrados = (tradeIns || []).filter((item) => {
    const matchStatus = filtroStatus === "todos" || item.status === filtroStatus;
    const matchCategoria = filtroCategoria === "todas" || item.categoria === filtroCategoria;
    const matchCondicao = filtroCondicao === "todas" || item.condicao === filtroCondicao;
    const matchBusca = busca === "" || 
      item.equipamento_recebido.toLowerCase().includes(busca.toLowerCase()) ||
      item.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      item.marca?.toLowerCase().includes(busca.toLowerCase()) ||
      item.modelo?.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchCategoria && matchCondicao && matchBusca;
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

  const handleEditar = (tradeIn: TradeIn) => {
    setTradeInSelecionado(tradeIn);
    setEditDrawerOpen(true);
  };

  const handlePublicarStatus = async (tradeIn: TradeIn) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-status', {
        body: {
          action: 'publish_single',
          item_id: tradeIn.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Publicado no Status do WhatsApp!", {
          description: `${tradeIn.equipamento_recebido} foi publicado com sucesso.`
        });
      } else {
        throw new Error(data?.error || 'Erro ao publicar');
      }
    } catch (error) {
      console.error('Erro ao publicar no status:', error);
      toast.error("Erro ao publicar", {
        description: "Verifique a configuração do Evolution API."
      });
    }
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
          id="btn-novo-tradein"
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

      {/* Tabs: Estoque / Insights */}
      <Tabs defaultValue="estoque" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="estoque" className="gap-2">
            <List className="h-4 w-4" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estoque" className="mt-4 space-y-4">
          {/* Filtros */}
      <PremiumCard id="filtros-tradein">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por marca, modelo, descrição..."
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
                  variant={filtroStatus === "em_estoque" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroStatus("em_estoque")}
                  className="min-h-[36px] text-xs"
                >
                  Em Estoque ({qtdEmEstoque})
                </Button>
                <Button
                  variant={filtroStatus === "vendido" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setFiltroStatus("vendido")}
                  className="min-h-[36px] text-xs"
                >
                  Vendidos ({qtdVendidos})
                </Button>
              </div>

              {/* Categoria */}
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas categorias</SelectItem>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Condição */}
              <Select value={filtroCondicao} onValueChange={setFiltroCondicao}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Condição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas condições</SelectItem>
                  {CONDICOES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${c.color}`} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {busca || filtroStatus !== "todos" || filtroCategoria !== "todas" || filtroCondicao !== "todas"
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
            const categoria = getCategoriaByValue(item.categoria);
            const condicao = getCondicaoByValue(item.condicao);
            const fotos = item.fotos || [];
            const fotoPrincipal = fotos[0] || item.foto_url;

            return (
              <TradeInCard
                key={item.id}
                item={item}
                dias={dias}
                bomba={bomba}
                categoria={categoria}
                condicao={condicao}
                fotoPrincipal={fotoPrincipal}
                fotos={fotos}
                onVender={() => handleVender(item)}
                onEditar={() => handleEditar(item)}
                onPublicarStatus={handlePublicarStatus}
              />
            );
          })}
        </div>
      )}
        </TabsContent>

        <TabsContent value="insights" className="mt-4" id="insights-tradein">
          <TradeInsInsights tradeIns={tradeIns || []} />
        </TabsContent>
      </Tabs>

      {/* Drawers e Dialogs */}
      <TradeInRapidoDrawer open={tradeInDrawerOpen} onOpenChange={setTradeInDrawerOpen} />
      
      <TradeInEditDrawer 
        open={editDrawerOpen} 
        onOpenChange={setEditDrawerOpen}
        tradeIn={tradeInSelecionado}
      />
      
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

// Componente de Card separado para melhor organização
interface TradeInCardProps {
  item: TradeIn;
  dias: number;
  bomba: boolean;
  categoria: { value: string; label: string; icon: string } | undefined;
  condicao: { value: string; label: string; color: string; textColor: string } | undefined;
  fotoPrincipal: string | null;
  fotos: string[];
  onVender: () => void;
  onEditar: () => void;
  onPublicarStatus: (item: TradeIn) => Promise<void>;
}

function TradeInCard({ 
  item, 
  dias, 
  bomba, 
  categoria, 
  condicao, 
  fotoPrincipal, 
  fotos,
  onVender,
  onEditar,
  onPublicarStatus
}: TradeInCardProps) {
  const [fotoAtual, setFotoAtual] = useState(0);
  const [publicando, setPublicando] = useState(false);
  const todasFotos = fotos.length > 0 ? fotos : (fotoPrincipal ? [fotoPrincipal] : []);

  const handlePublicar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPublicando(true);
    try {
      await onPublicarStatus(item);
    } finally {
      setPublicando(false);
    }
  };

  const proximaFoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFotoAtual((prev) => (prev + 1) % todasFotos.length);
  };

  const fotoAnterior = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFotoAtual((prev) => (prev - 1 + todasFotos.length) % todasFotos.length);
  };

  return (
    <PremiumCard 
      hover 
      className={cn(
        "overflow-hidden",
        bomba && "border-destructive/50 bg-destructive/5"
      )}
    >
      {/* Foto ou Placeholder com Carousel */}
      <div className={cn(
        "relative h-40 bg-muted/50 flex items-center justify-center group",
        bomba && "bg-destructive/10"
      )}>
        {todasFotos.length > 0 ? (
          <>
            <img
              src={todasFotos[fotoAtual]}
              alt={item.equipamento_recebido}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            
            {/* Navegação do carousel */}
            {todasFotos.length > 1 && (
              <>
                <button
                  onClick={fotoAnterior}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={proximaFoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                
                {/* Indicadores */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {todasFotos.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFotoAtual(i);
                      }}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        i === fotoAtual ? "bg-white" : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
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

        {/* Badge de categoria */}
        {categoria && (
          <div className="absolute top-2 left-2">
            <span className="text-lg">{categoria.icon}</span>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Título e badges */}
        <div className="mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">
            {item.equipamento_recebido}
          </h3>
          
          {/* Badges de informação */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.marca && (
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {item.marca}
              </span>
            )}
            {item.tamanho && (
              <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                {item.tamanho}
              </span>
            )}
            {item.ano && (
              <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                {item.ano}
              </span>
            )}
            {condicao && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full text-white",
                condicao.color
              )}>
                {condicao.label}
              </span>
            )}
          </div>
        </div>

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
                <span className={cn(
                  "font-bold",
                  item.lucro_trade_in >= 0 ? "text-success" : "text-destructive"
                )}>
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

        {item.status === "em_estoque" ? (
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="icon"
              className="min-h-[44px] min-w-[44px] shrink-0"
              onClick={(e) => { e.stopPropagation(); onEditar(); }}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline"
              size="icon"
              className="min-h-[44px] min-w-[44px] shrink-0"
              onClick={handlePublicar}
              disabled={publicando}
              title="Publicar no Status do WhatsApp"
            >
              {publicando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </Button>
            <Button 
              className="flex-1 gap-2 min-h-[44px]"
              onClick={onVender}
            >
              <ArrowUpRight className="h-4 w-4" />
              Vender
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost"
            size="sm"
            className="w-full gap-2"
            onClick={(e) => { e.stopPropagation(); onEditar(); }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar Notas
          </Button>
        )}
      </CardContent>
    </PremiumCard>
  );
}
