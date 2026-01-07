import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { ProductCard } from "@/components/catalogo/ProductCard";
import { CatalogoFilters } from "@/components/catalogo/CatalogoFilters";
import { InteresseDialog } from "@/components/catalogo/InteresseDialog";
import { ShareDialog } from "@/components/catalogo/ShareDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, Award, RefreshCw } from "lucide-react";
import { 
  usePublicTradeIns, 
  useTradeInMarcas, 
  useCatalogoStats,
  CatalogoFilters as FiltersType,
  PublicTradeIn 
} from "@/hooks/usePublicTradeIns";

export default function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FiltersType>({});
  const [selectedItem, setSelectedItem] = useState<PublicTradeIn | null>(null);
  const [shareItem, setShareItem] = useState<PublicTradeIn | null>(null);
  const [interesseOpen, setInteresseOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: items, isLoading } = usePublicTradeIns(filters);
  const { data: marcas } = useTradeInMarcas();
  const { data: stats } = useCatalogoStats();

  // Handle deep link to specific item
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId && items) {
      const found = items.find(i => i.id === itemId);
      if (found) {
        setSelectedItem(found);
        setInteresseOpen(true);
        // Clear the param
        setSearchParams({});
      }
    }
  }, [searchParams, items, setSearchParams]);

  const handleInteresse = (item: PublicTradeIn) => {
    setSelectedItem(item);
    setInteresseOpen(true);
  };

  const handleShare = (item: PublicTradeIn) => {
    setShareItem(item);
    setShareOpen(true);
  };

  return (
    <PublicLayout>
      {/* SEO Meta tags are in index.html */}
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-primary/10 py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Badge variant="secondary" className="gap-2 px-4 py-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Equipamentos Seminovos
            </Badge>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Usados GoKite
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Equipamentos de qualidade com procedência garantida. 
              Todos revisados pela nossa equipe técnica.
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 pt-6">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Itens disponíveis</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg">{stats?.categorias?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Categorias</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg">20+ anos</p>
                  <p className="text-xs text-muted-foreground">De experiência</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section className="py-8 lg:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <CatalogoFilters
            filters={filters}
            setFilters={setFilters}
            marcas={marcas || []}
            precoRange={{
              min: stats?.menorPreco || 0,
              max: stats?.maiorPreco || 50000
            }}
            totalResults={items?.length || 0}
          />

          {/* Results count */}
          <div className="mt-6 mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Carregando..." : `${items?.length || 0} equipamentos encontrados`}
            </p>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onInteresse={handleInteresse}
                  onShare={handleShare}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Nenhum equipamento encontrado</h3>
              <p className="text-muted-foreground mt-1">
                Tente ajustar os filtros ou volte mais tarde
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 bg-muted/30 border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold">Garantia de Origem</h3>
              <p className="text-sm text-muted-foreground">
                Todos os equipamentos são verificados e revisados
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="font-semibold">Suporte Especializado</h3>
              <p className="text-sm text-muted-foreground">
                Nossa equipe está pronta para tirar suas dúvidas
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold">Pagamento Flexível</h3>
              <p className="text-sm text-muted-foreground">
                PIX, cartão ou troca por outro equipamento
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dialogs */}
      <InteresseDialog
        item={selectedItem}
        open={interesseOpen}
        onOpenChange={setInteresseOpen}
      />
      
      <ShareDialog
        item={shareItem}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </PublicLayout>
  );
}
