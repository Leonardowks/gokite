import { useState } from "react";
import { Search, Package, DollarSign, X, CheckCircle, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { MediaGallery } from "@/components/MediaGallery";
import { CATEGORIAS, CONDICOES, MARCAS_COMUNS, formatNomeEquipamento } from "@/lib/tradeInConfig";
import { useEquipmentAnalysis } from "@/hooks/useEquipmentAnalysis";
import { cn } from "@/lib/utils";

interface TradeInRapidoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClienteOption {
  id: string;
  nome: string;
  telefone: string | null;
}

export function TradeInRapidoDrawer({ open, onOpenChange }: TradeInRapidoDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAnalyzing, analyzeEquipment } = useEquipmentAnalysis();
  
  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteOption | null>(null);
  const [buscando, setBuscando] = useState(false);
  
  // Campos estruturados
  const [categoria, setCategoria] = useState<string>("");
  const [marca, setMarca] = useState<string>("");
  const [modelo, setModelo] = useState<string>("");
  const [tamanho, setTamanho] = useState<string>("");
  const [ano, setAno] = useState<string>("");
  const [condicao, setCondicao] = useState<string>("usado_bom");
  
  const [descricao, setDescricao] = useState("");
  const [valorAcordado, setValorAcordado] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  
  const [salvando, setSalvando] = useState(false);
  const [analisado, setAnalisado] = useState(false);

  // Gera nome do equipamento automaticamente
  const nomeEquipamento = formatNomeEquipamento(marca, modelo, tamanho);

  const buscarClientes = async (termo: string) => {
    if (termo.length < 2) {
      setClientes([]);
      return;
    }
    
    setBuscando(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, telefone")
        .or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%`)
        .limit(5);
      
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setBuscando(false);
    }
  };

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBusca(valor);
    buscarClientes(valor);
  };

  const selecionarCliente = (cliente: ClienteOption) => {
    setClienteSelecionado(cliente);
    setBusca(cliente.nome);
    setClientes([]);
  };

  const resetForm = () => {
    setBusca("");
    setClientes([]);
    setClienteSelecionado(null);
    setCategoria("");
    setMarca("");
    setModelo("");
    setTamanho("");
    setAno("");
    setCondicao("usado_bom");
    setDescricao("");
    setValorAcordado("");
    setFotos([]);
    setAnalisado(false);
  };

  // Análise por IA
  const handleAnalyzeWithAI = async () => {
    if (fotos.length === 0) {
      toast({
        title: "Adicione uma foto",
        description: "É necessário pelo menos uma foto para análise por IA.",
        variant: "destructive",
      });
      return;
    }

    const analysis = await analyzeEquipment(fotos[0]);
    
    if (analysis) {
      // Preencher campos automaticamente
      if (analysis.categoria) setCategoria(analysis.categoria);
      if (analysis.marca) setMarca(analysis.marca);
      if (analysis.modelo) setModelo(analysis.modelo);
      if (analysis.tamanho) setTamanho(analysis.tamanho);
      if (analysis.ano) setAno(analysis.ano.toString());
      if (analysis.condicao) setCondicao(analysis.condicao);
      if (analysis.descricaoComercial) setDescricao(analysis.descricaoComercial);
      
      setAnalisado(true);
    }
  };

  const confirmarEntrada = async () => {
    if (!categoria || !valorAcordado) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe a categoria e valor acordado.",
        variant: "destructive",
      });
      return;
    }

    const valor = parseFloat(valorAcordado.replace(/[^\d,]/g, "").replace(",", "."));
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor válido maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const equipamentoNome = nomeEquipamento || `${CATEGORIAS.find(c => c.value === categoria)?.label || 'Equipamento'}`;

    setSalvando(true);
    try {
      // Criar trade-in com campos estruturados
      const { error: tradeInError } = await supabase.from("trade_ins").insert({
        equipamento_recebido: equipamentoNome,
        descricao: descricao || null,
        valor_entrada: valor,
        status: "em_estoque",
        notas: clienteSelecionado ? `Cliente: ${clienteSelecionado.nome}` : null,
        foto_url: fotos[0] || null,
        categoria,
        marca: marca || null,
        modelo: modelo || null,
        tamanho: tamanho || null,
        ano: ano ? parseInt(ano) : null,
        condicao,
        fotos,
      });

      if (tradeInError) throw tradeInError;

      // Atualizar crédito do cliente se selecionado
      if (clienteSelecionado) {
        const { data: clienteData } = await supabase
          .from("clientes")
          .select("store_credit")
          .eq("id", clienteSelecionado.id)
          .single();

        const creditoAtual = (clienteData?.store_credit as number) || 0;
        
        await supabase
          .from("clientes")
          .update({ store_credit: creditoAtual + valor })
          .eq("id", clienteSelecionado.id);
      }

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ["trade-ins"] });
      queryClient.invalidateQueries({ queryKey: ["trade-ins-summary"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });

      toast({
        title: "✅ Trade-in registrado!",
        description: `${equipamentoNome} entrou no estoque por R$ ${valor.toFixed(2)}`,
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao registrar trade-in:", error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível salvar o trade-in. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  // Anos para o select (últimos 10 anos)
  const anosDisponiveis = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh] flex flex-col">
        <DrawerHeader className="text-left shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-primary" />
            Trade-in Rápido
          </DrawerTitle>
          <DrawerDescription>
            Registre a entrada de equipamento usado
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4 overflow-y-auto flex-1 pb-4">
          {/* Galeria de Fotos - Primeiro para permitir análise IA */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Fotos do Equipamento</Label>
            <MediaGallery
              fotos={fotos}
              onFotosChange={(newFotos) => {
                setFotos(newFotos);
                setAnalisado(false); // Reset análise quando mudar fotos
              }}
              maxFotos={6}
              bucketPath="trade-ins"
            />
            
            {/* Botão de Análise IA */}
            {fotos.length > 0 && (
              <Button
                type="button"
                variant={analisado ? "secondary" : "outline"}
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzing}
                className={cn(
                  "w-full gap-2 min-h-[44px] border-primary/30",
                  analisado && "bg-primary/10 border-primary/50"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando com IA...
                  </>
                ) : analisado ? (
                  <>
                    <Sparkles className="h-4 w-4 text-primary" />
                    Analisado ✓ (clique para re-analisar)
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    ✨ Analisar com IA
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Busca de Cliente */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cliente (opcional)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={busca}
                onChange={handleBuscaChange}
                className="pl-10 min-h-[48px]"
              />
              {buscando && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            
            {/* Resultados da busca */}
            {clientes.length > 0 && (
              <div className="border rounded-lg divide-y bg-background shadow-lg">
                {clientes.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => selecionarCliente(cliente)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium">{cliente.nome}</p>
                    {cliente.telefone && (
                      <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {clienteSelecionado && (
              <div className="flex items-center gap-2 p-2 bg-success/10 border border-success/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">{clienteSelecionado.nome}</span>
                <button
                  onClick={() => {
                    setClienteSelecionado(null);
                    setBusca("");
                  }}
                  className="ml-auto p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Categoria e Marca */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Categoria <span className="text-destructive">*</span>
              </Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Marca</Label>
              <Select value={marca} onValueChange={setMarca}>
                <SelectTrigger className="min-h-[48px]">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Modelo</Label>
              <Input
                placeholder="Ex: Rebel, Evo..."
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="min-h-[48px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Ano</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map((a) => (
                    <SelectItem key={a} value={a.toString()}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tamanho e Condição */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tamanho</Label>
              <Input
                placeholder="Ex: 12m, 142cm..."
                value={tamanho}
                onChange={(e) => setTamanho(e.target.value)}
                className="min-h-[48px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Condição <span className="text-destructive">*</span>
              </Label>
              <Select value={condicao} onValueChange={setCondicao}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDICOES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${c.color}`} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nome gerado automaticamente */}
          {nomeEquipamento && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Nome do equipamento:</p>
              <p className="font-medium">{nomeEquipamento}</p>
            </div>
          )}

          {/* Valor */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Valor Acordado <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="0,00"
                value={valorAcordado}
                onChange={(e) => setValorAcordado(e.target.value)}
                className="pl-10 min-h-[48px] text-lg font-semibold"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Descrição {analisado && <span className="text-primary text-xs">(gerada por IA)</span>}
            </Label>
            <Textarea
              placeholder="Detalhes, danos, peças faltando..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DrawerFooter className="pt-4 shrink-0 border-t">
          <Button
            onClick={confirmarEntrada}
            disabled={salvando || !categoria || !valorAcordado}
            className="w-full min-h-[52px] text-base font-medium gap-2"
          >
            {salvando ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Confirmar Entrada
              </>
            )}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full min-h-[48px]">
              Cancelar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
