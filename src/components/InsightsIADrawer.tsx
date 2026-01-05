import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Brain,
  Target,
  AlertTriangle,
  Zap,
  Lightbulb,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Minus,
  RefreshCw,
  Loader2,
  Phone,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InsightsConversa } from '@/hooks/useConversasWhatsapp';
import { ContatoComUltimaMensagem } from '@/hooks/useConversasPage';

interface InsightsIADrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contato: ContatoComUltimaMensagem | null;
  insights: InsightsConversa | null;
  isLoading: boolean;
  onReanalizar: () => void;
  isAnalisando: boolean;
}

export function InsightsIADrawer({
  open,
  onOpenChange,
  contato,
  insights,
  isLoading,
  onReanalizar,
  isAnalisando,
}: InsightsIADrawerProps) {
  const [copiado, setCopiado] = useState(false);

  if (!contato) return null;

  const displayName = contato.nome || contato.whatsapp_profile_name || contato.telefone;

  const handleCopiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positivo':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negativo':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getIntencaoColor = (prob: number | null) => {
    if (!prob) return 'bg-muted';
    if (prob >= 70) return 'bg-green-500';
    if (prob >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getIntencaoLabel = (prob: number | null) => {
    if (!prob) return 'Indefinida';
    if (prob >= 70) return 'Alta';
    if (prob >= 40) return 'Média';
    return 'Baixa';
  };

  // Template de resposta baseado nos insights
  const gerarTemplateResposta = () => {
    if (!insights) return '';

    let template = `Olá${contato.nome ? ` ${contato.nome.split(' ')[0]}` : ''}! `;

    // Adicionar contexto baseado nos interesses
    if (insights.principais_interesses?.length) {
      const interesse = insights.principais_interesses[0];
      template += `Que legal seu interesse em ${interesse}! `;
    }

    // Adicionar resposta para objeções
    if (insights.objecoes_identificadas?.length) {
      const objecao = insights.objecoes_identificadas[0].toLowerCase();
      if (objecao.includes('preço') || objecao.includes('valor')) {
        template += 'Tenho algumas opções especiais que podem caber no seu orçamento. ';
      } else if (objecao.includes('horário') || objecao.includes('tempo')) {
        template += 'Temos horários flexíveis que podem funcionar pra você. ';
      }
    }

    // Sugestão de próxima ação
    if (insights.proxima_acao_sugerida) {
      template += `\n\n${insights.proxima_acao_sugerida}`;
    } else {
      template += '\n\nPosso te explicar melhor como funciona?';
    }

    return template;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-br from-primary/5 to-cyan/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-lg">Análise IA</SheetTitle>
                <p className="text-xs text-muted-foreground">{displayName}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onReanalizar}
              disabled={isAnalisando}
            >
              {isAnalisando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !insights ? (
              <div className="text-center py-8">
                <Brain className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground mb-2">Insights não disponíveis</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique no botão acima para analisar as conversas com IA
                </p>
                <Button onClick={onReanalizar} disabled={isAnalisando}>
                  {isAnalisando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analisar Conversas
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                {/* Resumo Executivo */}
                {insights.resumo_ia && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Resumo Executivo
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 leading-relaxed">
                      {insights.resumo_ia}
                    </p>
                  </div>
                )}

                {/* Intenção de Compra */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Intenção de Compra
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold">
                        {getIntencaoLabel(insights.probabilidade_conversao)}
                      </span>
                      <span className={cn('text-3xl font-bold', getScoreColor(insights.probabilidade_conversao || 0))}>
                        {insights.probabilidade_conversao || 0}%
                      </span>
                    </div>
                    <Progress
                      value={insights.probabilidade_conversao || 0}
                      className={cn('h-2', getIntencaoColor(insights.probabilidade_conversao))}
                    />
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      {getSentimentIcon(insights.sentimento_geral)}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {insights.sentimento_geral || 'Neutro'}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className={cn('text-lg font-bold', getScoreColor(insights.score_engajamento || 0))}>
                      {insights.score_engajamento || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Engajamento</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold">{insights.total_mensagens || 0}</p>
                    <p className="text-xs text-muted-foreground">Mensagens</p>
                  </div>
                </div>

                {/* Objeções */}
                {insights.objecoes_identificadas && insights.objecoes_identificadas.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Objeções Identificadas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {insights.objecoes_identificadas.map((obj, i) => (
                        <Badge key={i} variant="outline" className="bg-amber-500/5 border-amber-500/30 text-amber-600">
                          {obj}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gatilhos de Compra */}
                {insights.gatilhos_compra && insights.gatilhos_compra.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-green-500" />
                      Gatilhos de Compra
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {insights.gatilhos_compra.map((gatilho, i) => (
                        <Badge key={i} variant="outline" className="bg-green-500/5 border-green-500/30 text-green-600">
                          {gatilho}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interesses */}
                {insights.principais_interesses && insights.principais_interesses.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      Principais Interesses
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {insights.principais_interesses.map((interesse, i) => (
                        <Badge key={i} variant="outline" className="bg-blue-500/5 border-blue-500/30 text-blue-600">
                          {interesse}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Próxima Ação Sugerida */}
                {insights.proxima_acao_sugerida && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Próxima Ação Sugerida
                    </h4>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <p className="text-sm font-medium">{insights.proxima_acao_sugerida}</p>
                    </div>
                  </div>
                )}

                {/* Padrões de Contato */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Padrões de Contato
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground text-xs mb-1">Melhor horário</p>
                      <p className="font-medium">{insights.horario_preferido || 'Não identificado'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground text-xs mb-1">Melhor dia</p>
                      <p className="font-medium capitalize">{insights.dia_preferido || 'Não identificado'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Template de Resposta */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Copy className="h-4 w-4 text-primary" />
                    Template de Resposta
                  </h4>
                  <div className="relative">
                    <Textarea
                      value={gerarTemplateResposta()}
                      readOnly
                      className="min-h-[120px] pr-12 resize-none bg-muted/50"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopiar(gerarTemplateResposta())}
                    >
                      {copiado ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer com ações */}
        {insights && (
          <div className="p-4 border-t space-y-2">
            <Button className="w-full gap-2" asChild>
              <a
                href={`https://wa.me/${contato.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(gerarTemplateResposta())}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone className="h-4 w-4" />
                Abrir WhatsApp com Resposta
                <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-50" />
              </a>
            </Button>
            <Button variant="outline" className="w-full gap-2">
              <Calendar className="h-4 w-4" />
              Agendar Follow-up
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
