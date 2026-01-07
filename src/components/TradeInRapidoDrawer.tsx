import { useState, useRef } from "react";
import { Camera, Search, Package, DollarSign, Upload, X, CheckCircle, Loader2 } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteOption | null>(null);
  const [buscando, setBuscando] = useState(false);
  
  const [equipamento, setEquipamento] = useState("");
  const [descricao, setDescricao] = useState("");
  const [estado, setEstado] = useState<"novo" | "usado">("usado");
  const [valorAcordado, setValorAcordado] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  
  const [salvando, setSalvando] = useState(false);

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

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const tirarFoto = () => {
    fileInputRef.current?.click();
  };

  const removerFoto = () => {
    setFoto(null);
    setFotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setBusca("");
    setClientes([]);
    setClienteSelecionado(null);
    setEquipamento("");
    setDescricao("");
    setEstado("usado");
    setValorAcordado("");
    setFoto(null);
    setFotoPreview(null);
  };

  const confirmarEntrada = async () => {
    if (!equipamento || !valorAcordado) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe o nome do equipamento e valor acordado.",
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

    setSalvando(true);
    try {
      let fotoUrl: string | null = null;

      // Upload da foto se existir
      if (foto) {
        const fileName = `trade-in-${Date.now()}-${foto.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("whatsapp-media")
          .upload(`trade-ins/${fileName}`, foto);

        if (uploadError) {
          console.error("Erro no upload:", uploadError);
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("whatsapp-media")
            .getPublicUrl(`trade-ins/${fileName}`);
          fotoUrl = urlData.publicUrl;
        }
      }

      // Criar trade-in
      const { error: tradeInError } = await supabase.from("trade_ins").insert({
        equipamento_recebido: equipamento,
        descricao: descricao || `${estado === "novo" ? "Novo" : "Usado"}`,
        valor_entrada: valor,
        status: "em_estoque",
        notas: clienteSelecionado ? `Cliente: ${clienteSelecionado.nome}` : undefined,
        foto_url: fotoUrl,
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
        description: `${equipamento} entrou no estoque por R$ ${valor.toFixed(2)}`,
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-primary" />
            Trade-in Rápido
          </DrawerTitle>
          <DrawerDescription>
            Registre a entrada de equipamento usado em menos de 30 segundos
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4 overflow-y-auto flex-1">
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

          {/* Nome do Equipamento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Equipamento <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ex: Rebel 12m 2022"
              value={equipamento}
              onChange={(e) => setEquipamento(e.target.value)}
              className="min-h-[48px]"
            />
          </div>

          {/* Estado e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as "novo" | "usado")}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usado">🔄 Usado</SelectItem>
                  <SelectItem value="novo">✨ Novo</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  className="pl-10 min-h-[48px]"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descrição (opcional)</Label>
            <Textarea
              placeholder="Detalhes, condição, observações..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Foto */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Foto do Equipamento</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFotoChange}
              className="hidden"
            />
            
            {fotoPreview ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border">
                <img
                  src={fotoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={removerFoto}
                  className="absolute top-2 right-2 p-2 bg-background/80 rounded-full hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={tirarFoto}
                className="w-full min-h-[80px] flex flex-col gap-2 border-dashed"
              >
                <Camera className="h-6 w-6" />
                <span className="text-sm">Tirar Foto / Upload</span>
              </Button>
            )}
          </div>
        </div>

        <DrawerFooter className="pt-4">
          <Button
            onClick={confirmarEntrada}
            disabled={salvando || !equipamento || !valorAcordado}
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
