import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContatoComUltimaMensagem } from '@/hooks/useConversasPage';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OportunidadesQuentesProps {
  contatos: ContatoComUltimaMensagem[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export function OportunidadesQuentes({ contatos, onSelect, selectedId }: OportunidadesQuentesProps) {
  // Filtrar oportunidades quentes (score > 50 ou prioridade alta/urgente)
  const oportunidades = useMemo(() => {
    return contatos
      .filter(c => 
        (c.score_interesse && c.score_interesse >= 50) || 
        c.prioridade === 'alta' || 
        c.prioridade === 'urgente' ||
        c.status === 'lead_quente'
      )
      .sort((a, b) => (b.score_interesse || 0) - (a.score_interesse || 0))
      .slice(0, 5);
  }, [contatos]);

  if (oportunidades.length === 0) return null;

  return (
    <div className="border-b border-border/50 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent">
      <div className="px-4 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/10">
            <Target className="h-3.5 w-3.5 text-orange-500" />
          </div>
          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
            Oportunidades
          </span>
          <Badge variant="secondary" className="h-5 px-2 text-xs bg-orange-500/10 text-orange-600 border-0">
            {oportunidades.length}
          </Badge>
        </div>

        {/* Lista horizontal de oportunidades */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
          {oportunidades.map((contato) => {
            const displayName = contato.whatsapp_profile_name || contato.nome || contato.telefone;
            const score = contato.score_interesse || 0;
            const isSelected = selectedId === contato.id;
            const tempoSemResposta = contato.ultima_mensagem && !contato.ultima_mensagem_is_from_me
              ? formatDistanceToNow(new Date(contato.ultima_mensagem), { locale: ptBR, addSuffix: false })
              : null;

            return (
              <button
                key={contato.id}
                onClick={() => onSelect(contato.id)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-3 p-3 rounded-xl border transition-all',
                  'min-w-[160px] max-w-[200px]',
                  'hover:border-orange-500/50 hover:bg-orange-500/5 active:bg-orange-500/10',
                  isSelected 
                    ? 'border-orange-500/50 bg-orange-500/10' 
                    : 'border-border/50 bg-card'
                )}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
                  <AvatarFallback className="bg-orange-500/10 text-orange-600 text-xs font-medium">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          'h-full rounded-full transition-all',
                          score >= 70 ? 'bg-orange-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-orange-600">{score}%</span>
                  </div>
                  {tempoSemResposta && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground truncate">{tempoSemResposta}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
