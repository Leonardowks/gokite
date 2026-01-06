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
  Paperclip,
  X,
  User,
  MoreVertical,
  Phone,
  Sparkles,
  Search,
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
import { MessageBubble } from '@/components/conversas/MessageBubble';

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

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Preview de arquivo
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

  // Estado vazio
  if (!contato) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/10 text-muted-foreground">
        <div className="relative">
          <MessageSquare className="h-20 w-20 opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-cyan-500/10 blur-3xl" />
        </div>
        <p className="mt-6 text-lg font-medium">WhatsApp Inbox</p>
        <p className="text-sm text-muted-foreground">Selecione uma conversa para começar</p>
      </div>
    );
  }

  const displayName = contato.whatsapp_profile_name || contato.nome || contato.telefone;

  // Loading
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-16 px-4 flex items-center gap-3 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
              <Skeleton className="h-12 w-48 rounded-2xl" />
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
    <div className="h-full flex flex-col bg-muted/20">
      {/* Header */}
      <header className="h-16 shrink-0 px-4 flex items-center gap-3 bg-card border-b">
        <Avatar className="h-10 w-10">
          <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-base truncate">{displayName}</h2>
          <p className="text-xs text-muted-foreground truncate">{contato.telefone}</p>
        </div>

        <div className="flex items-center gap-1">
          {/* Insights Sheet */}
          <Sheet open={insightsOpen} onOpenChange={setInsightsOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="h-10 w-10">
                <Sparkles className="h-5 w-5 text-primary" />
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

          <Button size="icon" variant="ghost" className="h-10 w-10">
            <Search className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-10 w-10">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onAnalisar} disabled={isAnalisando} className="min-h-[44px]">
                <Brain className={cn('h-4 w-4 mr-2', isAnalisando && 'animate-pulse')} />
                Analisar conversa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/inteligencia')} className="min-h-[44px]">
                <User className="h-4 w-4 mr-2" />
                Ver perfil completo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="min-h-[44px]">
                <a
                  href={`https://wa.me/${contato.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir no WhatsApp
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="min-h-[44px]">
                <a href={`tel:${contato.telefone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Ligar
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Quick Actions */}
      <QuickActionsBar
        contato={contato}
        onEnviarMensagem={handleEnviarMensagemTemplate}
        onAgendarAula={() => navigate('/aulas')}
        onEnviarProposta={() => toast.info('Funcionalidade em breve!')}
        isSending={enviarMensagem.isPending}
      />

      {/* Mensagens */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {mensagens.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
              <MessageSquare className="h-12 w-12 opacity-30 mb-3" />
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
                    <div className="flex items-center justify-center my-4">
                      <span className="text-[11px] text-muted-foreground bg-card px-3 py-1 rounded-full shadow-sm">
                        {dateLabel}
                      </span>
                    </div>

                    {/* Mensagens do dia */}
                    <div className="space-y-1">
                      {msgs.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                      ))}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <footer className="shrink-0 p-3 bg-card border-t">
        {/* Preview do arquivo */}
        {arquivoSelecionado && (
          <div className="flex items-center gap-3 p-2 mb-2 bg-muted/50 rounded-lg">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="h-10 w-10 object-cover rounded" />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{arquivoSelecionado.name}</p>
              <p className="text-xs text-muted-foreground">
                {(arquivoSelecionado.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={handleRemoverArquivo} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-2">
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
            className="h-10 w-10 shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Textarea
            ref={textareaRef}
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem"
            className="min-h-10 max-h-24 resize-none flex-1 rounded-lg py-2.5 text-sm"
            rows={1}
            disabled={enviarMensagem.isPending || uploadMedia.isPending}
          />

          <Button
            onClick={handleEnviar}
            size="icon"
            disabled={(!novaMensagem.trim() && !arquivoSelecionado) || enviarMensagem.isPending || uploadMedia.isPending}
            className="h-10 w-10 shrink-0 rounded-full"
          >
            {enviarMensagem.isPending || uploadMedia.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
