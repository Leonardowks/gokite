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
  Snowflake,
  Zap,
  Clock,
  TrendingUp,
  MessageCircle,
  Calendar,
  Send,
  PhoneCall,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, format, differenceInHours } from 'date-fns';
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
      return <Image className="h-3 w-3 text-muted-foreground" />;
    case 'audio':
      return <Mic className="h-3 w-3 text-muted-foreground" />;
    case 'video':
      return <Video className="h-3 w-3 text-muted-foreground" />;
    case 'documento':
    case 'document':
      return <FileText className="h-3 w-3 text-muted-foreground" />;
    default:
      return null;
  }
}

// Obter badge de temperatura
function getTemperaturaBadge(score: number | null, status: string | null, prioridade: string | null) {
  // Score alto ou lead quente = Quente
  if ((score && score >= 70) || status === 'lead_quente' || prioridade === 'urgente') {
    return {
      icon: Flame,
      label: 'Quente',
      className: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
      iconClassName: 'text-orange-500',
    };
  }
  // Score médio = Morno
  if ((score && score >= 40) || prioridade === 'alta') {
    return {
      icon: Zap,
      label: 'Morno',
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      iconClassName: 'text-amber-500',
    };
  }
  // Score baixo = Frio
  if (score !== null && score < 40) {
    return {
      icon: Snowflake,
      label: 'Frio',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      iconClassName: 'text-blue-500',
    };
  }
  return null;
}

// Sugestão de próxima ação baseada no contexto
function getProximaAcao(contato: ContatoComUltimaMensagem) {
  const horasSemResposta = contato.ultima_mensagem && !contato.ultima_mensagem_is_from_me
    ? differenceInHours(new Date(), new Date(contato.ultima_mensagem))
    : 0;
  
  // Se tem próxima ação sugerida pela IA
  if (contato.proxima_acao_sugerida) {
    const acao = contato.proxima_acao_sugerida.toLowerCase();
    if (acao.includes('agendar') || acao.includes('aula')) {
      return { icon: Calendar, label: 'Agendar aula', color: 'text-green-600' };
    }
    if (acao.includes('proposta') || acao.includes('preço') || acao.includes('valor')) {
      return { icon: Send, label: 'Enviar proposta', color: 'text-blue-600' };
    }
    if (acao.includes('ligar') || acao.includes('telefone')) {
      return { icon: PhoneCall, label: 'Ligar', color: 'text-purple-600' };
    }
    if (acao.includes('follow') || acao.includes('retorno')) {
      return { icon: MessageCircle, label: 'Follow-up', color: 'text-amber-600' };
    }
  }

  // Lógica baseada em comportamento
  if (horasSemResposta > 24 && contato.score_interesse && contato.score_interesse >= 50) {
    return { icon: MessageCircle, label: 'Follow-up', color: 'text-amber-600' };
  }
  if (contato.status === 'lead_quente' || (contato.score_interesse && contato.score_interesse >= 70)) {
    return { icon: Calendar, label: 'Agendar aula', color: 'text-green-600' };
  }
  if (contato.interesse_principal === 'Aula' || contato.interesse_principal === 'Kite') {
    return { icon: Calendar, label: 'Oferecer aula', color: 'text-green-600' };
  }
  
  return null;
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
  const score = contato.score_interesse;
  const temperatura = getTemperaturaBadge(score, contato.status, contato.prioridade);
  const proximaAcao = getProximaAcao(contato);

  // Calcular tempo sem resposta
  const tempoSemResposta = contato.ultima_mensagem && !isFromMe
    ? differenceInHours(new Date(), new Date(contato.ultima_mensagem))
    : null;

  return (
    <div
      style={style}
      className={cn(
        'flex items-start gap-3 p-3 text-left transition-all hover:bg-muted/50 border-b border-border/30 cursor-pointer group',
        isSelected && 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary',
        hasUnread && !isSelected && 'bg-primary/5',
        // Animação sutil para novas mensagens
        hasUnread && 'animate-in fade-in-50 duration-300'
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
        <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
          <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Badge de não lidas */}
        {hasUnread && (
          <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold px-1 animate-pulse">
            {contato.nao_lidas > 99 ? '99+' : contato.nao_lidas}
          </div>
        )}
        
        {/* Indicador de prioridade */}
        {isPriority && !hasUnread && (
          <div className="absolute -top-0.5 -right-0.5">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
        )}
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Linha 1: Nome + Timestamp */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              'font-medium truncate text-sm',
              hasUnread && 'font-semibold'
            )}>
              {displayName}
            </span>
            {contato.is_business && (
              <Building2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            )}
          </div>
          {contato.ultima_mensagem && (
            <span className={cn(
              'text-[11px] flex-shrink-0',
              hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'
            )}>
              {formatTimestamp(new Date(contato.ultima_mensagem))}
            </span>
          )}
        </div>

        {/* Linha 2: Preview da mensagem */}
        <div className="flex items-center gap-1.5">
          {isFromMe && (
            <span className="text-xs text-muted-foreground flex-shrink-0">Você:</span>
          )}
          {midiaIcon}
          <p className={cn(
            'text-xs truncate',
            hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}>
            {contato.ultima_mensagem_texto || 'Sem mensagens'}
          </p>
        </div>

        {/* Linha 3: Indicadores comerciais */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Barra de score visual */}
          {score !== null && score > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full rounded-full transition-all',
                    score >= 70 ? 'bg-orange-500' : score >= 40 ? 'bg-amber-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">{score}%</span>
            </div>
          )}

          {/* Badge de temperatura */}
          {temperatura && (
            <Badge 
              variant="outline" 
              className={cn('h-5 px-1.5 text-[10px] gap-0.5', temperatura.className)}
            >
              <temperatura.icon className={cn('h-3 w-3', temperatura.iconClassName)} />
              {temperatura.label}
            </Badge>
          )}

          {/* Tempo sem resposta (se > 2h e é mensagem do cliente) */}
          {tempoSemResposta !== null && tempoSemResposta >= 2 && (
            <div className={cn(
              'flex items-center gap-0.5 text-[10px]',
              tempoSemResposta >= 24 ? 'text-red-500' : tempoSemResposta >= 6 ? 'text-amber-500' : 'text-muted-foreground'
            )}>
              <Clock className="h-3 w-3" />
              <span>{tempoSemResposta >= 24 ? `${Math.floor(tempoSemResposta / 24)}d` : `${tempoSemResposta}h`}</span>
            </div>
          )}

          {/* Próxima ação sugerida */}
          {proximaAcao && (
            <Badge 
              variant="outline" 
              className="h-5 px-1.5 text-[10px] gap-0.5 bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <proximaAcao.icon className={cn('h-3 w-3', proximaAcao.color)} />
              <span className={proximaAcao.color}>{proximaAcao.label}</span>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});
