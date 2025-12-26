import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Send,
  Volume2,
  Settings2,
  Trash2,
  Bot,
  User,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { OPENAI_VOICES, type OpenAIVoice } from "@/hooks/useVoiceAssistant";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isAction?: boolean;
}

const VOICE_STORAGE_KEY = 'gokite-voice-preference';
const CONVERSATION_KEY = 'gokite-jarvis-conversation';

export default function Assistente() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<OpenAIVoice>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(VOICE_STORAGE_KEY) as OpenAIVoice) || 'nova';
    }
    return 'nova';
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversation from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONVERSATION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only keep last 20 messages
        setMessages(parsed.slice(-20));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save conversation
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CONVERSATION_KEY, JSON.stringify(messages.slice(-20)));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (role: "user" | "assistant", content: string, isAction?: boolean) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now(),
      isAction,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const processMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    addMessage("user", text);
    setIsProcessing(true);
    setTranscript("");
    setTextInput("");

    try {
      // Get conversation history for context (last 10 messages)
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call voice assistant with conversation context
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: { 
          transcript: text,
          conversationHistory 
        },
      });

      if (error) throw error;

      const response = data?.message || "Desculpe, não consegui processar sua solicitação.";
      const isSuccess = data?.success;
      
      // Add assistant response
      addMessage("assistant", response, data?.actionExecuted);

      // Handle navigation
      if (data?.navigation?.route) {
        setTimeout(() => {
          navigate(data.navigation.route);
          toast.success(`Navegando para ${data.navigation.pagina}`);
        }, 1500);
      }

      // Text-to-speech
      if (response) {
        try {
          const { data: ttsData, error: ttsError } = await supabase.functions.invoke('openai-tts', {
            body: { text: response, voice: selectedVoice },
          });

          if (!ttsError && ttsData?.audioContent) {
            if (audioRef.current) audioRef.current.pause();
            audioRef.current = new Audio(`data:audio/mpeg;base64,${ttsData.audioContent}`);
            audioRef.current.play().catch(() => {});
          }
        } catch {
          // TTS is optional
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      addMessage("assistant", "Ops, algo deu errado. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = async () => {
    try {
      setTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length === 0) {
          setIsListening(false);
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopListening();
        }
      }, 15000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTranscript("Transcrevendo...");

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const { data: sttData, error: sttError } = await supabase.functions.invoke('openai-stt', {
        body: { audio: base64Audio },
      });

      if (sttError || sttData?.error) {
        throw new Error(sttData?.error || 'Erro na transcrição');
      }

      const text = sttData.text;
      if (!text) {
        setIsProcessing(false);
        setTranscript("");
        return;
      }

      setTranscript(text);
      await processMessage(text);
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Erro ao processar áudio');
      setIsProcessing(false);
      setTranscript("");
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && !isProcessing) {
      processMessage(textInput);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    localStorage.removeItem(CONVERSATION_KEY);
    toast.success("Conversa limpa");
  };

  const changeVoice = (voice: OpenAIVoice) => {
    setSelectedVoice(voice);
    localStorage.setItem(VOICE_STORAGE_KEY, voice);
  };

  const isSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  return (
    <div className="h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-cyan to-primary flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse-soft">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-cyan bg-clip-text text-transparent">
              Jarvis
            </h1>
            <p className="text-sm text-muted-foreground">Seu assistente inteligente</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings2 className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Configurações</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Voice Selection */}
                <div>
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
                        <div className="text-left">
                          <p className="font-medium">{voice.name}</p>
                          <p className="text-xs text-muted-foreground">{voice.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Conversation */}
                <Button
                  variant="outline"
                  onClick={clearConversation}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar conversa
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 bg-card/50 rounded-2xl border border-border/50 backdrop-blur-sm overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-cyan/20 flex items-center justify-center mb-4">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Olá! Sou o Jarvis</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Seu assistente inteligente da GoKite. Fale ou digite naturalmente o que você precisa.
              </p>
              <div className="grid gap-2 text-left max-w-sm">
                <p className="text-xs text-muted-foreground">Experimente perguntar:</p>
                <div className="space-y-2">
                  {[
                    "Quanto faturei essa semana?",
                    "Cadastra um cliente novo chamado Pedro",
                    "Registra uma despesa de 150 reais em combustível"
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => processMessage(example)}
                      className="w-full text-left text-sm px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm",
                      message.isAction && "border-2 border-success/30 bg-success/10"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        {transcript || "Processando..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50">
          <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
            {/* Voice Button */}
            {isSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else if (!isProcessing) {
                    startListening();
                  }
                }}
                disabled={isProcessing}
                className={cn(
                  "shrink-0 rounded-full h-12 w-12 transition-all",
                  isListening && "animate-pulse shadow-lg shadow-destructive/30"
                )}
              >
                {isListening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            )}

            {/* Text Input */}
            <Input
              ref={inputRef}
              type="text"
              placeholder="Digite ou fale sua mensagem..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isProcessing || isListening}
              className="flex-1 h-12 rounded-full px-5 bg-muted/50 border-border/50"
            />

            {/* Send Button */}
            <Button
              type="submit"
              size="icon"
              disabled={!textInput.trim() || isProcessing || isListening}
              className="shrink-0 rounded-full h-12 w-12"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>

          {/* Status indicator */}
          {isListening && (
            <p className="text-center text-xs text-destructive mt-2 animate-pulse">
              🎙️ Ouvindo... (toque para parar)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
