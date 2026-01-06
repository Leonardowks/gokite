import { memo } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, CheckCheck, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MensagemChat } from '@/hooks/useConversasPage';

interface MessageBubbleProps {
  message: MensagemChat;
}

const getStatusIcon = (status: string | null, isFromMe: boolean) => {
  if (!isFromMe) return null;
  switch (status) {
    case 'READ':
      return <CheckCheck className="h-4 w-4 text-cyan-500" />;
    case 'DELIVERY_ACK':
      return <CheckCheck className="h-4 w-4 text-muted-foreground" />;
    case 'SERVER_ACK':
      return <Check className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Check className="h-4 w-4 text-muted-foreground/50" />;
  }
};

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isFromMe = message.is_from_me || message.remetente === 'empresa';
  const isImagem = message.tipo_midia === 'imagem' || message.tipo_midia === 'image';
  const isVideo = message.tipo_midia === 'video';
  const isAudio = message.tipo_midia === 'audio';
  const isDocumento = message.tipo_midia === 'documento' || message.tipo_midia === 'document';
  const hasMedia = message.media_url && (isImagem || isVideo || isAudio || isDocumento);
  const isMediaPlaceholder = ['[Imagem]', '[Vídeo]', '[Áudio]', '[Documento]'].includes(message.conteudo);
  const showTextContent = message.conteudo && !isMediaPlaceholder;
  const time = format(parseISO(message.data_mensagem), 'HH:mm');

  return (
    <div className={cn('flex', isFromMe ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] lg:max-w-[65%] rounded-2xl shadow-sm',
          isFromMe
            ? 'bg-[#005c4b] text-white rounded-tr-sm'
            : 'bg-card border border-border/50 rounded-tl-sm',
          hasMedia ? 'p-1' : 'px-3 py-2'
        )}
      >
        {/* Mídia */}
        {hasMedia && (
          <div className={cn(showTextContent && 'mb-1')}>
            {isImagem && (
              <a 
                href={message.media_url!} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={message.media_url!}
                  alt="Imagem"
                  className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </a>
            )}

            {isVideo && (
              <video
                src={message.media_url!}
                controls
                className="rounded-xl max-w-full max-h-64"
                preload="metadata"
              />
            )}

            {isAudio && (
              <div className="px-2 py-1">
                <audio
                  src={message.media_url!}
                  controls
                  className="w-full max-w-[240px]"
                  preload="metadata"
                />
              </div>
            )}

            {isDocumento && (
              <a
                href={message.media_url!}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  isFromMe 
                    ? 'bg-white/10 hover:bg-white/20' 
                    : 'bg-muted/50 hover:bg-muted'
                )}
              >
                <div className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center',
                  isFromMe ? 'bg-white/20' : 'bg-primary/10'
                )}>
                  <FileText className={cn(
                    'h-5 w-5',
                    isFromMe ? 'text-white' : 'text-primary'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {message.conteudo !== '[Documento]' ? message.conteudo : 'Documento'}
                  </p>
                  <p className={cn(
                    'text-xs opacity-70'
                  )}>
                    Clique para abrir
                  </p>
                </div>
                <Download className="h-4 w-4 shrink-0 opacity-60" />
              </a>
            )}
          </div>
        )}

        {/* Texto */}
        {showTextContent && (
          <p className={cn(
            "text-[15px] leading-relaxed whitespace-pre-wrap break-words",
            hasMedia && "px-2 py-1"
          )}>
            {message.conteudo}
          </p>
        )}

        {/* Horário e status */}
        <div className={cn(
          'flex items-center justify-end gap-1 mt-1',
          hasMedia && 'px-2 pb-1',
          isFromMe ? 'text-white/70' : 'text-muted-foreground'
        )}>
          <span className="text-[11px]">{time}</span>
          {getStatusIcon(message.message_status, isFromMe)}
        </div>
      </div>
    </div>
  );
});
