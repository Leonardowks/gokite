import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Check, 
  X, 
  ChevronDown,
  Settings2,
  History,
  Home,
  Users,
  Calendar,
  DollarSign,
  Package,
  BarChart3,
  Settings,
  TrendingUp,
  ShoppingCart,
  Volume2,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useVoiceAssistant, OPENAI_VOICES, type OpenAIVoice } from "@/hooks/useVoiceAssistant";
import { toast } from "sonner";

const navigationCommands = [
  { label: "Dashboard", icon: Home, route: "/", voice: "Ir para dashboard" },
  { label: "Clientes", icon: Users, route: "/clientes", voice: "Abrir clientes" },
  { label: "Aulas", icon: Calendar, route: "/aulas", voice: "Ver aulas" },
  { label: "Financeiro", icon: DollarSign, route: "/financeiro", voice: "Abrir financeiro" },
  { label: "Estoque", icon: Package, route: "/estoque", voice: "Ver estoque" },
  { label: "Vendas", icon: TrendingUp, route: "/vendas", voice: "Ir para vendas" },
  { label: "E-commerce", icon: ShoppingCart, route: "/ecommerce", voice: "Abrir ecommerce" },
  { label: "Relatórios", icon: BarChart3, route: "/relatorios", voice: "Ver relatórios" },
  { label: "Configurações", icon: Settings, route: "/configuracoes", voice: "Abrir configurações" },
];

const quickActions = [
  { label: "Registrar despesa", voice: "Gastei 100 reais de gasolina" },
  { label: "Cadastrar cliente", voice: "Cadastra cliente João telefone 11999999999" },
  { label: "Agendar aula", voice: "Agenda aula com Maria amanhã às 10" },
  { label: "Consultar faturamento", voice: "Quanto faturei hoje" },
];

export function VoiceAssistantBar() {
  const navigate = useNavigate();
  const {
    isListening,
    isProcessing,
    transcript,
    lastResult,
    error,
    selectedVoice,
    commandHistory,
    changeVoice,
    clearHistory,
    startListening,
    stopListening,
    reset,
    isSupported,
  } = useVoiceAssistant();

  const [isOpen, setIsOpen] = useState(false);

  // Keyboard shortcut
  useEffect(() => {
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
  }, [isListening, isProcessing, startListening, stopListening]);

  // Handle navigation from voice result
  useEffect(() => {
    if (lastResult?.success && lastResult.intent === "navegar") {
      const route = lastResult.data?.route;
      if (route) {
        navigate(route);
        toast.success(`Navegando para ${route}`);
      }
    }
  }, [lastResult, navigate]);

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

  const handleNavigation = (route: string) => {
    navigate(route);
    setIsOpen(false);
  };

  const handleQuickAction = (voice: string) => {
    toast.info(`Diga: "${voice}"`);
    setIsOpen(false);
  };

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
          className={cn(
            "h-10 px-4 rounded-xl border transition-all duration-300 flex items-center gap-2",
            "bg-background/50 backdrop-blur-sm",
            isListening && "border-destructive/50 bg-destructive/5",
            isProcessing && "border-primary/50 bg-primary/5",
            !isListening && !isProcessing && "border-border/50 hover:border-primary/30"
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
            <p className="text-sm text-muted-foreground truncate">
              {isListening ? "Ouvindo..." : "Fale um comando ou pressione Ctrl+J"}
            </p>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {/* Navigation */}
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
            <Home className="h-3 w-3" />
            Navegação
          </DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1 p-1">
            {navigationCommands.slice(0, 6).map((cmd) => (
              <DropdownMenuItem
                key={cmd.route}
                onClick={() => handleNavigation(cmd.route)}
                className="flex flex-col items-center gap-1 h-16 justify-center cursor-pointer"
              >
                <cmd.icon className="h-4 w-4 text-primary" />
                <span className="text-xs">{cmd.label}</span>
              </DropdownMenuItem>
            ))}
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Quick Actions */}
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mic className="h-3 w-3" />
            Comandos de Voz
          </DropdownMenuLabel>
          {quickActions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              onClick={() => handleQuickAction(action.voice)}
              className="cursor-pointer"
            >
              <span className="text-sm">{action.label}</span>
              <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">
                "{action.voice.substring(0, 20)}..."
              </span>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* History */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              {commandHistory.length === 0 ? (
                <DropdownMenuItem disabled>
                  Nenhum comando recente
                </DropdownMenuItem>
              ) : (
                <>
                  {commandHistory.slice(0, 5).map((item) => (
                    <DropdownMenuItem key={item.id} className="flex flex-col items-start gap-1">
                      <span className="text-sm truncate w-full">{item.transcript}</span>
                      <span className={cn(
                        "text-xs",
                        item.success ? "text-success" : "text-destructive"
                      )}>
                        {item.success ? "✓" : "✗"} {item.message.substring(0, 30)}...
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearHistory} className="text-destructive cursor-pointer">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar histórico
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          
          {/* Voice Settings */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Voz: {OPENAI_VOICES.find(v => v.id === selectedVoice)?.name}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {OPENAI_VOICES.map((voice) => (
                <DropdownMenuItem
                  key={voice.id}
                  onClick={() => changeVoice(voice.id as OpenAIVoice)}
                  className={cn(
                    "cursor-pointer",
                    selectedVoice === voice.id && "bg-primary/10"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{voice.name}</span>
                    <span className="text-xs text-muted-foreground">{voice.description}</span>
                  </div>
                  {selectedVoice === voice.id && (
                    <Check className="h-4 w-4 ml-auto text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          
          <DropdownMenuSeparator />
          
          {/* Keyboard shortcut hint */}
          <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center justify-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">J</kbd>
            <span className="ml-1">para ativar</span>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
