import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Check, 
  X, 
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
  History,
  Trash2,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useVoiceAssistant, OPENAI_VOICES, type OpenAIVoice } from "@/hooks/useVoiceAssistant";
import { toast } from "sonner";

const navigationCommands = [
  { label: "Dashboard", icon: Home, route: "/" },
  { label: "Clientes", icon: Users, route: "/clientes" },
  { label: "Aulas", icon: Calendar, route: "/aulas" },
  { label: "Financeiro", icon: DollarSign, route: "/financeiro" },
  { label: "Estoque", icon: Package, route: "/estoque" },
  { label: "Vendas", icon: TrendingUp, route: "/vendas" },
  { label: "E-commerce", icon: ShoppingCart, route: "/ecommerce" },
  { label: "Relatórios", icon: BarChart3, route: "/relatorios" },
  { label: "Configurações", icon: Settings, route: "/configuracoes" },
];

const exampleCommands = [
  { category: "💰 Despesas", examples: ["Gastei 200 de gasolina", "Registra despesa de 150 em manutenção"] },
  { category: "👤 Clientes", examples: ["Cadastra cliente João", "Novo cliente Maria telefone 11999999999"] },
  { category: "📅 Aulas", examples: ["Agenda aula com Pedro amanhã às 10", "Marca aula hoje às 14"] },
  { category: "📊 Consultas", examples: ["Quanto faturei hoje?", "Faturamento da semana", "Quanto gastei este mês?"] },
];

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
    selectedVoice,
    commandHistory,
    changeVoice,
    clearHistory,
    startListening,
    stopListening,
    reset,
    isSupported,
  } = useVoiceAssistant();

  const [activeTab, setActiveTab] = useState("assistant");

  // Reset when opening
  useEffect(() => {
    if (open) {
      reset();
      setActiveTab("assistant");
    }
  }, [open, reset]);

  // Handle navigation from voice result
  useEffect(() => {
    if (lastResult?.success && lastResult.intent === "navegar") {
      const route = lastResult.data?.route;
      if (route) {
        navigate(route);
        onOpenChange(false);
        toast.success(`Navegando para ${route}`);
      }
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

  const handleNavigation = (route: string) => {
    navigate(route);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan flex items-center justify-center">
                <Mic className="h-4 w-4 text-primary-foreground" />
              </div>
              Central do Assistente
            </SheetTitle>
          </SheetHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-6 mt-4 grid grid-cols-3">
              <TabsTrigger value="assistant">Assistente</TabsTrigger>
              <TabsTrigger value="navigation">Navegação</TabsTrigger>
              <TabsTrigger value="settings">Config</TabsTrigger>
            </TabsList>

            {/* Assistant Tab */}
            <TabsContent value="assistant" className="flex-1 flex flex-col px-6 py-4 mt-0">
              {/* Voice Orb */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
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
                      <div className="absolute inset-0 -m-12 rounded-full bg-destructive/5 animate-pulse" style={{ animationDelay: '0.6s' }} />
                    </>
                  )}
                  
                  {/* Main orb */}
                  <div className={cn(
                    "w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300",
                    {
                      "bg-gradient-to-br from-primary to-cyan shadow-2xl shadow-primary/30": orbState === "idle",
                      "bg-gradient-to-br from-destructive to-orange-500 shadow-2xl shadow-destructive/40": orbState === "listening",
                      "bg-gradient-to-br from-primary to-violet-500 shadow-2xl shadow-primary/30": orbState === "processing",
                      "bg-gradient-to-br from-success to-emerald-400 shadow-2xl shadow-success/30": orbState === "success",
                      "bg-gradient-to-br from-destructive to-red-400 shadow-2xl shadow-destructive/30": orbState === "error",
                    }
                  )}>
                    {isProcessing ? (
                      <Loader2 className="h-12 w-12 text-primary-foreground animate-spin" />
                    ) : isListening ? (
                      <MicOff className="h-12 w-12 text-destructive-foreground" />
                    ) : lastResult?.success ? (
                      <Check className="h-12 w-12 text-success-foreground" />
                    ) : error ? (
                      <X className="h-12 w-12 text-destructive-foreground" />
                    ) : (
                      <Mic className="h-12 w-12 text-primary-foreground" />
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
                      {isListening ? "Ouvindo..." : "Toque para começar"}
                    </p>
                  )}
                </div>

                {/* Action button */}
                {!isListening && !isProcessing && (
                  <Button
                    size="lg"
                    onClick={startListening}
                    className="rounded-full px-8"
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Falar comando
                  </Button>
                )}
              </div>

              {/* Example commands */}
              <div className="mt-auto pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Exemplos de comandos:</p>
                <div className="flex flex-wrap gap-2">
                  {exampleCommands.slice(0, 2).flatMap(cat => 
                    cat.examples.slice(0, 1).map(ex => (
                      <span key={ex} className="text-xs px-2 py-1 bg-muted rounded-full">
                        "{ex}"
                      </span>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Navigation Tab */}
            <TabsContent value="navigation" className="flex-1 px-6 py-4 mt-0">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-3 gap-3">
                  {navigationCommands.map((cmd) => (
                    <button
                      key={cmd.route}
                      onClick={() => handleNavigation(cmd.route)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-cyan/10 flex items-center justify-center">
                        <cmd.icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{cmd.label}</span>
                    </button>
                  ))}
                </div>

                {/* Command History */}
                {commandHistory.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Histórico Recente
                      </p>
                      <Button variant="ghost" size="sm" onClick={clearHistory} className="text-destructive h-8">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Limpar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {commandHistory.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            item.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                          )}>
                            {item.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.transcript}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="flex-1 px-6 py-4 mt-0">
              <ScrollArea className="h-full">
                {/* Voice Selection */}
                <div className="mb-6">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Voz do Assistente
                  </p>
                  <div className="space-y-2">
                    {OPENAI_VOICES.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => changeVoice(voice.id as OpenAIVoice)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                          selectedVoice === voice.id
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          selectedVoice === voice.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}>
                          <Volume2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{voice.name}</p>
                          <p className="text-xs text-muted-foreground">{voice.description}</p>
                        </div>
                        {selectedVoice === voice.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commands Guide */}
                <div>
                  <p className="text-sm font-medium mb-3">Guia de Comandos</p>
                  <div className="space-y-3">
                    {exampleCommands.map((cat) => (
                      <div key={cat.category} className="p-3 rounded-xl bg-muted/50">
                        <p className="text-sm font-medium mb-2">{cat.category}</p>
                        <div className="space-y-1">
                          {cat.examples.map((ex) => (
                            <p key={ex} className="text-xs text-muted-foreground flex items-center gap-1">
                              <ChevronRight className="h-3 w-3" />
                              "{ex}"
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
