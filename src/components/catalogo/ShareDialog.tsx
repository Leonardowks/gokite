import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2, Facebook, Twitter, MessageCircle, QrCode } from "lucide-react";
import { PublicTradeIn } from "@/hooks/usePublicTradeIns";
import { toast } from "sonner";

interface ShareDialogProps {
  item: PublicTradeIn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ item, open, onOpenChange }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  if (!item) return null;

  const nomeEquipamento = [item.marca, item.modelo, item.tamanho]
    .filter(Boolean)
    .join(" ") || item.equipamento_recebido;

  const shareUrl = `${window.location.origin}/catalogo?item=${item.id}`;
  const shareText = `🪁 ${nomeEquipamento} - R$ ${item.valor_entrada.toLocaleString('pt-BR')} | GoKite Usados`;

  useEffect(() => {
    if (open && item) {
      // Gerar QR Code via API pública
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
      setQrCodeUrl(qrUrl);
    }
  }, [open, item, shareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleShare = async (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: nomeEquipamento,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // Usuário cancelou
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex gap-3">
              {(item.fotos?.[0] || item.foto_url) ? (
                <img
                  src={item.fotos?.[0] || item.foto_url || ''}
                  alt={nomeEquipamento}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">🪁</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{nomeEquipamento}</h4>
                <p className="text-lg font-bold text-primary">
                  R$ {item.valor_entrada.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Link */}
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1 bg-muted/30"
            />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="flex-col h-auto py-3 gap-2 hover:bg-green-50 hover:border-green-500"
              onClick={() => handleShare('whatsapp')}
            >
              <MessageCircle className="h-5 w-5 text-green-600" />
              <span className="text-xs">WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-3 gap-2 hover:bg-blue-50 hover:border-blue-600"
              onClick={() => handleShare('facebook')}
            >
              <Facebook className="h-5 w-5 text-blue-600" />
              <span className="text-xs">Facebook</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-3 gap-2 hover:bg-sky-50 hover:border-sky-500"
              onClick={() => handleShare('twitter')}
            >
              <Twitter className="h-5 w-5 text-sky-500" />
              <span className="text-xs">Twitter</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-3 gap-2"
              onClick={handleNativeShare}
            >
              <Share2 className="h-5 w-5" />
              <span className="text-xs">Mais</span>
            </Button>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="h-4 w-4" />
              QR Code para exibição
            </div>
            {qrCodeUrl && (
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-40 h-40"
                />
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground">
              Escaneie para acessar este item
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
