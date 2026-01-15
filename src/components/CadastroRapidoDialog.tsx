import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Loader2, Truck } from "lucide-react";
import { useCadastrarProduto } from "@/hooks/useReceberMercadoria";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SupplierProductData {
  product_name: string;
  category: string | null;
  brand: string | null;
  size: string | null;
  cost_price: number;
  sku: string;
}

interface CadastroRapidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ean: string;
  onSuccess: () => void;
  supplierData?: SupplierProductData | null;
}

const TIPOS_PRODUTO = [
  { value: "kite", label: "Kite" },
  { value: "prancha", label: "Prancha" },
  { value: "barra", label: "Barra" },
  { value: "trapezio", label: "Trapézio" },
  { value: "wetsuit", label: "Wetsuit" },
  { value: "acessorio", label: "Acessório" },
  { value: "vestuario", label: "Vestuário" },
  { value: "outro", label: "Outro" },
];

// Map supplier category to system type
function mapSupplierCategory(category: string | null): string {
  if (!category) return "acessorio";
  
  const map: Record<string, string> = {
    "kites": "kite",
    "kite": "kite",
    "boards": "prancha",
    "board": "prancha",
    "prancha": "prancha",
    "bars": "barra",
    "bar": "barra",
    "barra": "barra",
    "harnesses": "trapezio",
    "harness": "trapezio",
    "trapezio": "trapezio",
    "wetsuits": "wetsuit",
    "wetsuit": "wetsuit",
    "accessories": "acessorio",
    "acessorio": "acessorio",
    "apparel": "vestuario",
    "vestuario": "vestuario",
  };
  
  return map[category.toLowerCase()] || "acessorio";
}

export function CadastroRapidoDialog({
  open,
  onOpenChange,
  ean,
  onSuccess,
  supplierData,
}: CadastroRapidoDialogProps) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("acessorio");
  const [tamanho, setTamanho] = useState("");
  const [custPrice, setCustPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [quantidade, setQuantidade] = useState("1");

  const { mutate: cadastrar, isPending } = useCadastrarProduto();
  
  const isFromSupplier = !!supplierData;

  // Pre-fill form when supplier data is provided
  useEffect(() => {
    if (supplierData && open) {
      setNome(supplierData.product_name);
      setTipo(mapSupplierCategory(supplierData.category));
      setTamanho(supplierData.size || "");
      setCustPrice(supplierData.cost_price.toString());
      setSalePrice(Math.round(supplierData.cost_price * 1.4).toString());
      setQuantidade("1");
    }
  }, [supplierData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) return;

    cadastrar(
      {
        nome: nome.trim(),
        tipo,
        ean,
        tamanho: tamanho || null,
        cost_price: custPrice ? parseFloat(custPrice) : 0,
        sale_price: salePrice ? parseFloat(salePrice) : parseFloat(custPrice) * 1.4 || 0,
        quantidade: parseInt(quantidade) || 1,
      },
      {
        onSuccess: () => {
          resetForm();
          onSuccess();
          onOpenChange(false);
        },
      }
    );
  };

  const resetForm = () => {
    setNome("");
    setTipo("acessorio");
    setTamanho("");
    setCustPrice("");
    setSalePrice("");
    setQuantidade("1");
  };

  // Auto-calculate suggested sale price
  const handleCostChange = (value: string) => {
    setCustPrice(value);
    if (value && !salePrice) {
      const suggested = Math.round(parseFloat(value) * 1.4);
      setSalePrice(suggested.toString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isFromSupplier ? "bg-blue-500/10" : "bg-primary/10"
            )}>
              {isFromSupplier ? (
                <Truck className="h-5 w-5 text-blue-500" />
              ) : (
                <Package className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle>Cadastrar Novo Produto</DialogTitle>
                {isFromSupplier && (
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                    Duotone
                  </Badge>
                )}
              </div>
              <DialogDescription>
                EAN: <span className="font-mono font-medium">{ean}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isFromSupplier && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">Dados importados do catálogo Duotone</p>
            <p className="text-xs mt-1 opacity-80">
              Revise e ajuste os campos se necessário
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome do Produto *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Core XR7 12m"
              required
              className={cn(isFromSupplier && nome && "border-blue-300 dark:border-blue-700")}
            />
          </div>

          {isFromSupplier && supplierData?.brand && (
            <div>
              <Label className="text-muted-foreground">Marca</Label>
              <p className="text-sm font-medium mt-1">{supplierData.brand}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo">Categoria</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PRODUTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tamanho">Tamanho</Label>
              <Input
                id="tamanho"
                value={tamanho}
                onChange={(e) => setTamanho(e.target.value)}
                placeholder="12m, M, 42..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="custo">Preço de Custo (R$)</Label>
              <Input
                id="custo"
                type="number"
                step="0.01"
                value={custPrice}
                onChange={(e) => handleCostChange(e.target.value)}
                placeholder="0,00"
                className={cn(isFromSupplier && custPrice && "border-blue-300 dark:border-blue-700")}
              />
            </div>
            <div>
              <Label htmlFor="venda">
                Preço de Venda (R$)
                {isFromSupplier && <span className="text-xs text-muted-foreground ml-1">(+40%)</span>}
              </Label>
              <Input
                id="venda"
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0,00"
                className={cn(isFromSupplier && salePrice && "border-blue-300 dark:border-blue-700")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="qtd">Quantidade Inicial</Label>
            <Input
              id="qtd"
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-24"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !nome.trim()}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Cadastrar e Dar Entrada"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
