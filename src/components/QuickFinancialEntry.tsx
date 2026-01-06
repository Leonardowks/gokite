import { useState, useRef } from "react";
import { Sparkles, Loader2, Send, Mic, Camera, X, Check, RotateCcw } from "lucide-react";
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
  const [isListening, setIsListening] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  // Image preview state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording with Jarvis
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
      toast.info("🎤 Ouvindo...", { description: "Descreva a transação" });
    } catch (error) {
      console.error("[QuickEntry] Mic error:", error);
      toast.error("Erro ao acessar microfone");
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
      });

      const { data: sttData, error: sttError } = await supabase.functions.invoke("openai-stt", {
        body: { audio: base64Audio },
      });

      if (sttError || !sttData?.text) {
        throw new Error(sttError?.message || "Erro na transcrição");
      }

      const transcribedText = sttData.text;
      console.log("[QuickEntry] Transcribed:", transcribedText);
      
      setText(transcribedText);
      await parseText(transcribedText);
    } catch (error) {
      console.error("[QuickEntry] Audio error:", error);
      toast.error("Erro ao processar áudio");
    } finally {
      setIsLoading(false);
    }
  };

  // Photo capture - show preview first
  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCapturedImage(result);
      setCapturedBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Confirm and process the captured image
  const confirmImage = async () => {
    if (!capturedBase64) return;
    
    setIsProcessingImage(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("extract-receipt", {
        body: { image_base64: capturedBase64 },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Erro no OCR");
      }

      const extracted = data.data;
      console.log("[QuickEntry] OCR result:", extracted);

      const parsed: ParsedTransaction = {
        tipo: "despesa",
        valor_bruto: extracted.valor || 0,
        custo_produto: 0,
        descricao: extracted.descricao || `${extracted.fornecedor || "Compra"} - ${extracted.categoria}`,
        forma_pagamento: "dinheiro",
        parcelas: 1,
        centro_de_custo: mapCategoriaToCentroCusto(extracted.categoria),
        origem: "outros",
      };

      onParsed(parsed);
      clearImage();
      toast.success("Nota fiscal processada!", {
        description: `R$ ${extracted.valor?.toFixed(2)} - ${extracted.descricao || extracted.categoria}`,
      });
    } catch (error) {
      console.error("[QuickEntry] OCR error:", error);
      toast.error("Erro ao processar imagem", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Clear captured image and retake
  const clearImage = () => {
    setCapturedImage(null);
    setCapturedBase64(null);
  };

  const mapCategoriaToCentroCusto = (categoria: string): "Loja" | "Escola" | "Administrativo" => {
    const lojaCategories = ["equipamentos", "produtos"];
    const escolaCategories = ["combustivel", "transporte"];
    
    if (lojaCategories.includes(categoria?.toLowerCase())) return "Loja";
    if (escolaCategories.includes(categoria?.toLowerCase())) return "Escola";
    return "Administrativo";
  };

  const parseText = async (inputText: string) => {
    const textToProcess = inputText || text;
    
    if (!textToProcess.trim() || textToProcess.trim().length < 10) {
      toast.error("Descrição muito curta", {
        description: "Ex: Vendi Kite 12m por 5000 em 10x no cartão",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("parse-financial-text", {
        body: { text: textToProcess.trim() },
      });

      if (error) throw new Error(error.message || "Erro ao processar");
      if (data?.error) throw new Error(data.error);
      if (!data?.data) throw new Error("Resposta inválida da IA");

      console.log("[QuickEntry] Parsed:", data.data);
      onParsed(data.data as ParsedTransaction);
      setText("");
      toast.success("Dados extraídos!", { description: "Revise e confirme no formulário." });
    } catch (error) {
      console.error("[QuickEntry] Parse error:", error);
      toast.error("Erro ao processar texto", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => parseText(text);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isVoiceSupported = typeof navigator !== "undefined" && "mediaDevices" in navigator;
  const isAnyLoading = isLoading || isListening || isProcessingImage;

  // Show image preview mode
  if (capturedImage) {
    return (
      <PremiumCard featured gradient="accent" className="overflow-hidden">
        <PremiumCardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Image Preview */}
            <div className="relative w-32 h-32 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 border-accent/30 shrink-0">
              <img 
                src={capturedImage} 
                alt="Nota fiscal" 
                className="w-full h-full object-cover"
              />
              {isProcessingImage && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex-1 flex flex-col gap-2">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Confirma a imagem para processar?
              </p>
              <div className="flex gap-2 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  onClick={clearImage}
                  disabled={isProcessingImage}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Refazer
                </Button>
                <Button
                  onClick={confirmImage}
                  disabled={isProcessingImage}
                  className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isProcessingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard featured gradient="accent" className="overflow-hidden">
      <PremiumCardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center gap-2 text-accent shrink-0">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold text-sm">Lançamento Rápido com IA</span>
          </div>

          <div className="flex-1 flex gap-2">
            {/* Voice Button */}
            {isVoiceSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading || isProcessingImage}
                className="shrink-0"
                title={isListening ? "Parar gravação" : "Falar com Jarvis"}
              >
                {isListening ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Photo Button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnyLoading}
              className="shrink-0"
              title="Escanear nota fiscal"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />

            {/* Text Input */}
            <Input
              placeholder={isListening ? "🎤 Ouvindo..." : "Ex: Vendi Kite Rebel 12m por 5000 em 10x visa..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAnyLoading}
              className="flex-1 bg-background/80 border-accent/30 focus:border-accent placeholder:text-muted-foreground/60"
            />

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isAnyLoading || text.trim().length < 10}
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
          <Mic className="h-3 w-3 inline mr-1" /> Voz
          <span className="mx-2">•</span>
          <Camera className="h-3 w-3 inline mr-1" /> Foto de nota
          <span className="mx-2">•</span>
          <Sparkles className="h-3 w-3 inline mr-1" /> Texto livre — A IA extrai tudo automaticamente
        </p>
      </PremiumCardContent>
    </PremiumCard>
  );
}
