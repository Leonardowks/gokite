import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  MessageSquare,
  Brain,
  ExternalLink,
  Send,
  Loader2,
  FileText,
  Check,
  CheckCheck,
  Paperclip,
  X,
  Download,
  User,
  Building2,
  Star,
  MoreVertical,
  Phone,
  Sparkles,
} from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MensagemChat, ContatoComUltimaMensagem, useEnviarMensagem, useUploadMedia } from '@/hooks/useConversasPage';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuickActionsBar } from '@/components/conversas/QuickActionsBar';
import { ChatContextPanel } from '@/components/conversas/ChatContextPanel';

interface ChatViewProps {
  contato: ContatoComUltimaMensagem | null;
  mensagens: MensagemChat[];
  isLoading: boolean;
  onAnalisar: () => void;
  isAnalisando: boolean;
}

export function ChatView({ contato, mensagens, isLoading, onAnalisar, isAnalisando }: ChatViewProps) {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  
  const enviarMensagem = useEnviarMensagem();
  const uploadMedia = useUploadMedia();

  // Auto scroll para baixo quando novas mensagens chegam
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Limpar preview ao desselecionar arquivo
  useEffect(() => {
    if (arquivoSelecionado && arquivoSelecionado.type.startsWith('image/')) {
      const url = URL.createObjectURL(arquivoSelecionado);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [arquivoSelecionado]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 16 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 16MB.');
        return;
      }
      setArquivoSelecionado(file);
    }
    e.target.value = '';
  };

  const handleRemoverArquivo = () => {
    setArquivoSelecionado(null);
    setPreviewUrl(null);
  };

  const handleEnviar = async () => {
    if (!contato || enviarMensagem.isPending || uploadMedia.isPending) return;
    if (!novaMensagem.trim() && !arquivoSelecionado) return;

    const mensagemTexto = novaMensagem.trim();
    const arquivo = arquivoSelecionado;
    
    setNovaMensagem('');
    setArquivoSelecionado(null);
    setPreviewUrl(null);

    try {
      if (arquivo) {
        const uploadResult = await uploadMedia.mutateAsync({
          file: arquivo,
          contatoId: contato.id,
        });

        await enviarMensagem.mutateAsync({
          contatoId: contato.id,
          mediaUrl: uploadResult.url,
          mediaType: uploadResult.mediaType,
          fileName: uploadResult.fileName,
          caption: mensagemTexto || undefined,
        });
        toast.success('Mídia enviada!');
      } else {
        await enviarMensagem.mutateAsync({
          contatoId: contato.id,
          mensagem: mensagemTexto,
        });
        toast.success('Mensagem enviada!');
      }
      textareaRef.current?.focus();
    } catch (error) {
      if (mensagemTexto) setNovaMensagem(mensagemTexto);
      if (arquivo) setArquivoSelecionado(arquivo);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const handleEnviarMensagemTemplate = (mensagem: string) => {
    if (!contato) return;
    enviarMensagem.mutate({
      contatoId: contato.id,
      mensagem,
    });
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'DELIVERY_ACK':
      case 'READ':
        return <CheckCheck className="h-3.5 w-3.5 text-cyan-500" />;
      case 'SERVER_ACK':
        return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return <Check className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
  };

  // Estado vazio
  if (!contato) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground p-8">
        <div className="relative">
          <MessageSquare className="h-16 w-16 opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-cyan-500/20 blur-3xl" />
        </div>
        <p className="mt-4 text-base font-medium">Selecione uma conversa</p>
        <p className="text-sm text-muted-foreground">Escolha um contato na lista</p>
      </div>
    );
  }

  const displayName = contato.whatsapp_profile_name || contato.nome || contato.telefone;
  const isPriority = contato.prioridade === 'alta' || contato.prioridade === 'urgente';

  // Loading
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
              <Skeleton className="h-14 w-48 rounded-2xl" />
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Info do contato */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isPriority && (
                <div className="absolute -top-0.5 -right-0.5">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold truncate text-sm">{displayName}</h2>
                {contato.is_business && (
                  <Building2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{contato.telefone}</p>
            </div>
          </div>

          {/* Ações do Header */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Botão de Insights (abre Sheet em todas as telas) */}
            <Sheet open={insightsOpen} onOpenChange={setInsightsOpen}>
              <SheetTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 min-w-[44px] gap-1.5"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline text-xs">Insights</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-80 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Insights Comerciais</SheetTitle>
                </SheetHeader>
                <ChatContextPanel
                  contato={contato}
                  onAnalisar={onAnalisar}
                  isAnalisando={isAnalisando}
                />
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onAnalisar} disabled={isAnalisando} className="min-h-[40px]">
                  <Brain className={cn('h-4 w-4 mr-2', isAnalisando && 'animate-pulse')} />
                  Analisar conversa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/inteligencia')} className="min-h-[40px]">
                  <User className="h-4 w-4 mr-2" />
                  Ver perfil completo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="min-h-[40px]">
                  <a
                    href={`https://wa.me/${contato.telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir no WhatsApp
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="min-h-[40px]">
                  <a href={`tel:${contato.telefone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Ligar
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Barra de Ações Rápidas */}
      <QuickActionsBar
        contato={contato}
        onEnviarMensagem={handleEnviarMensagemTemplate}
        onAgendarAula={() => navigate('/aulas')}
        onEnviarProposta={() => toast.info('Funcionalidade em breve!')}
        isSending={enviarMensagem.isPending}
      />

      {/* Mensagens */}
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4">
          {mensagens.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16">
              <MessageSquare className="h-10 w-10 opacity-30 mb-2" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(mensagensPorData).map(([dateKey, msgs]) => {
                const date = parseISO(dateKey);
                const isToday = isSameDay(date, new Date());
                const dateLabel = isToday
                  ? 'Hoje'
                  : format(date, "dd 'de' MMMM", { locale: ptBR });

                return (
                  <div key={dateKey}>
                    {/* Separador de data */}
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[10px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                        {dateLabel}
                      </span>
                    </div>

                    {/* Mensagens do dia */}
                    <div className="space-y-1.5">
                      {msgs.map((msg) => {
                        const isFromMe = msg.is_from_me || msg.remetente === 'empresa';
                        const isImagem = msg.tipo_midia === 'imagem' || msg.tipo_midia === 'image';
                        const isVideo = msg.tipo_midia === 'video';
                        const isAudio = msg.tipo_midia === 'audio';
                        const isDocumento = msg.tipo_midia === 'documento' || msg.tipo_midia === 'document';
                        const hasMedia = msg.media_url && (isImagem || isVideo || isAudio || isDocumento);
                        const isMediaPlaceholder = ['[Imagem]', '[Vídeo]', '[Áudio]', '[Documento]'].includes(msg.conteudo);
                        const showTextContent = msg.conteudo && !isMediaPlaceholder;

                        return (
                          <div
                            key={msg.id}
                            className={cn('flex', isFromMe ? 'justify-end' : 'justify-start')}
                          >
                            <div
                              className={cn(
                                'max-w-[85%] sm:max-w-[75%] rounded-2xl shadow-sm overflow-hidden',
                                isFromMe
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-card border rounded-bl-md',
                                hasMedia ? 'p-1' : 'px-3 py-2'
                              )}
                            >
                              {/* Mídia */}
                              {hasMedia && (
                                <div className="mb-1">
                                  {isImagem && (
                                    <a 
                                      href={msg.media_url!} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <img
                                        src={msg.media_url!}
                                        alt="Imagem"
                                        className="rounded-xl max-w-full max-h-56 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                        loading="lazy"
                                      />
                                    </a>
                                  )}

                                  {isVideo && (
                                    <video
                                      src={msg.media_url!}
                                      controls
                                      className="rounded-xl max-w-full max-h-56"
                                      preload="metadata"
                                    />
                                  )}

                                  {isAudio && (
                                    <div className="px-2 py-1.5">
                                      <audio
                                        src={msg.media_url!}
                                        controls
                                        className="w-full max-w-[220px]"
                                        preload="metadata"
                                      />
                                    </div>
                                  )}

                                  {isDocumento && (
                                    <a
                                      href={msg.media_url!}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        'flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors',
                                        isFromMe 
                                          ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' 
                                          : 'bg-muted/50 hover:bg-muted'
                                      )}
                                    >
                                      <div className={cn(
                                        'h-9 w-9 rounded-lg flex items-center justify-center',
                                        isFromMe ? 'bg-primary-foreground/20' : 'bg-primary/10'
                                      )}>
                                        <FileText className={cn(
                                          'h-4 w-4',
                                          isFromMe ? 'text-primary-foreground' : 'text-primary'
                                        )} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">
                                          {msg.conteudo !== '[Documento]' ? msg.conteudo : 'Documento'}
                                        </p>
                                        <p className={cn(
                                          'text-[10px]',
                                          isFromMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
                                        )}>
                                          Clique para abrir
                                        </p>
                                      </div>
                                      <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Texto */}
                              {showTextContent && (
                                <p className={cn(
                                  "text-sm whitespace-pre-wrap break-words",
                                  hasMedia ? "px-2 py-1" : ""
                                )}>
                                  {msg.conteudo}
                                </p>
                              )}

                              {/* Horário e status */}
                              <div className={cn(
                                'flex items-center justify-end gap-1 text-[10px]',
                                isFromMe ? 'text-primary-foreground/60' : 'text-muted-foreground',
                                hasMedia ? 'px-2 py-0.5' : 'mt-0.5'
                              )}>
                                <span>{format(parseISO(msg.data_mensagem), 'HH:mm')}</span>
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
        </div>
      </ScrollArea>

      {/* Input de mensagem */}
      <div className="p-2 sm:p-3 border-t bg-card/80 backdrop-blur-sm space-y-2 shrink-0">
        {/* Preview do arquivo */}
        {arquivoSelecionado && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="h-10 w-10 object-cover rounded" />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{arquivoSelecionado.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {(arquivoSelecionado.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={handleRemoverArquivo} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Input de mensagem */}
        <div className="flex items-end gap-1.5 sm:gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={enviarMensagem.isPending || uploadMedia.isPending}
            className="h-10 w-10 flex-shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Textarea
            ref={textareaRef}
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mensagem..."
            className="min-h-10 max-h-24 resize-none flex-1 text-sm"
            rows={1}
            disabled={enviarMensagem.isPending || uploadMedia.isPending}
          />

          <Button
            onClick={handleEnviar}
            size="icon"
            disabled={(!novaMensagem.trim() && !arquivoSelecionado) || enviarMensagem.isPending || uploadMedia.isPending}
            className="h-10 w-10 flex-shrink-0"
          >
            {enviarMensagem.isPending || uploadMedia.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
