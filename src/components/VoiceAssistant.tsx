import { useState, useEffect } from 'react';
import { Mic, MicOff, X, Loader2, Check, AlertCircle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { cn } from '@/lib/utils';

export function VoiceAssistant() {
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

  const [isExpanded, setIsExpanded] = useState(false);

  // Keyboard shortcut: Ctrl+J to activate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        if (!isListening && !isProcessing) {
          setIsExpanded(true);
          startListening();
        }
      }
      if (e.key === 'Escape' && isExpanded) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, isProcessing, isExpanded, startListening]);

  const handleClose = () => {
    stopListening();
    setIsExpanded(false);
    setTimeout(reset, 300);
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setIsExpanded(true);
      startListening();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={handleMicClick}
        size="icon"
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-all duration-300",
          isListening 
            ? "bg-red-500 hover:bg-red-600 animate-pulse" 
            : "bg-primary hover:bg-primary/90"
        )}
        title="Assistente de voz (Ctrl+J)"
      >
        {isListening ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-primary" />
                <span className="font-semibold">Assistente GoKite</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Mic animation */}
              <div className="flex justify-center mb-6">
                <div className={cn(
                  "relative flex items-center justify-center h-24 w-24 rounded-full transition-all duration-300",
                  isListening 
                    ? "bg-red-500/20" 
                    : isProcessing 
                      ? "bg-primary/20"
                      : lastResult?.success 
                        ? "bg-green-500/20" 
                        : error 
                          ? "bg-destructive/20"
                          : "bg-muted"
                )}>
                  {/* Pulsing rings when listening */}
                  {isListening && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                      <div className="absolute inset-2 rounded-full bg-red-500/20 animate-pulse" />
                    </>
                  )}
                  
                  {isProcessing ? (
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  ) : lastResult?.success ? (
                    <Check className="h-10 w-10 text-green-500" />
                  ) : error ? (
                    <AlertCircle className="h-10 w-10 text-destructive" />
                  ) : isListening ? (
                    <Mic className="h-10 w-10 text-red-500" />
                  ) : (
                    <Mic className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Status text */}
              <div className="text-center space-y-2">
                {isListening && !transcript && (
                  <p className="text-muted-foreground animate-pulse">
                    Ouvindo... Fale seu comando
                  </p>
                )}

                {transcript && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-1">Você disse:</p>
                    <p className="font-medium">{transcript}</p>
                  </div>
                )}

                {isProcessing && (
                  <p className="text-muted-foreground">
                    Processando comando...
                  </p>
                )}

                {lastResult && (
                  <div className={cn(
                    "rounded-lg p-4 mt-4",
                    lastResult.success 
                      ? "bg-green-500/10 border border-green-500/20" 
                      : "bg-destructive/10 border border-destructive/20"
                  )}>
                    <p className={cn(
                      "font-medium",
                      lastResult.success ? "text-green-600 dark:text-green-400" : "text-destructive"
                    )}>
                      {lastResult.message}
                    </p>
                    {lastResult.intent && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Ação: {lastResult.intent} • Confiança: {Math.round((lastResult.confidence || 0) * 100)}%
                      </p>
                    )}
                  </div>
                )}

                {error && !lastResult && (
                  <p className="text-destructive">{error}</p>
                )}
              </div>

              {/* Examples */}
              {!isListening && !isProcessing && !lastResult && (
                <div className="mt-6 space-y-2">
                  <p className="text-sm text-muted-foreground text-center mb-3">
                    Exemplos de comandos:
                  </p>
                  <div className="grid gap-2 text-sm">
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      💰 "Gastei 200 de gasolina pro bote"
                    </div>
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      👤 "Cadastra cliente João, telefone 11999999999"
                    </div>
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      📅 "Agenda aula com Maria amanhã às 10"
                    </div>
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      📊 "Quanto faturei hoje?"
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-center gap-3 mt-6">
                {!isListening && !isProcessing && (
                  <Button onClick={startListening} className="gap-2">
                    <Mic className="h-4 w-4" />
                    {lastResult ? 'Novo comando' : 'Iniciar'}
                  </Button>
                )}
                {isListening && (
                  <Button onClick={stopListening} variant="destructive" className="gap-2">
                    <MicOff className="h-4 w-4" />
                    Parar
                  </Button>
                )}
              </div>

              {/* Shortcut hint */}
              <p className="text-xs text-muted-foreground text-center mt-4">
                Dica: Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+J</kbd> para ativar rapidamente
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
