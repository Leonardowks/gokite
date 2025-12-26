import { useNavigate } from "react-router-dom";
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Bot,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { toast } from "sonner";
import { useEffect } from "react";

interface VoiceAssistantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceAssistantSheet({ open, onOpenChange }: VoiceAssistantSheetProps) {
  const navigate = useNavigate();
  const {
    isListening,
    isProcessing,
    transcript,
    lastResult,
    error,
    startListening,
    stopListening,
    reset,
    isSupported,
  } = useVoiceAssistant();

  // Reset when opening
  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  // Handle navigation from voice result
  useEffect(() => {
    if (lastResult?.success && lastResult.navigation?.route) {
      navigate(lastResult.navigation.route);
      onOpenChange(false);
      toast.success(`Navegando para ${lastResult.navigation.pagina}`);
    }
  }, [lastResult, navigate, onOpenChange]);

  if (!isSupported) {
    return null;
  }

  const getOrbState = () => {
    if (isListening) return "listening";
    if (isProcessing) return "processing";
    if (lastResult?.success) return "success";
    if (error) return "error";
    return "idle";
  };

  const orbState = getOrbState();

  const goToFullAssistant = () => {
    onOpenChange(false);
    navigate("/assistente");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              Jarvis
            </SheetTitle>
          </SheetHeader>

          {/* Voice Orb */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
            <button
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else if (!isProcessing) {
                  startListening();
                }
              }}
              disabled={isProcessing}
              className="relative"
            >
              {/* Outer rings */}
              {isListening && (
                <>
                  <div className="absolute inset-0 -m-4 rounded-full bg-destructive/20 animate-ping" />
                  <div className="absolute inset-0 -m-8 rounded-full bg-destructive/10 animate-pulse" style={{ animationDelay: '0.3s' }} />
                </>
              )}
              
              {/* Main orb */}
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
                {
                  "bg-gradient-to-br from-primary to-cyan shadow-2xl shadow-primary/30": orbState === "idle",
                  "bg-gradient-to-br from-destructive to-orange-500 shadow-2xl shadow-destructive/40": orbState === "listening",
                  "bg-gradient-to-br from-primary to-violet-500 shadow-2xl shadow-primary/30": orbState === "processing",
                  "bg-gradient-to-br from-success to-emerald-400 shadow-2xl shadow-success/30": orbState === "success",
                  "bg-gradient-to-br from-destructive to-red-400 shadow-2xl shadow-destructive/30": orbState === "error",
                }
              )}>
                {isProcessing ? (
                  <Loader2 className="h-10 w-10 text-primary-foreground animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-10 w-10 text-destructive-foreground" />
                ) : (
                  <Mic className="h-10 w-10 text-primary-foreground" />
                )}
              </div>
            </button>

            {/* Status text */}
            <div className="text-center max-w-xs">
              {transcript ? (
                <p className="text-lg font-medium">{transcript}</p>
              ) : lastResult?.message ? (
                <p className={cn(
                  "text-lg font-medium",
                  lastResult.success ? "text-success" : "text-destructive"
                )}>
                  {lastResult.message}
                </p>
              ) : error ? (
                <p className="text-lg font-medium text-destructive">{error}</p>
              ) : (
                <p className="text-muted-foreground">
                  {isListening ? "Ouvindo..." : "Toque para falar"}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {!isListening && !isProcessing && (
                <Button
                  size="lg"
                  onClick={startListening}
                  className="rounded-full"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  Falar comando
                </Button>
              )}
              
              <Button
                variant="outline"
                size="lg"
                onClick={goToFullAssistant}
                className="rounded-full"
              >
                <Bot className="h-5 w-5 mr-2" />
                Abrir assistente completo
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
