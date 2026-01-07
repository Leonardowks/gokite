import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Send, CheckCircle, Loader2 } from "lucide-react";
import { PublicTradeIn } from "@/hooks/usePublicTradeIns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InteresseDialogProps {
  item: PublicTradeIn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WHATSAPP_NUMBER = "5548984091618";

export function InteresseDialog({ item, open, onOpenChange }: InteresseDialogProps) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!item) return null;

  const nomeEquipamento = [item.marca, item.modelo, item.tamanho]
    .filter(Boolean)
    .join(" ") || item.equipamento_recebido;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Criar contato no CRM
      const { error } = await supabase
        .from("contatos_inteligencia")
        .insert({
          nome,
          telefone: telefone.replace(/\D/g, ''),
          origem: "catalogo_usados",
          interesse_principal: `Trade-in: ${nomeEquipamento}`,
          status: "novo",
          ultima_mensagem: mensagem || `Interesse no equipamento: ${nomeEquipamento} - R$ ${item.valor_entrada.toLocaleString('pt-BR')}`,
          prioridade: "alta",
        });

      if (error) throw error;

      setSuccess(true);
      toast.success("Interesse registrado com sucesso!");
      
      // Reset após 2s
      setTimeout(() => {
        setSuccess(false);
        setNome("");
        setTelefone("");
        setMensagem("");
        onOpenChange(false);
      }, 2000);

    } catch (error) {
      console.error("Erro ao registrar interesse:", error);
      toast.error("Erro ao enviar. Tente via WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! Vi no catálogo de usados e tenho interesse:\n\n` +
      `📦 *${nomeEquipamento}*\n` +
      `💰 R$ ${item.valor_entrada.toLocaleString('pt-BR')}\n\n` +
      `${mensagem ? `Mensagem: ${mensagem}` : 'Gostaria de mais informações!'}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tenho Interesse!</DialogTitle>
          <DialogDescription>
            {nomeEquipamento} - R$ {item.valor_entrada.toLocaleString('pt-BR')}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Interesse Registrado!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Nossa equipe entrará em contato em breve.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Seu Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como podemos te chamar?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">WhatsApp *</Label>
              <Input
                id="telefone"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensagem">Mensagem (opcional)</Label>
              <Textarea
                id="mensagem"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Dúvidas ou informações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button type="submit" disabled={loading} className="w-full gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar Interesse
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleWhatsApp}
                className="w-full gap-2 border-green-600 text-green-600 hover:bg-green-50"
              >
                <Phone className="h-4 w-4" />
                Falar no WhatsApp
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
