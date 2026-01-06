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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Save, Sparkles, TrendingUp, TrendingDown, CreditCard, Landmark } from "lucide-react";
import { useCreateTransacao, useConfigFinanceiro, getTaxaCartao } from "@/hooks/useTransacoes";
import type { ParsedTransaction } from "./QuickFinancialEntry";

interface NovaTransacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ParsedTransaction | null;
}

export function NovaTransacaoDialog({ open, onOpenChange, initialData }: NovaTransacaoDialogProps) {
  const createTransacao = useCreateTransacao();
  const { data: config } = useConfigFinanceiro();

  const [formData, setFormData] = useState({
    tipo: "receita" as "receita" | "despesa",
    valor_bruto: 0,
    custo_produto: 0,
    descricao: "",
    forma_pagamento: "pix" as "pix" | "dinheiro" | "cartao_credito" | "cartao_debito",
    parcelas: 1,
    centro_de_custo: "Loja" as "Loja" | "Escola" | "Administrativo" | "Pousada",
    origem: "manual",
  });

  // Preencher com dados iniciais da IA
  useEffect(() => {
    if (initialData && open) {
      setFormData({
        tipo: initialData.tipo,
        valor_bruto: initialData.valor_bruto,
        custo_produto: initialData.custo_produto || 0,
        descricao: initialData.descricao,
        forma_pagamento: initialData.forma_pagamento,
        parcelas: initialData.parcelas || 1,
        centro_de_custo: initialData.centro_de_custo as any || "Loja",
        origem: initialData.origem || "manual",
      });
    }
  }, [initialData, open]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setFormData({
        tipo: "receita",
        valor_bruto: 0,
        custo_produto: 0,
        descricao: "",
        forma_pagamento: "pix",
        parcelas: 1,
        centro_de_custo: "Loja",
        origem: "manual",
      });
    }
  }, [open]);

  // Calcular preview das taxas e lucro
  const taxaCartaoPercent = formData.forma_pagamento === "pix"
    ? (config?.taxa_pix || 0)
    : getTaxaCartao(config?.taxas_cartao, formData.forma_pagamento, formData.parcelas);

  const taxaImpostoPercent = config?.taxa_imposto_padrao || 6;

  const taxaCartaoValor = formData.tipo === "receita"
    ? (formData.valor_bruto * taxaCartaoPercent) / 100
    : 0;

  const impostoValor = formData.tipo === "receita"
    ? (formData.valor_bruto * taxaImpostoPercent) / 100
    : 0;

  const lucroLiquido = formData.tipo === "receita"
    ? formData.valor_bruto - formData.custo_produto - taxaCartaoValor - impostoValor
    : -formData.valor_bruto;

  const margemPercent = formData.valor_bruto > 0
    ? (lucroLiquido / formData.valor_bruto) * 100
    : 0;

  const handleSubmit = async () => {
    if (formData.valor_bruto <= 0) {
      toast.error("Informe o valor da transação");
      return;
    }

    if (!formData.descricao.trim()) {
      toast.error("Informe a descrição");
      return;
    }

    try {
      await createTransacao.mutateAsync({
        tipo: formData.tipo,
        valor_bruto: formData.valor_bruto,
        custo_produto: formData.custo_produto,
        descricao: formData.descricao,
        forma_pagamento: formData.forma_pagamento,
        parcelas: formData.parcelas,
        centro_de_custo: formData.centro_de_custo,
        origem: formData.origem,
      });

      toast.success("Transação registrada!", {
        description: `Lucro líquido: R$ ${lucroLiquido.toFixed(2)}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("[NovaTransacaoDialog] Error:", error);
      toast.error("Erro ao salvar transação");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Nova Transação</DialogTitle>
            {initialData && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Preenchido por IA
              </Badge>
            )}
          </div>
          <DialogDescription>
            {initialData
              ? "Revise os dados extraídos e confirme"
              : "Preencha os dados da transação"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={formData.tipo === "receita" ? "default" : "outline"}
              className={formData.tipo === "receita" ? "bg-success hover:bg-success/90" : ""}
              onClick={() => setFormData((prev) => ({ ...prev, tipo: "receita" }))}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Receita
            </Button>
            <Button
              type="button"
              variant={formData.tipo === "despesa" ? "default" : "outline"}
              className={formData.tipo === "despesa" ? "bg-destructive hover:bg-destructive/90" : ""}
              onClick={() => setFormData((prev) => ({ ...prev, tipo: "despesa" }))}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Despesa
            </Button>
          </div>

          {/* Valor e Custo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_bruto">Valor Bruto *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="valor_bruto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_bruto || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      valor_bruto: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            {formData.tipo === "receita" && (
              <div className="space-y-2">
                <Label htmlFor="custo_produto">Custo do Produto</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="custo_produto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.custo_produto || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        custo_produto: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              placeholder="Ex: Kite North Rebel 12m usado"
              value={formData.descricao}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, descricao: e.target.value }))
              }
              rows={2}
            />
          </div>

          {/* Forma de Pagamento e Parcelas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    forma_pagamento: v as any,
                    parcelas: v === "pix" || v === "dinheiro" ? 1 : prev.parcelas,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.forma_pagamento === "cartao_credito" && (
              <div className="space-y-2">
                <Label htmlFor="parcelas">Parcelas</Label>
                <Select
                  value={String(formData.parcelas)}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, parcelas: parseInt(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x {n === 1 ? "(à vista)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Centro de Custo */}
          <div className="space-y-2">
            <Label>Centro de Custo</Label>
            <Select
              value={formData.centro_de_custo}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, centro_de_custo: v as any }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Loja">🛒 Loja (Equipamentos)</SelectItem>
                <SelectItem value="Escola">🏫 Escola (Aulas)</SelectItem>
                <SelectItem value="Administrativo">📋 Administrativo</SelectItem>
                <SelectItem value="Pousada">🏠 Pousada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview de Cálculos */}
          {formData.tipo === "receita" && formData.valor_bruto > 0 && (
            <>
              <Separator />
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Cálculo Automático (Trigger)
                </h4>

                <div className="grid gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Bruto</span>
                    <span>R$ {formData.valor_bruto.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      Taxa Cartão ({taxaCartaoPercent.toFixed(2)}%)
                    </span>
                    <span>-R$ {taxaCartaoValor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span className="flex items-center gap-1">
                      <Landmark className="h-3 w-3" />
                      Imposto ({taxaImpostoPercent}%)
                    </span>
                    <span>-R$ {impostoValor.toFixed(2)}</span>
                  </div>
                  {formData.custo_produto > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Custo Produto</span>
                      <span>-R$ {formData.custo_produto.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex justify-between font-semibold">
                    <span className={lucroLiquido >= 0 ? "text-success" : "text-destructive"}>
                      💰 Lucro Líquido
                    </span>
                    <span className={lucroLiquido >= 0 ? "text-success" : "text-destructive"}>
                      R$ {lucroLiquido.toFixed(2)} ({margemPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTransacao.isPending}
            className="gap-2"
          >
            {createTransacao.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Transação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
