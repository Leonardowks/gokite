import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Image,
  Mic,
  Video,
  FileText,
  Check,
  CheckCheck,
} from 'lucide-react';
import { isToday, isYesterday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ContatoComUltimaMensagem } from '@/hooks/useConversasPage';

interface ConversaItemComercialProps {
  contato: ContatoComUltimaMensagem;
  isSelected: boolean;
  onSelect: () => void;
  onAvatarClick?: () => void;
  style?: React.CSSProperties;
}

// Formatar telefone para exibição amigável
function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12 && clean.startsWith('55')) {
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  return phone;
}

// Formatar timestamp de forma inteligente
function formatTimestamp(date: Date): string {
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return 'Ontem';
  }
  const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    return format(date, 'EEE', { locale: ptBR });
  }
  return format(date, 'dd/MM', { locale: ptBR });
}

// Ícone para tipo de mídia
function getMidiaIcon(tipo: string | null) {
  switch (tipo) {
    case 'imagem':
    case 'image':
      return <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    case 'audio':
      return <Mic className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    case 'video':
      return <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    case 'documento':
    case 'document':
      return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    default:
      return null;
  }
}

export const ConversaItemComercial = memo(function ConversaItemComercial({
  contato,
  isSelected,
  onSelect,
  onAvatarClick,
  style,
}: ConversaItemComercialProps) {
  const displayName = contato.whatsapp_profile_name || contato.nome || formatPhone(contato.telefone);
  const hasUnread = contato.nao_lidas > 0;
  const isFromMe = contato.ultima_mensagem_is_from_me;
  const midiaIcon = getMidiaIcon(contato.ultima_mensagem_tipo_midia);

  return (
    <div
      style={style}
      className={cn(
        'flex items-center gap-3 px-4 cursor-pointer transition-colors',
        'hover:bg-muted/50 active:bg-muted/70',
        'h-[72px]',
        isSelected && 'bg-muted/80 hover:bg-muted/80'
      )}
      onClick={onSelect}
    >
      {/* Avatar */}
      <div 
        className="relative flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onAvatarClick?.();
        }}
      >
        <Avatar className="h-12 w-12 cursor-pointer">
          <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 py-2.5 border-b border-border/30">
        {/* Linha 1: Nome + Timestamp */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            'text-base truncate',
            hasUnread ? 'font-semibold text-foreground' : 'font-normal text-foreground'
          )}>
            {displayName}
          </span>
          
          {contato.ultima_mensagem && (
            <span className={cn(
              'text-xs flex-shrink-0',
              hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'
            )}>
              {formatTimestamp(new Date(contato.ultima_mensagem))}
            </span>
          )}
        </div>

        {/* Linha 2: Preview + Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* Status de leitura para mensagens enviadas */}
            {isFromMe && (
              <CheckCheck className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
            
            {midiaIcon}
            
            <p className={cn(
              'text-sm truncate',
              hasUnread ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {contato.ultima_mensagem_texto || 'Sem mensagens'}
            </p>
          </div>
          
          {/* Badge de não lidas */}
          {hasUnread && (
            <div className="min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center px-1.5 flex-shrink-0">
              {contato.nao_lidas > 99 ? '99+' : contato.nao_lidas}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
