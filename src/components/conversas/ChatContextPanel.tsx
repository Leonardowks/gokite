import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Target, 
  AlertTriangle, 
  Zap, 
  TrendingUp,
  Clock,
  Lightbulb,
  ChevronRight,
  RefreshCw,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Meh,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContatoComUltimaMensagem } from '@/hooks/useConversasPage';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatContextPanelProps {
  contato: ContatoComUltimaMensagem;
  onAnalisar: () => void;
  isAnalisando: boolean;
}

export function ChatContextPanel({ contato, onAnalisar, isAnalisando }: ChatContextPanelProps) {
  const score = contato.score_interesse || 0;
  const probabilidade = contato.probabilidade_conversao || 0;
  
  const scoreColor = useMemo(() => {
    if (score >= 70) return 'text-green-600 bg-green-500/10';
    if (score >= 40) return 'text-amber-600 bg-amber-500/10';
    return 'text-muted-foreground bg-muted';
  }, [score]);

  const sentimentoIcon = useMemo(() => {
    switch (contato.sentimento_geral) {
      case 'positivo':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negativo':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return <Meh className="h-4 w-4 text-muted-foreground" />;
    }
  }, [contato.sentimento_geral]);

  const hasInsights = contato.resumo_ia || 
    (contato.objecoes && contato.objecoes.length > 0) || 
    (contato.gatilhos && contato.gatilhos.length > 0) ||
    contato.proxima_acao_sugerida;

  return (
    <div className="h-full flex flex-col bg-card border-l border-border/50">
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Insights Comerciais</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAnalisar}
            disabled={isAnalisando}
            className="h-7 gap-1 text-xs"
          >
            <RefreshCw className={cn('h-3 w-3', isAnalisando && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Métricas Principais */}
          <div className="grid grid-cols-2 gap-2">
            {/* Score de Interesse */}
            <div className={cn('p-3 rounded-lg', scoreColor)}>
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">Interesse</span>
              </div>
              <div className="text-2xl font-bold">{score}%</div>
            </div>

            {/* Probabilidade de Conversão */}
            <div className="p-3 rounded-lg bg-primary/5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-medium uppercase tracking-wide text-primary">Conversão</span>
              </div>
              <div className="text-2xl font-bold text-primary">{probabilidade}%</div>
            </div>
          </div>

          {/* Sentimento e Última Análise */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {sentimentoIcon}
              <span className="text-xs capitalize">
                {contato.sentimento_geral || 'Não analisado'}
              </span>
            </div>
            {contato.conversas_analisadas && contato.conversas_analisadas > 0 ? (
              <span className="text-[10px] text-muted-foreground">
                {contato.conversas_analisadas} análise{contato.conversas_analisadas > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>

          {!hasInsights ? (
            /* Estado sem análise */
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Brain className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                Nenhuma análise IA ainda
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={onAnalisar}
                disabled={isAnalisando}
                className="gap-1.5"
              >
                <Brain className={cn('h-3.5 w-3.5', isAnalisando && 'animate-pulse')} />
                Analisar Conversa
              </Button>
            </div>
          ) : (
            <>
              <Separator />

              {/* Próxima Ação Sugerida */}
              {contato.proxima_acao_sugerida && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold">Próxima Ação</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                      {contato.proxima_acao_sugerida}
                    </p>
                  </div>
                </div>
              )}

              {/* Resumo IA */}
              {contato.resumo_ia && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold">Resumo</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {contato.resumo_ia}
                  </p>
                </div>
              )}

              {/* Objeções Identificadas */}
              {contato.objecoes && contato.objecoes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-semibold">Objeções</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contato.objecoes.slice(0, 5).map((objecao, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] bg-red-500/5 border-red-500/30 text-red-600"
                      >
                        {objecao}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Gatilhos de Compra */}
              {contato.gatilhos && contato.gatilhos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs font-semibold">Gatilhos de Compra</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contato.gatilhos.slice(0, 5).map((gatilho, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] bg-green-500/5 border-green-500/30 text-green-600"
                      >
                        {gatilho}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dores Identificadas */}
              {contato.dores_identificadas && contato.dores_identificadas.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-semibold">Dores/Necessidades</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contato.dores_identificadas.slice(0, 5).map((dor, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] bg-blue-500/5 border-blue-500/30 text-blue-600"
                      >
                        {dor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Interesse Principal */}
              {contato.interesse_principal && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-cyan-500" />
                    <span className="text-xs font-semibold">Interesse Principal</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {contato.interesse_principal}
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer com última atualização */}
      {contato.ultimo_contato && (
        <div className="p-2 border-t border-border/50 bg-muted/30">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Último contato: {formatDistanceToNow(new Date(contato.ultimo_contato), { locale: ptBR, addSuffix: true })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
