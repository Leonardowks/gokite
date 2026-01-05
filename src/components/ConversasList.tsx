import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageSquare, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ContatoComUltimaMensagem } from '@/hooks/useConversasPage';

// Formatar telefone para exibição amigável
function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    // Formato: +55 (11) 99999-9999
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12 && clean.startsWith('55')) {
    // Formato: +55 (11) 9999-9999
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  return phone;
}

interface ConversasListProps {
  contatos: ContatoComUltimaMensagem[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversasList({ contatos, isLoading, selectedId, onSelect }: ConversasListProps) {
  const [busca, setBusca] = useState('');

  const contatosFiltrados = useMemo(() => {
    if (!busca.trim()) return contatos;
    const termo = busca.toLowerCase();
    return contatos.filter(
      (c) =>
        c.nome?.toLowerCase().includes(termo) ||
        c.telefone.includes(termo) ||
        c.whatsapp_profile_name?.toLowerCase().includes(termo)
    );
  }, [contatos, busca]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <Skeleton className="h-10 w-full" />
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
      {/* Header com busca */}
      <div className="p-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Lista de conversas */}
      <ScrollArea className="flex-1">
        {contatosFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              {busca ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {contatosFiltrados.map((contato) => {
              const isSelected = selectedId === contato.id;
              // Prioridade: nome WhatsApp > nome cadastrado > telefone formatado
              const displayName = 
                contato.whatsapp_profile_name || 
                contato.nome || 
                formatPhone(contato.telefone);
              const hasUnread = contato.nao_lidas > 0;
              const isFromMe = contato.ultima_mensagem_remetente === 'empresa';

              return (
                <button
                  key={contato.id}
                  onClick={() => onSelect(contato.id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50',
                    isSelected && 'bg-primary/5 hover:bg-primary/10',
                    hasUnread && 'bg-primary/5'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {hasUnread && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                        {contato.nao_lidas > 9 ? '9+' : contato.nao_lidas}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={cn(
                        'font-medium truncate',
                        hasUnread && 'font-semibold'
                      )}>
                        {displayName}
                      </span>
                      {contato.ultima_mensagem && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(contato.ultima_mensagem), {
                            addSuffix: false,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>

                    {/* Preview da mensagem */}
                    <div className="flex items-center gap-1.5">
                      {isFromMe && (
                        <span className="text-xs text-muted-foreground">Você:</span>
                      )}
                      <p className={cn(
                        'text-sm truncate',
                        hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}>
                        {contato.ultima_mensagem_texto || 'Sem mensagens'}
                      </p>
                    </div>

                    {/* Status badge */}
                    {contato.status && contato.status !== 'nao_classificado' && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-1.5 text-[10px] h-5',
                          contato.status === 'lead' && 'border-blue-500/50 text-blue-600 bg-blue-500/5',
                          contato.status === 'cliente_ativo' && 'border-green-500/50 text-green-600 bg-green-500/5'
                        )}
                      >
                        {contato.status === 'lead' ? 'Lead' : contato.status === 'cliente_ativo' ? 'Cliente' : contato.status}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
