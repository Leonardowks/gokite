import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useScannerFeedback } from "@/hooks/useScannerFeedback";

const equipamentoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  tipo: z.string().min(1, "Selecione um tipo"),
  tamanho: z.string().optional(),
  localizacao: z.string().min(1, "Selecione uma localização"),
  preco_aluguel_dia: z.number().min(0, "Preço não pode ser negativo"),
  cost_price: z.number().min(0).optional(),
  sale_price: z.number().min(0).optional(),
  ean: z.string().optional(),
  status: z.string().default("disponivel"),
});

type EquipamentoForm = z.infer<typeof equipamentoSchema>;

interface EquipamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tiposEquipamento = [
  { value: "kite", label: "🪁 Kite" },
  { value: "wing", label: "🦅 Wing" },
  { value: "barra", label: "🎛️ Barra" },
  { value: "prancha_twintip", label: "🏄 Twintip" },
  { value: "prancha_kitewave", label: "🌊 Kitewave" },
  { value: "prancha_foil", label: "🚀 Prancha Foil" },
  { value: "foil_asa", label: "✈️ Asa de Foil" },
  { value: "mastro_foil", label: "📏 Mastro Foil" },
  { value: "trapezio", label: "🎽 Trapézio" },
  { value: "wetsuit", label: "🤿 Wetsuit" },
  { value: "acessorio", label: "🔧 Acessório" },
];

const localizacoes = [
  { value: "florianopolis", label: "Florianópolis" },
  { value: "taiba", label: "Taíba" },
];

export function EquipamentoDialog({ open, onOpenChange }: EquipamentoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { feedback } = useScannerFeedback();

  const form = useForm<EquipamentoForm>({
    resolver: zodResolver(equipamentoSchema),
    defaultValues: {
      nome: "",
      tipo: "",
      tamanho: "",
      localizacao: "florianopolis",
      preco_aluguel_dia: 0,
      cost_price: undefined,
      sale_price: undefined,
      ean: "",
      status: "disponivel",
    },
  });

  const onSubmit = async (data: EquipamentoForm) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("equipamentos").insert({
        nome: data.nome,
        tipo: data.tipo,
        tamanho: data.tamanho || null,
        localizacao: data.localizacao,
        preco_aluguel_dia: data.preco_aluguel_dia,
        cost_price: data.cost_price || null,
        sale_price: data.sale_price || null,
        ean: data.ean || null,
        status: data.status,
        source_type: "owned",
        quantidade_fisica: 1,
      });

      if (error) throw error;

      feedback('confirm');
      toast.success("Equipamento cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      feedback('error');
      toast.error("Erro ao cadastrar equipamento: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Novo Equipamento</DialogTitle>
              <DialogDescription>
                Cadastre um novo equipamento no estoque
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Equipamento *</Label>
            <Input
              id="nome"
              placeholder="Ex: Kite Duotone Neo 9m 2024"
              {...form.register("nome")}
            />
            {form.formState.errors.nome && (
              <p className="text-sm text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>

          {/* Tipo e Tamanho */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={form.watch("tipo")}
                onValueChange={(value) => form.setValue("tipo", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tiposEquipamento.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.tipo && (
                <p className="text-sm text-destructive">{form.formState.errors.tipo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tamanho">Tamanho</Label>
              <Input
                id="tamanho"
                placeholder="Ex: 9m, M, 140x42"
                {...form.register("tamanho")}
              />
            </div>
          </div>

          {/* Localização */}
          <div className="space-y-2">
            <Label>Localização *</Label>
            <Select
              value={form.watch("localizacao")}
              onValueChange={(value) => form.setValue("localizacao", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {localizacoes.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preco_aluguel_dia">Aluguel/dia *</Label>
              <Input
                id="preco_aluguel_dia"
                type="number"
                placeholder="0"
                {...form.register("preco_aluguel_dia", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_price">Custo</Label>
              <Input
                id="cost_price"
                type="number"
                placeholder="0"
                {...form.register("cost_price", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_price">Venda</Label>
              <Input
                id="sale_price"
                type="number"
                placeholder="0"
                {...form.register("sale_price", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* EAN */}
          <div className="space-y-2">
            <Label htmlFor="ean">Código de Barras (EAN)</Label>
            <Input
              id="ean"
              placeholder="Opcional"
              className="font-mono"
              {...form.register("ean")}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
