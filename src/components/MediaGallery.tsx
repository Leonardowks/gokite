import { useState, useRef, useCallback } from "react";
import { Camera, Plus, X, Loader2, ChevronLeft, ChevronRight, AlertTriangle, Sparkles, GripVertical, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MediaGalleryProps {
  fotos: string[];
  onFotosChange: (fotos: string[]) => void;
  maxFotos?: number;
  bucketPath?: string;
  disabled?: boolean;
  className?: string;
  showAITip?: boolean;
}

// Extensões de vídeo não suportadas pela IA Vision
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v', '.3gp', '.wmv', '.flv'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];

const isVideoFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => name.endsWith(ext)) || file.type.startsWith('video/');
};

const isImageFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => name.endsWith(ext)) || file.type.startsWith('image/');
};

export function MediaGallery({
  fotos,
  onFotosChange,
  maxFotos = 6,
  bucketPath = "trade-ins",
  disabled = false,
  className,
  showAITip = true,
}: MediaGalleryProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxFotos - fotos.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Limite atingido",
        description: `Máximo de ${maxFotos} fotos permitidas.`,
        variant: "destructive",
      });
      return;
    }

    const allFiles = Array.from(files);
    
    // Filtrar vídeos e alertar o usuário
    const videoFiles = allFiles.filter(isVideoFile);
    const imageFiles = allFiles.filter(isImageFile);
    
    if (videoFiles.length > 0) {
      toast({
        title: "⚠️ Vídeos não suportados",
        description: `${videoFiles.length} vídeo(s) ignorado(s). A análise IA só funciona com imagens (PNG, JPEG, WebP, GIF).`,
        variant: "destructive",
      });
    }

    if (imageFiles.length === 0) {
      toast({
        title: "Nenhuma imagem válida",
        description: "Selecione arquivos de imagem (PNG, JPEG, WebP, GIF).",
        variant: "destructive",
      });
      return;
    }

    const filesToUpload = imageFiles.slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const filePath = `${bucketPath}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("whatsapp-media")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("whatsapp-media")
          .getPublicUrl(filePath);

        return urlData.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onFotosChange([...fotos, ...uploadedUrls]);

      toast({
        title: "✅ Upload concluído",
        description: `${uploadedUrls.length} foto(s) adicionada(s).`,
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar as fotos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removerFoto = (index: number) => {
    const novasFotos = fotos.filter((_, i) => i !== index);
    onFotosChange(novasFotos);
    setSelectedIndex(null);
  };

  const abrirSeletor = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  // Navegação no modal
  const navegarFoto = useCallback((direcao: 'prev' | 'next') => {
    if (selectedIndex === null) return;
    
    if (direcao === 'prev') {
      setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : fotos.length - 1);
    } else {
      setSelectedIndex(selectedIndex < fotos.length - 1 ? selectedIndex + 1 : 0);
    }
  }, [selectedIndex, fotos.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (selectedIndex === null) return;
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navegarFoto('prev');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navegarFoto('next');
    } else if (e.key === 'Escape') {
      setSelectedIndex(null);
    }
  }, [selectedIndex, navegarFoto]);

  // Drag & Drop para reordenar
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newFotos = [...fotos];
    const [draggedItem] = newFotos.splice(draggedIndex, 1);
    newFotos.splice(dropIndex, 0, draggedItem);
    
    onFotosChange(newFotos);
    setDraggedIndex(null);
    setDragOverIndex(null);

    toast({
      title: "📸 Ordem atualizada",
      description: "A primeira foto será a principal na análise IA.",
    });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const canAddMore = fotos.length < maxFotos && !disabled;

  return (
    <div className={cn("space-y-3", className)} onKeyDown={handleKeyDown} tabIndex={0}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Dica de IA para múltiplas fotos */}
      {showAITip && fotos.length > 0 && fotos.length < 3 && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong className="text-foreground">Dica:</strong> Adicione mais fotos (etiqueta, detalhes, desgaste) para uma análise IA mais precisa!
          </span>
        </div>
      )}

      {/* Foto principal em destaque */}
      {fotos.length > 0 && (
        <div 
          className={cn(
            "relative aspect-video rounded-xl overflow-hidden border bg-muted/50 cursor-pointer group transition-all",
            dragOverIndex === 0 && "ring-2 ring-primary ring-offset-2"
          )}
          onClick={() => setSelectedIndex(0)}
          draggable={!disabled}
          onDragStart={(e) => handleDragStart(e, 0)}
          onDragOver={(e) => handleDragOver(e, 0)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 0)}
          onDragEnd={handleDragEnd}
        >
          <img
            src={fotos[0]}
            alt="Foto principal"
            className={cn(
              "w-full h-full object-cover transition-transform group-hover:scale-105",
              draggedIndex === 0 && "opacity-50"
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Indicador de drag */}
          {!disabled && (
            <div className="absolute top-2 left-2 p-1.5 bg-background/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          
          <span className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/40 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            📸 Foto principal (arraste para reordenar)
          </span>
          
          {!disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removerFoto(0);
              }}
              className="absolute top-2 right-2 p-1.5 bg-background/90 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Grid de miniaturas */}
      <div className="grid grid-cols-3 gap-2">
        {/* Fotos existentes (exceto a primeira que já está em destaque) */}
        {fotos.slice(1).map((foto, index) => {
          const realIndex = index + 1;
          return (
            <div
              key={foto}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border bg-muted/50 cursor-pointer group transition-all",
                dragOverIndex === realIndex && "ring-2 ring-primary ring-offset-1",
                draggedIndex === realIndex && "opacity-50"
              )}
              onClick={() => setSelectedIndex(realIndex)}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, realIndex)}
              onDragOver={(e) => handleDragOver(e, realIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, realIndex)}
              onDragEnd={handleDragEnd}
            >
              <img
                src={foto}
                alt={`Foto ${realIndex + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              
              {/* Número da foto */}
              <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1 rounded">
                {realIndex + 1}
              </span>
              
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removerFoto(realIndex);
                  }}
                  className="absolute top-1 right-1 p-1 bg-background/90 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Botão de adicionar */}
        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            onClick={abrirSeletor}
            disabled={uploading}
            className={cn(
              "aspect-square h-auto flex flex-col gap-1 border-dashed",
              fotos.length === 0 && "col-span-3 aspect-video"
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : fotos.length === 0 ? (
              <>
                <Camera className="h-6 w-6" />
                <span className="text-xs">Tirar Foto / Upload</span>
                <span className="text-[10px] text-muted-foreground">Apenas imagens</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span className="text-[10px]">Adicionar</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Contador com dica */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{fotos.length} de {maxFotos} fotos</span>
        {fotos.length >= 3 && (
          <span className="flex items-center gap-1 text-primary">
            <Sparkles className="h-3 w-3" />
            Ótimo para IA!
          </span>
        )}
      </div>

      {/* Modal de visualização fullscreen */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Botão fechar */}
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors z-10"
            onClick={() => setSelectedIndex(null)}
          >
            <X className="h-6 w-6" />
          </button>
          
          {/* Contador */}
          <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {selectedIndex + 1} / {fotos.length}
          </div>

          {/* Navegação - Anterior */}
          {fotos.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/20 rounded-full transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                navegarFoto('prev');
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Imagem */}
          <img
            src={fotos[selectedIndex]}
            alt={`Visualização ${selectedIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navegação - Próximo */}
          {fotos.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/20 rounded-full transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                navegarFoto('next');
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
          
          {/* Indicadores de posição */}
          {fotos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    i === selectedIndex 
                      ? "bg-white scale-125" 
                      : "bg-white/40 hover:bg-white/60"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(i);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
