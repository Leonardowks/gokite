import { useState, useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  MessageSquare, 
  Filter,
  Image,
  Mic,
  Video,
  FileText,
  Building2,
  Star,
  ChevronDown,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ContatoComUltimaMensagem, ConversaFiltro, ConversaOrdenacao } from '@/hooks/useConversasPage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/useDebounce';

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
  // Dentro da última semana
  const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    return format(date, 'EEE', { locale: ptBR });
  }
  // Mais antigo
  return format(date, 'dd/MM', { locale: ptBR });
}

// Ícone para tipo de mídia
function getMidiaIcon(tipo: string | null) {
  switch (tipo) {
    case 'imagem':
    case 'image':
      return <Image className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'audio':
      return <Mic className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'video':
      return <Video className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'documento':
    case 'document':
      return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    default:
      return null;
  }
}

// Labels dos filtros
const filtroLabels: Record<ConversaFiltro, string> = {
  todos: 'Todos',
  nao_lidos: 'Não lidos',
  leads: 'Leads',
  clientes: 'Clientes',
};

const ordenacaoLabels: Record<ConversaOrdenacao, string> = {
  recentes: 'Mais recentes',
  nao_lidos: 'Não lidos primeiro',
  nome: 'Por nome',
};

interface ConversasListProps {
  contatos: ContatoComUltimaMensagem[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAvatarClick?: (contato: ContatoComUltimaMensagem) => void;
  filtro: ConversaFiltro;
  onFiltroChange: (filtro: ConversaFiltro) => void;
  ordenacao: ConversaOrdenacao;
  onOrdenacaoChange: (ordenacao: ConversaOrdenacao) => void;
}

export function ConversasList({ 
  contatos, 
  isLoading, 
  selectedId, 
  onSelect,
  onAvatarClick,
  filtro,
  onFiltroChange,
  ordenacao,
  onOrdenacaoChange,
}: ConversasListProps) {
  const [busca, setBusca] = useState('');
  const debouncedBusca = useDebounce(busca, 300);
  const parentRef = useRef<HTMLDivElement>(null);

  // Filtrar por busca
  const contatosFiltrados = useMemo(() => {
    if (!debouncedBusca.trim()) return contatos;
    const termo = debouncedBusca.toLowerCase();
    return contatos.filter(
      (c) =>
        c.nome?.toLowerCase().includes(termo) ||
        c.telefone.includes(termo) ||
        c.whatsapp_profile_name?.toLowerCase().includes(termo)
    );
  }, [contatos, debouncedBusca]);

  // Contar não lidos
  const totalNaoLidos = useMemo(() => 
    contatos.reduce((acc, c) => acc + c.nao_lidas, 0), 
    [contatos]
  );

  // Virtualização para performance com muitos contatos
  const virtualizer = useVirtualizer({
    count: contatosFiltrados.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b space-y-3">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header com busca e filtros */}
      <div className="p-3 border-b border-border/50 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-muted/50 border-0 h-9"
          />
        </div>

        {/* Filtros e ordenação */}
        <div className="flex items-center gap-2">
          {/* Filtro */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <Filter className="h-3 w-3" />
                {filtroLabels[filtro]}
                {totalNaoLidos > 0 && filtro !== 'nao_lidos' && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {totalNaoLidos}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel className="text-xs">Filtrar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(filtroLabels).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onFiltroChange(key as ConversaFiltro)}
                  className={cn(filtro === key && 'bg-accent')}
                >
                  {label}
                  {key === 'nao_lidos' && totalNaoLidos > 0 && (
                    <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">
                      {totalNaoLidos}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Ordenação */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
                {ordenacaoLabels[ordenacao]}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel className="text-xs">Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(ordenacaoLabels).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onOrdenacaoChange(key as ConversaOrdenacao)}
                  className={cn(ordenacao === key && 'bg-accent')}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Contador */}
          <span className="ml-auto text-xs text-muted-foreground">
            {contatosFiltrados.length} conversas
          </span>
        </div>
      </div>

      {/* Lista virtualizada */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {contatosFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              {busca ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const contato = contatosFiltrados[virtualItem.index];
              const isSelected = selectedId === contato.id;
              const displayName = 
                contato.whatsapp_profile_name || 
                contato.nome || 
                formatPhone(contato.telefone);
              const hasUnread = contato.nao_lidas > 0;
              const isFromMe = contato.ultima_mensagem_is_from_me;
              const midiaIcon = getMidiaIcon(contato.ultima_mensagem_tipo_midia);
              const isPriority = contato.prioridade === 'alta' || contato.prioridade === 'urgente';

              return (
                <div
                  key={contato.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className={cn(
                    'flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50 border-b border-border/30 cursor-pointer',
                    isSelected && 'bg-primary/5 hover:bg-primary/10',
                    hasUnread && !isSelected && 'bg-primary/5'
                  )}
                  onClick={() => onSelect(contato.id)}
                >
                  {/* Avatar - clicável para abrir drawer */}
                  <div 
                    className="relative flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAvatarClick?.(contato);
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
                      <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold px-1">
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

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
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

                    {/* Preview da mensagem */}
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

                    {/* Status badge */}
                    {contato.status && contato.status !== 'nao_classificado' && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] h-5 px-1.5',
                            contato.status === 'lead' && 'border-blue-500/50 text-blue-600 bg-blue-500/5',
                            contato.status === 'lead_quente' && 'border-orange-500/50 text-orange-600 bg-orange-500/5',
                            contato.status === 'cliente_ativo' && 'border-green-500/50 text-green-600 bg-green-500/5',
                            contato.status === 'cliente_inativo' && 'border-gray-500/50 text-gray-600 bg-gray-500/5'
                          )}
                        >
                          {contato.status === 'lead' && 'Lead'}
                          {contato.status === 'lead_quente' && 'Lead Quente'}
                          {contato.status === 'cliente_ativo' && 'Cliente'}
                          {contato.status === 'cliente_inativo' && 'Inativo'}
                        </Badge>
                        {contato.score_interesse && contato.score_interesse > 70 && (
                          <span className="text-[10px] text-green-600">
                            {contato.score_interesse}% interesse
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
