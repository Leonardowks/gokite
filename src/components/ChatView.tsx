import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare,
  Brain,
  ExternalLink,
  Send,
  Loader2,
  Image,
  FileText,
  Mic,
  Video,
  Check,
  CheckCheck,
} from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MensagemChat, ContatoComUltimaMensagem, useEnviarMensagem } from '@/hooks/useConversasPage';
import { toast } from 'sonner';

interface ChatViewProps {
  contato: ContatoComUltimaMensagem | null;
  mensagens: MensagemChat[];
  isLoading: boolean;
  onAnalisar: () => void;
  isAnalisando: boolean;
}

export function ChatView({ contato, mensagens, isLoading, onAnalisar, isAnalisando }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [novaMensagem, setNovaMensagem] = useState('');
  
  const enviarMensagem = useEnviarMensagem();

  // Auto scroll para baixo quando novas mensagens chegam
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const handleEnviar = async () => {
    if (!contato || !novaMensagem.trim() || enviarMensagem.isPending) return;

    const mensagemTexto = novaMensagem.trim();
    setNovaMensagem(''); // Limpa o input imediatamente

    try {
      await enviarMensagem.mutateAsync({
        contatoId: contato.id,
        mensagem: mensagemTexto,
      });
      toast.success('Mensagem enviada!');
      textareaRef.current?.focus();
    } catch (error) {
      // Erro já tratado no hook
      setNovaMensagem(mensagemTexto); // Restaura a mensagem em caso de erro
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enviar com Enter (sem Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const getTipoMidiaIcon = (tipo: string | null) => {
    switch (tipo) {
      case 'imagem':
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'audio':
        return <Mic className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'documento':
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'DELIVERY_ACK':
      case 'READ':
        return <CheckCheck className="h-3.5 w-3.5 text-cyan" />;
      case 'SERVER_ACK':
        return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return <Check className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
  };

  // Estado vazio - nenhum contato selecionado
  if (!contato) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground">
        <div className="relative">
          <MessageSquare className="h-20 w-20 opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-cyan/20 blur-3xl" />
        </div>
        <p className="mt-6 text-lg font-medium">Selecione uma conversa</p>
        <p className="text-sm">Escolha um contato na lista ao lado</p>
      </div>
    );
  }

  const displayName = contato.nome || contato.whatsapp_profile_name || contato.telefone;

  // Loading
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
              <Skeleton className="h-16 w-64 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Agrupar mensagens por data
  const mensagensPorData: { [key: string]: MensagemChat[] } = {};
  mensagens.forEach((msg) => {
    const dateKey = format(parseISO(msg.data_mensagem), 'yyyy-MM-dd');
    if (!mensagensPorData[dateKey]) {
      mensagensPorData[dateKey] = [];
    }
    mensagensPorData[dateKey].push(msg);
  });

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-muted/10 to-muted/5">
      {/* Header */}
      <div className="p-4 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{displayName}</h2>
            <p className="text-xs text-muted-foreground">{contato.telefone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onAnalisar}
            disabled={isAnalisando || mensagens.length === 0}
            className="gap-2"
          >
            <Brain className={cn('h-4 w-4', isAnalisando && 'animate-pulse')} />
            <span className="hidden sm:inline">Analisar com IA</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            asChild
          >
            <a
              href={`https://wa.me/${contato.telefone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir no WhatsApp"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Mensagens */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {mensagens.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 opacity-30 mb-3" />
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(mensagensPorData).map(([dateKey, msgs]) => {
              const date = parseISO(dateKey);
              const isToday = isSameDay(date, new Date());
              const dateLabel = isToday
                ? 'Hoje'
                : format(date, "dd 'de' MMMM", { locale: ptBR });

              return (
                <div key={dateKey}>
                  {/* Separador de data */}
                  <div className="flex items-center justify-center my-4">
                    <Badge variant="secondary" className="text-xs px-3 py-1 bg-muted">
                      {dateLabel}
                    </Badge>
                  </div>

                  {/* Mensagens do dia */}
                  <div className="space-y-2">
                    {msgs.map((msg, index) => {
                      const isFromMe = msg.is_from_me || msg.remetente === 'empresa';
                      const midiaIcon = getTipoMidiaIcon(msg.tipo_midia);

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex',
                            isFromMe ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
                              isFromMe
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-card border rounded-bl-md'
                            )}
                          >
                            {/* Tipo de mídia */}
                            {midiaIcon && msg.tipo_midia !== 'texto' && (
                              <div className={cn(
                                'flex items-center gap-2 mb-1 text-xs',
                                isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              )}>
                                {midiaIcon}
                                <span className="capitalize">{msg.tipo_midia}</span>
                              </div>
                            )}

                            {/* Conteúdo */}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.conteudo}
                            </p>

                            {/* Horário e status */}
                            <div className={cn(
                              'flex items-center justify-end gap-1.5 mt-1 text-[10px]',
                              isFromMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
                            )}>
                              <span>
                                {format(parseISO(msg.data_mensagem), 'HH:mm')}
                              </span>
                              {isFromMe && getStatusIcon(msg.message_status)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input de mensagem */}
      <div className="p-3 border-t bg-card/80 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Digite sua mensagem..."
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={enviarMensagem.isPending}
            className="min-h-[44px] max-h-32 resize-none flex-1"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleEnviar}
            disabled={!novaMensagem.trim() || enviarMensagem.isPending}
            className="h-11 w-11 shrink-0"
          >
            {enviarMensagem.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Enter para enviar • Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}
