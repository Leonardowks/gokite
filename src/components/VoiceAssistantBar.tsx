import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Check, 
  X, 
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { toast } from "sonner";

export function VoiceAssistantBar() {
  const navigate = useNavigate();
  const {
    isListening,
    isProcessing,
    transcript,
    lastResult,
    error,
    startListening,
    stopListening,
    isSupported,
  } = useVoiceAssistant();

  // Early return MUST come after all hooks
  const shouldRender = isSupported;

  // Keyboard shortcut
  useEffect(() => {
    if (!shouldRender) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "j") {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else if (!isProcessing) {
          startListening();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shouldRender, isListening, isProcessing, startListening, stopListening]);

  // Handle navigation from voice result
  useEffect(() => {
    if (!shouldRender) return;
    
    if (lastResult?.success && lastResult.navigation?.route) {
      navigate(lastResult.navigation.route);
      toast.success(`Navegando para ${lastResult.navigation.pagina}`);
    }
  }, [shouldRender, lastResult, navigate]);

  if (!shouldRender) {
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

  const orbClasses = cn(
    "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
    {
      "bg-gradient-to-br from-primary to-cyan animate-pulse-soft shadow-lg shadow-primary/30": orbState === "idle",
      "bg-gradient-to-br from-destructive to-orange-500 animate-pulse shadow-lg shadow-destructive/40": orbState === "listening",
      "bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/30": orbState === "processing",
      "bg-gradient-to-br from-success to-emerald-400 shadow-lg shadow-success/30": orbState === "success",
      "bg-gradient-to-br from-destructive to-red-400 shadow-lg shadow-destructive/30": orbState === "error",
    }
  );

  return (
    <div className="flex items-center gap-2 flex-1 max-w-xl">
      {/* Voice Orb Button */}
      <button
        onClick={() => {
          if (isListening) {
            stopListening();
          } else if (!isProcessing) {
            startListening();
          }
        }}
        disabled={isProcessing}
        className={cn(
          "relative group",
          isProcessing && "cursor-wait"
        )}
      >
        <div className={orbClasses}>
          {/* Ripple effect when listening */}
          {isListening && (
            <>
              <div className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-destructive/20 animate-pulse" style={{ animationDelay: '0.2s' }} />
            </>
          )}
          
          {/* Icon */}
          {isProcessing ? (
            <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
          ) : isListening ? (
            <MicOff className="h-5 w-5 text-destructive-foreground" />
          ) : lastResult?.success ? (
            <Check className="h-5 w-5 text-success-foreground" />
          ) : error ? (
            <X className="h-5 w-5 text-destructive-foreground" />
          ) : (
            <Mic className="h-5 w-5 text-primary-foreground" />
          )}
        </div>
      </button>

      {/* Transcription Area */}
      <div className="flex-1 min-w-0">
        <div 
          onClick={() => navigate("/assistente")}
          className={cn(
            "h-10 px-4 rounded-xl border transition-all duration-300 flex items-center gap-2 cursor-pointer",
            "bg-background/50 backdrop-blur-sm",
            isListening && "border-destructive/50 bg-destructive/5",
            isProcessing && "border-primary/50 bg-primary/5",
            !isListening && !isProcessing && "border-border/50 hover:border-primary/30 hover:bg-primary/5"
          )}
        >
          {transcript ? (
            <p className="text-sm text-foreground truncate">{transcript}</p>
          ) : lastResult?.message ? (
            <p className={cn(
              "text-sm truncate",
              lastResult.success ? "text-success" : "text-destructive"
            )}>
              {lastResult.message}
            </p>
          ) : error ? (
            <p className="text-sm text-destructive truncate">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {isListening ? "Ouvindo..." : "Fale com Jarvis ou clique aqui..."}
            </p>
          )}
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl</kbd>
        <span>+</span>
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">J</kbd>
      </div>
    </div>
  );
}
