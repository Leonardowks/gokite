import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Image,
  Mic,
  Video,
  FileText,
  Building2,
  Star,
  Flame,
  Clock,
} from 'lucide-react';
import { isToday, isYesterday, format, differenceInHours } from 'date-fns';
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
      return <Image className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
    case 'audio':
      return <Mic className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
    case 'video':
      return <Video className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
    case 'documento':
    case 'document':
      return <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
    default:
      return null;
  }
}

// Verifica se é lead quente
function isHotLead(contato: ContatoComUltimaMensagem): boolean {
  return (
    (contato.score_interesse !== null && contato.score_interesse >= 70) ||
    contato.status === 'lead_quente' ||
    contato.prioridade === 'urgente'
  );
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
  const isPriority = contato.prioridade === 'alta' || contato.prioridade === 'urgente';
  const isHot = isHotLead(contato);

  // Calcular tempo sem resposta (apenas se última msg é do cliente)
  const tempoSemResposta = contato.ultima_mensagem && !isFromMe
    ? differenceInHours(new Date(), new Date(contato.ultima_mensagem))
    : null;
  
  // Mostrar alerta apenas se > 6h
  const showTempoAlerta = tempoSemResposta !== null && tempoSemResposta >= 6;

  return (
    <div
      style={style}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer border-b border-border/30',
        'hover:bg-muted/50 active:bg-muted/70',
        'min-h-[60px]',
        isSelected && 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary',
        hasUnread && !isSelected && 'bg-primary/5'
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
        <Avatar className="h-11 w-11 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
          <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Badge de não lidas */}
        {hasUnread && (
          <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold px-1">
            {contato.nao_lidas > 99 ? '99+' : contato.nao_lidas}
          </div>
        )}
        
        {/* Indicador de prioridade */}
        {isPriority && !hasUnread && (
          <div className="absolute -top-1 -right-1">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
        )}
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0">
        {/* Linha 1: Nome + Indicadores + Timestamp */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={cn(
              'font-medium truncate text-sm',
              hasUnread && 'font-semibold'
            )}>
              {displayName}
            </span>
            {contato.is_business && (
              <Building2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            )}
            {isHot && (
              <Flame className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Tempo sem resposta */}
            {showTempoAlerta && (
              <div className={cn(
                'flex items-center gap-0.5 text-[10px]',
                tempoSemResposta >= 24 ? 'text-red-500' : 'text-amber-500'
              )}>
                <Clock className="h-3 w-3" />
                <span>{tempoSemResposta >= 24 ? `${Math.floor(tempoSemResposta / 24)}d` : `${tempoSemResposta}h`}</span>
              </div>
            )}
            
            {/* Timestamp */}
            {contato.ultima_mensagem && (
              <span className={cn(
                'text-[11px]',
                hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'
              )}>
                {formatTimestamp(new Date(contato.ultima_mensagem))}
              </span>
            )}
          </div>
        </div>

        {/* Linha 2: Preview da mensagem */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {isFromMe && (
            <span className="text-xs text-muted-foreground flex-shrink-0">Você:</span>
          )}
          {midiaIcon}
          <p className={cn(
            'text-xs truncate',
            hasUnread ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {contato.ultima_mensagem_texto || 'Sem mensagens'}
          </p>
        </div>
      </div>
    </div>
  );
});
