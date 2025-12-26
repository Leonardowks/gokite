import * as React from 'react';
import { Mic, MicOff, X, Loader2, Check, AlertCircle, Sparkles, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceAssistant, OPENAI_VOICES, type OpenAIVoice } from '@/hooks/useVoiceAssistant';
import { cn } from '@/lib/utils';

export function VoiceAssistant() {
  const {
    isListening,
    isProcessing,
    transcript,
    lastResult,
    error,
    selectedVoice,
    changeVoice,
    startListening,
    stopListening,
    stopAudio,
    reset,
    isSupported,
  } = useVoiceAssistant();

  const [isOpen, setIsOpen] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

  // Keyboard shortcut: Ctrl+J to activate
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        if (!isListening && !isProcessing) {
          setIsOpen(true);
          setTimeout(() => startListening(), 100);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, isProcessing, isOpen, startListening]);

  const handleClose = () => {
    stopListening();
    stopAudio();
    setIsOpen(false);
    setTimeout(reset, 300);
  };

  const handleActivate = () => {
    setIsOpen(true);
    setTimeout(() => startListening(), 100);
  };

  if (!isSupported) {
    return null;
  }

  const getStatusColor = () => {
    if (isListening) return 'from-red-500 to-orange-500';
    if (isProcessing) return 'from-primary to-blue-500';
    if (lastResult?.success) return 'from-green-500 to-emerald-500';
    if (error) return 'from-destructive to-red-500';
    return 'from-primary to-primary/80';
  };

  const getStatusIcon = () => {
    if (isProcessing) return <Loader2 className="h-8 w-8 animate-spin" />;
    if (lastResult?.success) return <Check className="h-8 w-8" />;
    if (error) return <AlertCircle className="h-8 w-8" />;
    if (isListening) return <Mic className="h-8 w-8 animate-pulse" />;
    return <Mic className="h-8 w-8" />;
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleActivate}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl transition-all duration-300",
          "bg-gradient-to-br from-primary to-primary/80 hover:scale-110 hover:shadow-2xl",
          "flex items-center justify-center text-primary-foreground",
          isOpen && "opacity-0 pointer-events-none scale-75"
        )}
        title="Assistente de voz (Ctrl+J)"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Voice Assistant Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/60 backdrop-blur-md animate-in fade-in duration-200"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className={cn(
            "relative w-full max-w-sm bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl",
            "animate-in slide-in-from-bottom-4 fade-in duration-300"
          )}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  isListening ? "bg-red-500 animate-pulse" : 
                  isProcessing ? "bg-primary animate-pulse" : 
                  "bg-green-500"
                )} />
                <span className="font-medium text-sm">
                  {isListening ? 'Ouvindo...' : isProcessing ? 'Processando...' : 'Assistente GoKite'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-8 w-8 rounded-full hover:bg-muted/50",
                    showSettings && "bg-muted"
                  )}
                  onClick={() => setShowSettings(!showSettings)}
                  title="Configurações de voz"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-muted/50"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Voice Settings Panel */}
            {showSettings && (
              <div className="px-6 py-4 border-b border-border/30 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-3">Escolha a voz do assistente:</p>
                <div className="grid grid-cols-2 gap-2">
                  {OPENAI_VOICES.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => changeVoice(voice.id)}
                      className={cn(
                        "flex flex-col items-start px-3 py-2 rounded-xl text-left transition-all",
                        "border hover:border-primary/50",
                        selectedVoice === voice.id
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-background/50 border-border/50"
                      )}
                    >
                      <span className="text-sm font-medium">{voice.name}</span>
                      <span className="text-[10px] text-muted-foreground">{voice.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="p-6 flex flex-col items-center">
              {/* Animated Orb */}
              <div className="relative mb-6">
                {/* Outer glow */}
                {(isListening || isProcessing) && (
                  <div className={cn(
                    "absolute inset-0 rounded-full bg-gradient-to-br opacity-30 blur-xl scale-150",
                    getStatusColor()
                  )} />
                )}
                
                {/* Pulsing rings */}
                {isListening && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping" />
                    <div className="absolute inset-2 rounded-full border border-red-500/30 animate-pulse" />
                  </>
                )}

                {/* Main orb */}
                <div className={cn(
                  "relative h-24 w-24 rounded-full flex items-center justify-center transition-all duration-500",
                  "bg-gradient-to-br text-white shadow-lg",
                  getStatusColor()
                )}>
                  {getStatusIcon()}
                </div>
              </div>

              {/* Status Messages */}
              <div className="w-full text-center space-y-3 min-h-[80px]">
                {isListening && !transcript && (
                  <p className="text-muted-foreground text-sm animate-pulse">
                    Fale seu comando...
                  </p>
                )}

                {transcript && (
                  <div className="bg-muted/50 rounded-2xl px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Você disse:</p>
                    <p className="font-medium text-sm">{transcript}</p>
                  </div>
                )}

                {lastResult && (
                  <div className={cn(
                    "rounded-2xl px-4 py-3 transition-all",
                    lastResult.success 
                      ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                      : "bg-destructive/10 text-destructive"
                  )}>
                    <p className="text-sm font-medium">{lastResult.message}</p>
                    {lastResult.intent && (
                      <p className="text-xs opacity-70 mt-1">
                        {lastResult.intent} • {Math.round((lastResult.confidence || 0) * 100)}%
                      </p>
                    )}
                  </div>
                )}

                {error && !lastResult && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              {/* Quick Commands */}
              {!isListening && !isProcessing && !lastResult && (
                <div className="w-full mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground text-center mb-2">
                    Experimente dizer:
                  </p>
                  <div className="grid gap-1.5 text-xs">
                    {[
                      '💰 "Gastei 200 de gasolina"',
                      '👤 "Cadastra cliente João"',
                      '📅 "Agenda aula amanhã às 10"',
                      '📊 "Quanto faturei hoje?"'
                    ].map((example, i) => (
                      <div key={i} className="bg-muted/30 rounded-xl px-3 py-2 text-muted-foreground">
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-6 pt-2 flex justify-center gap-3">
              {isListening ? (
                <Button 
                  onClick={stopListening} 
                  variant="destructive" 
                  className="rounded-full px-6 gap-2"
                >
                  <MicOff className="h-4 w-4" />
                  Parar
                </Button>
              ) : isProcessing ? (
                <Button disabled className="rounded-full px-6 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguarde...
                </Button>
              ) : (
                <Button 
                  onClick={startListening} 
                  className="rounded-full px-6 gap-2 bg-gradient-to-r from-primary to-primary/80"
                >
                  <Mic className="h-4 w-4" />
                  {lastResult ? 'Novo comando' : 'Falar'}
                </Button>
              )}
            </div>

            {/* Keyboard hint */}
            <div className="pb-4 text-center">
              <span className="text-[10px] text-muted-foreground">
                <kbd className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px]">Ctrl</kbd>
                {' + '}
                <kbd className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px]">J</kbd>
                {' para ativar'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
