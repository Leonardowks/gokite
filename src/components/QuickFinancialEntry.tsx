import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PremiumCard, PremiumCardContent } from "@/components/ui/premium-card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ParsedTransaction {
  tipo: "receita" | "despesa";
  valor_bruto: number;
  custo_produto: number;
  descricao: string;
  forma_pagamento: "pix" | "dinheiro" | "cartao_credito" | "cartao_debito";
  parcelas: number;
  centro_de_custo: "Loja" | "Escola" | "Administrativo";
  origem: string;
}

interface QuickFinancialEntryProps {
  onParsed: (data: ParsedTransaction) => void;
}

export function QuickFinancialEntry({ onParsed }: QuickFinancialEntryProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 10) {
      toast.error("Digite uma descrição mais detalhada", {
        description: "Ex: Vendi Kite 12m por 5000 em 10x no cartão",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("parse-financial-text", {
        body: { text: text.trim() },
      });

      if (error) {
        console.error("[QuickEntry] Error:", error);
        throw new Error(error.message || "Erro ao processar");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.data) {
        throw new Error("Resposta inválida da IA");
      }

      console.log("[QuickEntry] Parsed:", data.data);

      // Chamar callback com dados parseados
      onParsed(data.data as ParsedTransaction);

      // Limpar input após sucesso
      setText("");

      toast.success("Dados extraídos!", {
        description: "Revise e confirme no formulário.",
      });
    } catch (error) {
      console.error("[QuickEntry] Error:", error);
      toast.error("Erro ao processar texto", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <PremiumCard featured gradient="accent" className="overflow-hidden">
      <PremiumCardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center gap-2 text-accent shrink-0">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold text-sm">Lançamento Rápido com IA</span>
          </div>

          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Ex: Vendi Kite Rebel 12m por 5000 em 10x visa, custo foi 3200..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 bg-background/80 border-accent/30 focus:border-accent placeholder:text-muted-foreground/60"
            />

            <Button
              onClick={handleSubmit}
              disabled={isLoading || text.trim().length < 10}
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Processando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Lançar</span>
                  <Send className="h-4 w-4 sm:hidden" />
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2 hidden sm:block">
          Descreva a transação em linguagem natural. A IA extrai valor, forma de pagamento, parcelas e calcula automaticamente taxas e lucro.
        </p>
      </PremiumCardContent>
    </PremiumCard>
  );
}
