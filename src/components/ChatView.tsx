import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  Paperclip,
  X,
  Play,
  Download,
  User,
} from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MensagemChat, ContatoComUltimaMensagem, useEnviarMensagem, useUploadMedia } from '@/hooks/useConversasPage';
import { toast } from 'sonner';

interface ChatViewProps {
  contato: ContatoComUltimaMensagem | null;
  mensagens: MensagemChat[];
  isLoading: boolean;
  onAnalisar: () => void;
  isAnalisando: boolean;
}

export function ChatView({ contato, mensagens, isLoading, onAnalisar, isAnalisando }: ChatViewProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
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
      // Validar tamanho (max 16MB para WhatsApp)
      if (file.size > 16 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 16MB.');
        return;
      }
      setArquivoSelecionado(file);
    }
    // Reset input para permitir selecionar o mesmo arquivo novamente
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
    
    // Limpar inputs imediatamente
    setNovaMensagem('');
    setArquivoSelecionado(null);
    setPreviewUrl(null);

    try {
      if (arquivo) {
        // Upload do arquivo primeiro
        const uploadResult = await uploadMedia.mutateAsync({
          file: arquivo,
          contatoId: contato.id,
        });

        // Enviar mensagem com mídia
        await enviarMensagem.mutateAsync({
          contatoId: contato.id,
          mediaUrl: uploadResult.url,
          mediaType: uploadResult.mediaType,
          fileName: uploadResult.fileName,
          caption: mensagemTexto || undefined,
        });
        toast.success('Mídia enviada!');
      } else {
        // Enviar só texto
        await enviarMensagem.mutateAsync({
          contatoId: contato.id,
          mensagem: mensagemTexto,
        });
        toast.success('Mensagem enviada!');
      }
      textareaRef.current?.focus();
    } catch (error) {
      // Erro já tratado nos hooks
      // Restaurar estado em caso de erro
      if (mensagemTexto) setNovaMensagem(mensagemTexto);
      if (arquivo) setArquivoSelecionado(arquivo);
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

  // Prioridade: nome WhatsApp > nome cadastrado > telefone
  const displayName = contato.whatsapp_profile_name || contato.nome || contato.telefone;

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
            onClick={() => navigate('/admin/inteligencia')}
            title="Ver na Central de Inteligência"
          >
            <User className="h-4 w-4" />
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
                      const isImagem = msg.tipo_midia === 'imagem' || msg.tipo_midia === 'image';
                      const isVideo = msg.tipo_midia === 'video';
                      const isAudio = msg.tipo_midia === 'audio';
                      const isDocumento = msg.tipo_midia === 'documento' || msg.tipo_midia === 'document';
                      const hasMedia = msg.media_url && (isImagem || isVideo || isAudio || isDocumento);

                      // Verificar se conteúdo é apenas placeholder de mídia
                      const isMediaPlaceholder = ['[Imagem]', '[Vídeo]', '[Áudio]', '[Documento]'].includes(msg.conteudo);
                      const showTextContent = msg.conteudo && !isMediaPlaceholder;

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
                              'max-w-[75%] rounded-2xl shadow-sm overflow-hidden',
                              isFromMe
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-card border rounded-bl-md',
                              hasMedia ? 'p-1' : 'px-4 py-2.5'
                            )}
                          >
                            {/* Renderizar mídia */}
                            {hasMedia && (
                              <div className="mb-1">
                                {/* Imagem */}
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
                                      className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </a>
                                )}

                                {/* Vídeo */}
                                {isVideo && (
                                  <div className="relative">
                                    <video
                                      src={msg.media_url!}
                                      controls
                                      className="rounded-xl max-w-full max-h-64"
                                      preload="metadata"
                                    />
                                  </div>
                                )}

                                {/* Áudio */}
                                {isAudio && (
                                  <div className="px-3 py-2">
                                    <audio
                                      src={msg.media_url!}
                                      controls
                                      className="w-full max-w-[250px]"
                                      preload="metadata"
                                    />
                                  </div>
                                )}

                                {/* Documento */}
                                {isDocumento && (
                                  <a
                                    href={msg.media_url!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                                      isFromMe 
                                        ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' 
                                        : 'bg-muted/50 hover:bg-muted'
                                    )}
                                  >
                                    <div className={cn(
                                      'h-10 w-10 rounded-lg flex items-center justify-center',
                                      isFromMe ? 'bg-primary-foreground/20' : 'bg-primary/10'
                                    )}>
                                      <FileText className={cn(
                                        'h-5 w-5',
                                        isFromMe ? 'text-primary-foreground' : 'text-primary'
                                      )} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {msg.conteudo !== '[Documento]' ? msg.conteudo : 'Documento'}
                                      </p>
                                      <p className={cn(
                                        'text-xs',
                                        isFromMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
                                      )}>
                                        Clique para abrir
                                      </p>
                                    </div>
                                    <Download className="h-4 w-4 shrink-0 opacity-60" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Legenda/Conteúdo de texto */}
                            {showTextContent && (
                              <p className={cn(
                                "text-sm whitespace-pre-wrap break-words",
                                hasMedia ? "px-3 py-1" : ""
                              )}>
                                {msg.conteudo}
                              </p>
                            )}

                            {/* Horário e status */}
                            <div className={cn(
                              'flex items-center justify-end gap-1.5 text-[10px]',
                              isFromMe ? 'text-primary-foreground/60' : 'text-muted-foreground',
                              hasMedia ? 'px-3 py-1' : 'mt-1'
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
      <div className="p-3 border-t bg-card/80 backdrop-blur-sm space-y-2">
        {/* Preview do arquivo selecionado */}
        {arquivoSelecionado && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="h-12 w-12 object-cover rounded"
              />
            ) : (
              <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                {arquivoSelecionado.type.startsWith('video/') && <Video className="h-5 w-5 text-muted-foreground" />}
                {arquivoSelecionado.type.startsWith('audio/') && <Mic className="h-5 w-5 text-muted-foreground" />}
                {!arquivoSelecionado.type.startsWith('video/') && 
                 !arquivoSelecionado.type.startsWith('audio/') && 
                 !arquivoSelecionado.type.startsWith('image/') && (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{arquivoSelecionado.name}</p>
              <p className="text-xs text-muted-foreground">
                {(arquivoSelecionado.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRemoverArquivo}
              className="h-8 w-8 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Input e botões */}
        <div className="flex items-end gap-2">
          {/* Input de arquivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Botão anexar */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={enviarMensagem.isPending || uploadMedia.isPending}
            className="h-11 w-11 shrink-0"
            title="Anexar arquivo"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Textarea
            ref={textareaRef}
            placeholder={arquivoSelecionado ? "Adicione uma legenda (opcional)..." : "Digite sua mensagem..."}
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={enviarMensagem.isPending || uploadMedia.isPending}
            className="min-h-[44px] max-h-32 resize-none flex-1"
            rows={1}
          />
          
          <Button
            size="icon"
            onClick={handleEnviar}
            disabled={(!novaMensagem.trim() && !arquivoSelecionado) || enviarMensagem.isPending || uploadMedia.isPending}
            className="h-11 w-11 shrink-0"
          >
            {(enviarMensagem.isPending || uploadMedia.isPending) ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        <p className="text-[10px] text-muted-foreground text-center">
          Enter para enviar • Shift+Enter para nova linha • Clique em 📎 para anexar
        </p>
      </div>
    </div>
  );
}
