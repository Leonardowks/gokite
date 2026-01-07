import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MessageCircle, Share2 } from "lucide-react";
import { PublicTradeIn } from "@/hooks/usePublicTradeIns";
import { CATEGORIAS, CONDICOES } from "@/lib/tradeInConfig";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  item: PublicTradeIn;
  onInteresse: (item: PublicTradeIn) => void;
  onShare: (item: PublicTradeIn) => void;
}

export function ProductCard({ item, onInteresse, onShare }: ProductCardProps) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  
  // Todas as fotos disponíveis
  const allPhotos = [
    ...(item.fotos || []),
    ...(item.foto_url && !item.fotos?.includes(item.foto_url) ? [item.foto_url] : [])
  ].filter(Boolean);

  const hasMultiplePhotos = allPhotos.length > 1;
  
  const categoria = CATEGORIAS.find(c => c.value === item.categoria);
  const condicao = CONDICOES.find(c => c.value === item.condicao);
  
  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhoto(prev => (prev + 1) % allPhotos.length);
  };
  
  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhoto(prev => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const nomeFormatado = [item.marca, item.modelo, item.tamanho]
    .filter(Boolean)
    .join(" ") || item.equipamento_recebido;

  return (
    <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card">
      {/* Imagem com Carousel */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {allPhotos.length > 0 ? (
          <>
            <img
              src={allPhotos[currentPhoto]}
              alt={nomeFormatado}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Navigation arrows */}
            {hasMultiplePhotos && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                
                {/* Dots indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {allPhotos.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        idx === currentPhoto 
                          ? "bg-white scale-110" 
                          : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-6xl opacity-30">
              {categoria?.icon || '🪁'}
            </span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {categoria && (
            <Badge variant="secondary" className="bg-white/90 text-foreground shadow-sm">
              {categoria.icon} {categoria.label}
            </Badge>
          )}
        </div>
        
        {/* Share button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(item);
          }}
          className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
        >
          <Share2 className="h-4 w-4 text-foreground" />
        </button>
      </div>
      
      <CardContent className="p-4 space-y-3">
        {/* Título */}
        <div>
          <h3 className="font-semibold text-lg text-foreground line-clamp-2 leading-tight">
            {nomeFormatado}
          </h3>
          {item.ano && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Ano: {item.ano}
            </p>
          )}
        </div>
        
        {/* Condição */}
        {condicao && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-medium border-0",
              condicao.color.replace('bg-', 'bg-') + '/15',
              condicao.textColor
            )}
          >
            {condicao.label}
          </Badge>
        )}
        
        {/* Descrição */}
        {item.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.descricao}
          </p>
        )}
        
        {/* Preço e CTA */}
        <div className="flex items-end justify-between pt-2">
          <div>
            <p className="text-xs text-muted-foreground">A partir de</p>
            <p className="text-2xl font-bold text-primary">
              R$ {item.valor_entrada.toLocaleString('pt-BR')}
            </p>
          </div>
          
          <Button 
            onClick={() => onInteresse(item)}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            Interesse
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
