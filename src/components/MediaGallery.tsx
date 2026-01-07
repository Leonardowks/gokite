import { useState, useRef } from "react";
import { Camera, Plus, X, Loader2, Image as ImageIcon } from "lucide-react";
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
}

export function MediaGallery({
  fotos,
  onFotosChange,
  maxFotos = 6,
  bucketPath = "trade-ins",
  disabled = false,
  className,
}: MediaGalleryProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
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

  const canAddMore = fotos.length < maxFotos && !disabled;

  return (
    <div className={cn("space-y-3", className)}>
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

      {/* Foto principal em destaque */}
      {fotos.length > 0 && (
        <div 
          className="relative aspect-video rounded-xl overflow-hidden border bg-muted/50 cursor-pointer group"
          onClick={() => setSelectedIndex(0)}
        >
          <img
            src={fotos[0]}
            alt="Foto principal"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/40 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            Foto principal
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
        {fotos.slice(1).map((foto, index) => (
          <div
            key={foto}
            className="relative aspect-square rounded-lg overflow-hidden border bg-muted/50 cursor-pointer group"
            onClick={() => setSelectedIndex(index + 1)}
          >
            <img
              src={foto}
              alt={`Foto ${index + 2}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removerFoto(index + 1);
                }}
                className="absolute top-1 right-1 p-1 bg-background/90 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

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

      {/* Contador */}
      <p className="text-xs text-muted-foreground text-center">
        {fotos.length} de {maxFotos} fotos
      </p>

      {/* Modal de visualização */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            onClick={() => setSelectedIndex(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={fotos[selectedIndex]}
            alt="Visualização"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Navegação */}
          {fotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i === selectedIndex ? "bg-white" : "bg-white/40"
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
