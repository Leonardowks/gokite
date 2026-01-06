import { useState, useRef } from "react";
import { Sparkles, Loader2, Send, Mic, Camera, X, Check, RotateCcw, Image } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PremiumCard, PremiumCardContent } from "@/components/ui/premium-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  const isMobile = useIsMobile();

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
    
    // Clear both inputs
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
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

  // Mobile action button component
  const ActionButton = ({
    icon: Icon,
    label,
    onClick,
    disabled,
    variant = "outline",
    className,
    isRecording,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "outline" | "destructive" | "default";
    className?: string;
    isRecording?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-xl border p-3 min-h-[64px] min-w-[64px] transition-all active:scale-95",
        variant === "outline" && "border-border bg-background/80 hover:bg-muted",
        variant === "destructive" && "border-destructive bg-destructive/10 text-destructive",
        isRecording && "animate-pulse border-destructive ring-2 ring-destructive/30",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-label={label}
    >
      <Icon className={cn("h-5 w-5", isRecording && "text-destructive")} />
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </button>
  );

  // Show image preview mode
  if (capturedImage) {
    return (
      <PremiumCard featured gradient="accent" className="overflow-hidden">
        <PremiumCardContent className="p-4">
          <div className="flex flex-col items-center gap-4">
            {/* Image Preview - Larger on mobile */}
            <div className="relative w-48 h-48 md:w-32 md:h-32 rounded-xl overflow-hidden border-2 border-accent/30">
              <img 
                src={capturedImage} 
                alt="Nota fiscal" 
                className="w-full h-full object-cover"
              />
              {isProcessingImage && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {isProcessingImage ? "Processando imagem..." : "Confirma a imagem para processar?"}
            </p>

            {/* Actions - Full width on mobile */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button
                variant="outline"
                onClick={clearImage}
                disabled={isProcessingImage}
                className="gap-2 min-h-[48px] text-base"
              >
                <RotateCcw className="h-5 w-5" />
                Refazer
              </Button>
              <Button
                onClick={confirmImage}
                disabled={isProcessingImage}
                className="gap-2 min-h-[48px] text-base bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isProcessingImage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Confirmar
                  </>
                )}
              </Button>
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <PremiumCard featured gradient="accent" className="overflow-hidden">
        <PremiumCardContent className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 text-accent mb-3">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold text-sm">Lançamento Rápido com IA</span>
          </div>

          {/* Text Input - Full width */}
          <Input
            placeholder={isListening ? "🎤 Ouvindo..." : "Ex: Vendi Kite 12m por 5000..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAnyLoading}
            className={cn(
              "w-full mb-3 min-h-[48px] text-base bg-background/80 border-accent/30 focus:border-accent placeholder:text-muted-foreground/60",
              isListening && "border-destructive ring-2 ring-destructive/30"
            )}
          />

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-4 gap-2">
            {isVoiceSupported && (
              <ActionButton
                icon={isListening ? X : Mic}
                label={isListening ? "Parar" : "Voz"}
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading || isProcessingImage}
                variant={isListening ? "destructive" : "outline"}
                isRecording={isListening}
              />
            )}

            <ActionButton
              icon={Camera}
              label="Foto"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isAnyLoading}
            />

            <ActionButton
              icon={Image}
              label="Galeria"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isAnyLoading}
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isAnyLoading || text.trim().length < 10}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl p-3 min-h-[64px] min-w-[64px] transition-all active:scale-95",
                "bg-accent text-accent-foreground hover:bg-accent/90",
                (isAnyLoading || text.trim().length < 10) && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Lançar transação"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              <span className="text-[10px] font-medium">Lançar</span>
            </button>
          </div>

          {/* Help text - always visible on mobile */}
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            Use voz, foto de nota fiscal ou digite — A IA extrai tudo!
          </p>

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoCapture}
          />
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  // Desktop Layout
  return (
    <PremiumCard featured gradient="accent" className="overflow-hidden">
      <PremiumCardContent className="p-4 sm:p-6">
        <div className="flex flex-row gap-3 items-center">
          <div className="flex items-center gap-2 text-accent shrink-0">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold text-sm">Lançamento Rápido com IA</span>
          </div>

          <TooltipProvider delayDuration={300}>
            <div className="flex-1 flex gap-2">
              {/* Voice Button */}
              {isVoiceSupported && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      onClick={isListening ? stopListening : startListening}
                      disabled={isLoading || isProcessingImage}
                      className={cn("shrink-0", isListening && "animate-pulse")}
                    >
                      {isListening ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-medium">{isListening ? "Parar gravação" : "Falar com Jarvis"}</p>
                    <p className="text-xs text-muted-foreground">
                      {isListening ? "Clique para parar" : "Descreva a transação por voz"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Camera Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isAnyLoading}
                    className="shrink-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">Tirar foto</p>
                  <p className="text-xs text-muted-foreground">Fotografe uma nota fiscal ou recibo</p>
                </TooltipContent>
              </Tooltip>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoCapture}
              />

              {/* Gallery Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isAnyLoading}
                    className="shrink-0"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">Escolher da galeria</p>
                  <p className="text-xs text-muted-foreground">Selecione uma imagem existente</p>
                </TooltipContent>
              </Tooltip>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
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
                className={cn(
                  "flex-1 bg-background/80 border-accent/30 focus:border-accent placeholder:text-muted-foreground/60",
                  isListening && "border-destructive ring-2 ring-destructive/30"
                )}
              />

              {/* Submit Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSubmit}
                    disabled={isAnyLoading || text.trim().length < 10}
                    className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Lançar</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">Processar com IA</p>
                  <p className="text-xs text-muted-foreground">Extrai dados e abre formulário preenchido</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          <Mic className="h-3 w-3 inline mr-1" /> Voz
          <span className="mx-2">•</span>
          <Camera className="h-3 w-3 inline mr-1" /> Câmera
          <span className="mx-2">•</span>
          <Image className="h-3 w-3 inline mr-1" /> Galeria
          <span className="mx-2">•</span>
          <Sparkles className="h-3 w-3 inline mr-1" /> Texto livre — A IA extrai tudo
        </p>
      </PremiumCardContent>
    </PremiumCard>
  );
}
