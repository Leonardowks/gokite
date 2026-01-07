import { useState } from "react";
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
import { Package, Loader2 } from "lucide-react";
import { useCadastrarProduto } from "@/hooks/useReceberMercadoria";

interface CadastroRapidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ean: string;
  onSuccess: () => void;
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

export function CadastroRapidoDialog({
  open,
  onOpenChange,
  ean,
  onSuccess,
}: CadastroRapidoDialogProps) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("acessorio");
  const [tamanho, setTamanho] = useState("");
  const [custPrice, setCustPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [quantidade, setQuantidade] = useState("1");

  const { mutate: cadastrar, isPending } = useCadastrarProduto();

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
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Cadastrar Novo Produto</DialogTitle>
              <DialogDescription>
                EAN: <span className="font-mono font-medium">{ean}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome do Produto *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Core XR7 12m"
              required
            />
          </div>

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
              />
            </div>
            <div>
              <Label htmlFor="venda">Preço de Venda (R$)</Label>
              <Input
                id="venda"
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0,00"
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
