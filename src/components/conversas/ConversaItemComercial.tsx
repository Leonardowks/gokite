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

// Verifica se o nome é válido (não é apenas números curtos)
function isValidDisplayName(name: string): boolean {
  if (!name) return false;
  const cleanName = name.trim();
  // Inválido se: muito curto, apenas números, ou menos de 3 caracteres
  if (cleanName.length < 3) return false;
  if (/^\d+$/.test(cleanName) && cleanName.length < 10) return false;
  return true;
}

// Obter nome de exibição com fallback seguro
function getDisplayName(contato: ContatoComUltimaMensagem): string {
  // Prioridade: nome do perfil WhatsApp > nome cadastrado > telefone formatado
  if (contato.whatsapp_profile_name && isValidDisplayName(contato.whatsapp_profile_name)) {
    return contato.whatsapp_profile_name;
  }
  if (contato.nome && isValidDisplayName(contato.nome)) {
    return contato.nome;
  }
  // Fallback: telefone formatado (se válido) ou "Contato desconhecido"
  if (contato.telefone && contato.telefone.length >= 10) {
    return formatPhone(contato.telefone);
  }
  return 'Contato desconhecido';
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
  const displayName = getDisplayName(contato);
  const lastMessageTime = contato.ultimo_contato 
    ? formatTimestamp(new Date(contato.ultimo_contato))
    : '';
  
  const unreadCount = contato.nao_lidas || 0;
  const midiaIcon = getMidiaIcon(contato.ultima_mensagem_tipo_midia || null);
  
  const isFromMe = contato.ultima_mensagem_is_from_me;
  const messagePrefix = isFromMe ? 'Você: ' : '';
  
  // Interesse visual
  const scoreInteresse = contato.score_interesse || 0;
  const isHotLead = scoreInteresse >= 70;
  const isWarmLead = scoreInteresse >= 40 && scoreInteresse < 70;

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAvatarClick?.();
  };

  return (
    <div
      style={style}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150',
        'h-[72px] border-b border-border/30',
        // Hover sofisticado com gradiente
        'hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/60',
        // Estado selecionado com borda lateral
        isSelected && 'bg-muted/60 border-l-[3px] border-l-primary shadow-sm',
        !isSelected && 'border-l-[3px] border-l-transparent'
      )}
    >
      {/* Avatar com indicadores */}
      <div 
        className="relative shrink-0 cursor-pointer group"
        onClick={handleAvatarClick}
      >
        <Avatar className={cn(
          'h-12 w-12 transition-transform group-hover:scale-105',
          isHotLead && 'ring-2 ring-orange-500/50',
          isWarmLead && 'ring-2 ring-yellow-500/40'
        )}>
          <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Badge de não lidos no avatar */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white ring-2 ring-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        
        {/* Indicador de lead quente */}
        {isHotLead && (
          <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">🔥</span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            'font-medium text-[15px] truncate',
            unreadCount > 0 && 'font-semibold'
          )}>
            {displayName}
          </span>
          <span className={cn(
            'text-xs shrink-0',
            unreadCount > 0 ? 'text-green-500 font-medium' : 'text-muted-foreground'
          )}>
            {lastMessageTime}
          </span>
        </div>
        
        {/* Preview da mensagem */}
        <div className="flex items-center gap-1.5">
          {midiaIcon && (
            <span className="text-muted-foreground shrink-0">{midiaIcon}</span>
          )}
          <p className={cn(
            'text-sm line-clamp-1',
            unreadCount > 0 
              ? 'text-foreground font-medium' 
              : 'text-muted-foreground'
          )}>
            {messagePrefix}{contato.ultima_mensagem || 'Sem mensagens'}
          </p>
        </div>
      </div>
    </div>
  );
});
