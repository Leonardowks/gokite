import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContatoComUltimaMensagem, ConversaFiltro, ConversaOrdenacao } from '@/hooks/useConversasPage';
import { useDebounce } from '@/hooks/useDebounce';
import { ConversaItemComercial } from './conversas/ConversaItemComercial';

// Labels dos filtros
const filtroLabels: Record<ConversaFiltro, string> = {
  todos: 'Todos',
  nao_lidos: 'Não lidos',
  leads: 'Leads',
  clientes: 'Clientes',
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

  // Virtualização para performance
  const virtualizer = useVirtualizer({
    count: contatosFiltrados.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
        <div className="flex-1 p-2 space-y-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Busca */}
      <div className="p-3 bg-muted/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar ou começar nova conversa"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 bg-card border-0 h-10 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Filtros como Pills */}
      <div className="px-3 py-2 flex gap-2 overflow-x-auto scrollbar-none border-b border-border/30">
        {(Object.keys(filtroLabels) as ConversaFiltro[]).map((key) => (
          <Button
            key={key}
            variant={filtro === key ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 px-3 rounded-full text-xs font-medium shrink-0',
              filtro === key 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-transparent border-border/50 hover:bg-muted/50'
            )}
            onClick={() => onFiltroChange(key)}
          >
            {filtroLabels[key]}
            {key === 'nao_lidos' && totalNaoLidos > 0 && (
              <Badge 
                variant="secondary" 
                className={cn(
                  'ml-1.5 h-5 min-w-[20px] px-1.5 text-xs rounded-full',
                  filtro === key 
                    ? 'bg-primary-foreground/20 text-primary-foreground' 
                    : 'bg-primary text-primary-foreground'
                )}
              >
                {totalNaoLidos > 99 ? '99+' : totalNaoLidos}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Lista virtualizada */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {contatosFiltrados.length === 0 ? (
          <div className="p-10 text-center">
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
