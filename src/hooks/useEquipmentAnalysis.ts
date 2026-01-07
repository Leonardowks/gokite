import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EquipmentAnalysis {
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  tamanho: string | null;
  ano: number | null;
  condicao: string;
  scoreCondicao: number;
  descricaoComercial: string;
  detalhesVisuais: string;
  problemasIdentificados: string[];
}

export function useEquipmentAnalysis() {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<EquipmentAnalysis | null>(null);

  const analyzeEquipment = async (imageUrls: string[]): Promise<EquipmentAnalysis | null> => {
    // Filtrar URLs vazias
    const validUrls = imageUrls.filter(url => url && url.trim() !== "");
    
    if (validUrls.length === 0) {
      toast({
        title: "Nenhuma foto",
        description: "Adicione pelo menos uma foto para análise.",
        variant: "destructive",
      });
      return null;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-equipment", {
        body: { imageUrls: validUrls },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.analysis) {
        setAnalysis(data.analysis);
        const numFotos = data.fotosAnalisadas || validUrls.length;
        toast({
          title: "✨ Análise concluída!",
          description: numFotos > 1 
            ? `${numFotos} fotos analisadas. Campos preenchidos automaticamente.`
            : "Os campos foram preenchidos automaticamente.",
        });
        return data.analysis;
      }

      throw new Error("Resposta inválida da análise");
    } catch (error) {
      console.error("Erro na análise:", error);
      
      let message = "Não foi possível analisar as imagens.";
      if (error instanceof Error) {
        if (error.message.includes("429") || error.message.includes("limite")) {
          message = "Limite de requisições excedido. Aguarde alguns segundos.";
        } else if (error.message.includes("402") || error.message.includes("crédito")) {
          message = "Créditos insuficientes. Adicione créditos na sua conta.";
        } else {
          message = error.message;
        }
      }

      toast({
        title: "Erro na análise",
        description: message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
  };

  return {
    isAnalyzing,
    analysis,
    analyzeEquipment,
    resetAnalysis,
  };
}
