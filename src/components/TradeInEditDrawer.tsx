import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
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
import { Loader2, Save, Sparkles, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { MediaGallery } from "@/components/MediaGallery";
import { useUpdateTradeIn, TradeIn } from "@/hooks/useTradeIns";
import { useEquipmentAnalysis } from "@/hooks/useEquipmentAnalysis";
import { CATEGORIAS, CONDICOES, MARCAS_COMUNS } from "@/lib/tradeInConfig";
import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TradeInEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeIn: TradeIn | null;
}

export function TradeInEditDrawer({ open, onOpenChange, tradeIn }: TradeInEditDrawerProps) {
  const updateMutation = useUpdateTradeIn();
  const { analyzeEquipment, isAnalyzing } = useEquipmentAnalysis();

  // Form state
  const [equipamentoRecebido, setEquipamentoRecebido] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [condicao, setCondicao] = useState("usado_bom");
  const [valorEntrada, setValorEntrada] = useState("");
  const [descricao, setDescricao] = useState("");
  const [notas, setNotas] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Populate form when drawer opens with a tradeIn
  useEffect(() => {
    if (open && tradeIn) {
      setEquipamentoRecebido(tradeIn.equipamento_recebido || "");
      setCategoria(tradeIn.categoria || "");
      setMarca(tradeIn.marca || "");
      setModelo(tradeIn.modelo || "");
      setAno(tradeIn.ano?.toString() || "");
      setTamanho(tradeIn.tamanho || "");
      setCondicao(tradeIn.condicao || "usado_bom");
      setValorEntrada(tradeIn.valor_entrada?.toString() || "");
      setDescricao(tradeIn.descricao || "");
      setNotas(tradeIn.notas || "");
      setFotos(Array.isArray(tradeIn.fotos) ? tradeIn.fotos : []);

      // Pre-fill estruturado a partir do nome/descrição quando vier vazio (trade-ins antigos)
      const nome = tradeIn.equipamento_recebido || "";
      const desc = tradeIn.descricao || "";

      if (!tradeIn.marca) {
        const lower = nome.toLowerCase();
        const match = MARCAS_COMUNS.find((m) => lower.startsWith(m.toLowerCase()));
        if (match) setMarca(match);
      }

      if (!tradeIn.tamanho) {
        const sizeMatch = nome.match(/\b(\d{1,2}(?:\.\d)?)\s*m\b/i);
        if (sizeMatch?.[1]) setTamanho(`${sizeMatch[1]}m`);
      }

      if (!tradeIn.ano) {
        const yearMatch = (nome + " " + desc).match(/\b(20\d{2})\b/);
        if (yearMatch?.[1]) setAno(yearMatch[1]);
      }

      if (!tradeIn.modelo && nome) {
        // remove marca do começo e tamanho do fim para tentar achar "modelo"
        let modelCandidate = nome;
        const currentMarca = (tradeIn.marca || "") || (MARCAS_COMUNS.find((m) => nome.toLowerCase().startsWith(m.toLowerCase())) || "");
        if (currentMarca) {
          modelCandidate = modelCandidate.replace(new RegExp(`^${currentMarca}\\s*`, "i"), "");
        }
        modelCandidate = modelCandidate.replace(/\b\d{1,2}(?:\.\d)?\s*m\b/i, "").trim();
        if (modelCandidate) setModelo(modelCandidate);
      }
    }
  }, [open, tradeIn]);

  const handleAnalyzeWithAI = async () => {
    if (fotos.length === 0) {
      toast.error("Adicione pelo menos uma foto para análise");
      return;
    }

    const result = await analyzeEquipment(fotos);
    if (result) {
      if (result.categoria) setCategoria(result.categoria);
      if (result.marca) setMarca(result.marca);
      if (result.modelo) setModelo(result.modelo);
      if (result.tamanho) setTamanho(result.tamanho);
      if (result.ano) setAno(result.ano.toString());
      if (result.condicao) setCondicao(result.condicao);
      toast.success("Análise concluída!", {
        description: "Campos atualizados com base na análise da IA"
      });
    }
  };

  const handleSalvar = async () => {
    if (!tradeIn) return;

    const valor = parseFloat(valorEntrada);
    if (!valorEntrada || Number.isNaN(valor) || valor <= 0) {
      toast.error("Informe um valor de entrada válido");
      return;
    }

    if (!equipamentoRecebido.trim()) {
      toast.error("Informe o nome do equipamento");
      return;
    }

    setSalvando(true);
    try {
      await updateMutation.mutateAsync({
        id: tradeIn.id,
        equipamento_recebido: equipamentoRecebido.trim(),
        descricao: descricao || null,
        valor_entrada: valor,
        categoria: categoria || null,
        marca: marca || null,
        modelo: modelo || null,
        tamanho: tamanho || null,
        ano: ano ? parseInt(ano) : null,
        condicao: condicao || null,
        notas: notas || null,
        fotos,
      });

      toast.success("Trade-in atualizado!", {
        description: "As alterações foram salvas com sucesso.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar trade-in:", error);
      toast.error("Erro ao salvar", {
        description: "Não foi possível atualizar o trade-in.",
      });
    } finally {
      setSalvando(false);
    }
  };

  if (!tradeIn) return null;

  const diasEmEstoque = differenceInDays(new Date(), new Date(tradeIn.data_entrada));
  const dataEntradaFormatada = format(new Date(tradeIn.data_entrada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="flex items-center gap-2 text-xl">
            Editar Trade-in
          </DrawerTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Entrada: {dataEntradaFormatada}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span className={cn(
                diasEmEstoque > 60 ? "text-destructive font-medium" : 
                diasEmEstoque > 30 ? "text-yellow-600" : ""
              )}>
                {diasEmEstoque} dias em estoque
              </span>
            </div>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-6">
          {/* Galeria de Fotos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Fotos do Equipamento</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzing || fotos.length === 0}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Analisar com IA
              </Button>
            </div>
            <MediaGallery
              fotos={fotos}
              onFotosChange={setFotos}
              maxFotos={8}
              bucketPath="trade-ins"
            />
          </div>

          {/* Nome do equipamento */}
          <div className="space-y-2">
            <Label htmlFor="equipamentoRecebido">Equipamento</Label>
            <Input
              id="equipamentoRecebido"
              value={equipamentoRecebido}
              onChange={(e) => setEquipamentoRecebido(e.target.value)}
              placeholder="Ex: Ozone Edge V11 10m"
            />
          </div>

          {/* Categoria e Marca */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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
              <Label htmlFor="marca">Marca</Label>
              <Select value={marca} onValueChange={setMarca}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {MARCAS_COMUNS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Modelo e Ano */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ex: Dice SLS"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Input
                id="ano"
                type="number"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                placeholder="Ex: 2023"
                min="2010"
                max={new Date().getFullYear() + 1}
              />
            </div>
          </div>

          {/* Tamanho e Condição */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tamanho">Tamanho</Label>
              <Input
                id="tamanho"
                value={tamanho}
                onChange={(e) => setTamanho(e.target.value)}
                placeholder="Ex: 9m, 140cm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condicao">Condição</Label>
              <Select value={condicao} onValueChange={setCondicao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CONDICOES.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valor de Entrada */}
          <div className="space-y-2">
            <Label htmlFor="valorEntrada">Valor de Entrada (R$)</Label>
            <Input
              id="valorEntrada"
              type="number"
              value={valorEntrada}
              onChange={(e) => setValorEntrada(e.target.value)}
              placeholder="0,00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes do equipamento..."
              rows={2}
            />
          </div>

          {/* Notas Internas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas Internas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observações internas (não visíveis no catálogo)..."
              rows={2}
            />
          </div>
        </div>

        <DrawerFooter className="border-t pt-4">
          <div className="flex gap-3 w-full">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                Cancelar
              </Button>
            </DrawerClose>
            <Button 
              onClick={handleSalvar} 
              disabled={salvando}
              className="flex-1 gap-2"
            >
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
