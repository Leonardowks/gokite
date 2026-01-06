import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  MessageSquare, 
  Filter,
  ChevronDown,
  Flame,
  SlidersHorizontal,
} from 'lucide-react';
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
import { OportunidadesQuentes } from './conversas/OportunidadesQuentes';
import { ConversaItemComercial } from './conversas/ConversaItemComercial';

// Labels dos filtros
const filtroLabels: Record<ConversaFiltro, string> = {
  todos: 'Todos',
  nao_lidos: 'Não lidos',
  leads: 'Leads',
  clientes: 'Clientes',
};

const ordenacaoLabels: Record<ConversaOrdenacao, string> = {
  recentes: 'Recentes',
  nao_lidos: 'Não lidos',
  nome: 'Nome',
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

  // Contar oportunidades quentes
  const totalQuentes = useMemo(() => 
    contatos.filter(c => 
      (c.score_interesse && c.score_interesse >= 50) || 
      c.prioridade === 'alta' || 
      c.prioridade === 'urgente' ||
      c.status === 'lead_quente'
    ).length, 
    [contatos]
  );

  // Virtualização para performance com muitos contatos
  const virtualizer = useVirtualizer({
    count: contatosFiltrados.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b space-y-3">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
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
      <div className="px-4 py-3 border-b border-border/50 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 bg-muted/50 border-0 h-11 text-sm"
          />
        </div>

        {/* Filtros e Contador */}
        <div className="flex items-center gap-2">
          {/* Filtro */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-sm min-w-[44px]">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">{filtroLabels[filtro]}</span>
                {totalNaoLidos > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[18px] px-1.5 text-xs ml-1">
                    {totalNaoLidos > 99 ? '99+' : totalNaoLidos}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">Filtrar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(filtroLabels).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onFiltroChange(key as ConversaFiltro)}
                  className={cn('min-h-[44px]', filtro === key && 'bg-accent')}
                >
                  {label}
                  {key === 'nao_lidos' && totalNaoLidos > 0 && (
                    <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
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
              <Button variant="ghost" size="sm" className="h-9 gap-2 text-sm min-w-[44px]">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">{ordenacaoLabels[ordenacao]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs">Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(ordenacaoLabels).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onOrdenacaoChange(key as ConversaOrdenacao)}
                  className={cn('min-h-[44px]', ordenacao === key && 'bg-accent')}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Indicadores */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {totalQuentes > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <Flame className="h-4 w-4" />
                <span className="font-medium">{totalQuentes}</span>
              </div>
            )}
            <span className="font-medium">{contatosFiltrados.length}</span>
          </div>
        </div>
      </div>

      {/* Seção de Oportunidades Quentes */}
      <OportunidadesQuentes 
        contatos={contatos} 
        onSelect={onSelect} 
        selectedId={selectedId} 
      />

      {/* Lista virtualizada */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {contatosFiltrados.length === 0 ? (
          <div className="p-10 text-center">
            <MessageSquare className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-base">
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

              return (
                <ConversaItemComercial
                  key={contato.id}
                  contato={contato}
                  isSelected={selectedId === contato.id}
                  onSelect={() => onSelect(contato.id)}
                  onAvatarClick={() => onAvatarClick?.(contato)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
