import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Check, X, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ExtractedData {
  valor: number;
  descricao?: string;
  categoria: string;
  data?: string;
  fornecedor?: string;
  confianca: number;
}

interface ReceiptScannerProps {
  onConfirm: (data: ExtractedData) => void;
  onCancel: () => void;
}

const CATEGORIAS = [
  { value: "combustivel", label: "Combustível" },
  { value: "manutencao", label: "Manutenção" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "funcionarios", label: "Funcionários" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "transporte", label: "Transporte" },
  { value: "outros", label: "Outros" },
];

export function ReceiptScanner({ onConfirm, onCancel }: ReceiptScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editableData, setEditableData] = useState<ExtractedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string)?.split(",")[1];
      if (base64) {
        setImage(e.target?.result as string);
        await processImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string) => {
    setIsProcessing(true);
    setExtractedData(null);

    try {
      const { data, error } = await supabase.functions.invoke("extract-receipt", {
        body: { image_base64: base64 },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setExtractedData(data.data);
        setEditableData(data.data);
        toast({
          title: "Dados extraídos!",
          description: `Confiança: ${data.data.confianca}%`,
        });
      } else {
        throw new Error(data?.error || "Falha ao extrair dados");
      }
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      toast({
        title: "Erro ao processar",
        description: "Não foi possível extrair dados da imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (editableData) {
      onConfirm(editableData);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Scanner de Nota Fiscal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!image ? (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Clique para selecionar ou arraste uma imagem
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute("capture", "environment");
                    fileInputRef.current.click();
                  }
                }}
              >
                <Camera className="h-4 w-4 mr-2" />
                Tirar Foto
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                  }
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Galeria
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={image}
                alt="Nota fiscal"
                className="w-full h-48 object-cover"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm mt-2">Processando com IA...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Extracted Data Form */}
            {editableData && !isProcessing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confiança da extração:</span>
                  <span className={`font-medium ${
                    editableData.confianca >= 80 ? "text-success" :
                    editableData.confianca >= 50 ? "text-warning" : "text-destructive"
                  }`}>
                    {editableData.confianca}%
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={editableData.valor || ""}
                    onChange={(e) =>
                      setEditableData({ ...editableData, valor: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={editableData.descricao || ""}
                    onChange={(e) =>
                      setEditableData({ ...editableData, descricao: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select
                    value={editableData.categoria}
                    onValueChange={(value) =>
                      setEditableData({ ...editableData, categoria: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fornecedor">Fornecedor</Label>
                  <Input
                    id="fornecedor"
                    value={editableData.fornecedor || ""}
                    onChange={(e) =>
                      setEditableData({ ...editableData, fornecedor: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setImage(null);
                      setExtractedData(null);
                      setEditableData(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Nova Foto
                  </Button>
                  <Button className="flex-1" onClick={handleConfirm}>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
