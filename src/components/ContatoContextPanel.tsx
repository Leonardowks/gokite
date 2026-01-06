import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Phone,
  Mail,
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Clock,
  Calendar,
  Sparkles,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Zap,
  ShieldAlert,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContatoComUltimaMensagem } from '@/hooks/useConversasPage';
import { useInsightsContato, useAnalisarConversas } from '@/hooks/useConversasWhatsapp';
import { cn } from '@/lib/utils';

interface ContatoContextPanelProps {
  contato: ContatoComUltimaMensagem | null;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  nao_classificado: 'Não Classificado',
  lead: 'Lead',
  cliente_ativo: 'Cliente Ativo',
  cliente_inativo: 'Cliente Inativo',
  invalido: 'Inválido',
};

const statusColors: Record<string, string> = {
  nao_classificado: 'bg-muted text-muted-foreground',
  lead: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  cliente_ativo: 'bg-green-500/10 text-green-600 border-green-500/30',
  cliente_inativo: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  invalido: 'bg-red-500/10 text-red-600 border-red-500/30',
};

const prioridadeLabels: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  media: { label: 'Média', color: 'bg-blue-500/10 text-blue-600' },
  alta: { label: 'Alta', color: 'bg-amber-500/10 text-amber-600' },
  urgente: { label: 'Urgente', color: 'bg-red-500/10 text-red-600' },
};

const interesseLabels: Record<string, string> = {
  kite: '🪁 Kitesurf',
  wing: '🦅 Wing Foil',
  foil: '🏄 Foil',
  aluguel: '🏠 Aluguel',
  equipamento_usado: '🔄 Equipamento Usado',
};

const doresLabels: Record<string, string> = {
  preco: '💰 Preço',
  distancia: '📍 Distância',
  horario: '🕐 Horário',
  equipamento: '🎿 Equipamento',
  medo: '😰 Medo',
  clima: '🌦️ Clima',
};

export function ContatoContextPanel({ contato, onClose }: ContatoContextPanelProps) {
  const [activeTab, setActiveTab] = useState('insights');
  
  const { data: insights, isLoading: loadingInsights } = useInsightsContato(contato?.id || null);
  const analisarMutation = useAnalisarConversas();

  if (!contato) return null;

  const handleAnalisar = () => {
    analisarMutation.mutate(contato.id);
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

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header compacto */}
      <div className="p-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Contexto</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {contato.nome?.slice(0, 2).toUpperCase() || '??'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{contato.nome || 'Sem nome'}</p>
            <div className="flex gap-1.5 mt-1">
              <Badge className={cn('text-[10px] h-5', statusColors[contato.status || 'nao_classificado'])}>
                {statusLabels[contato.status || 'nao_classificado']}
              </Badge>
              {contato.prioridade && contato.prioridade !== 'baixa' && (
                <Badge className={cn('text-[10px] h-5', prioridadeLabels[contato.prioridade]?.color)}>
                  {prioridadeLabels[contato.prioridade]?.label}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 shrink-0">
          <TabsTrigger 
            value="insights"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
          >
            <Brain className="h-3.5 w-3.5 mr-1.5" />
            Insights
          </TabsTrigger>
          <TabsTrigger 
            value="perfil" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
          >
            <User className="h-3.5 w-3.5 mr-1.5" />
            Perfil
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Tab Insights - Primeira por ser mais útil durante conversa */}
          <TabsContent value="insights" className="m-0 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground">Análise IA</h4>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={handleAnalisar}
                disabled={analisarMutation.isPending}
              >
                {analisarMutation.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Atualizar
              </Button>
            </div>

            {loadingInsights ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !insights ? (
              <div className="text-center py-6">
                <Brain className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Clique em "Atualizar" para gerar insights</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Próxima Ação Sugerida - DESTAQUE PRINCIPAL */}
                {insights.proxima_acao_sugerida && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">Próxima Ação</span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {insights.proxima_acao_sugerida}
                    </p>
                  </div>
                )}

                {/* Métricas rápidas */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className={cn('text-lg font-bold', getScoreColor(insights.score_engajamento || 0))}>
                      {insights.score_engajamento || 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Engajamento</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className={cn('text-lg font-bold', getScoreColor(insights.probabilidade_conversao || 0))}>
                      {Math.round(insights.probabilidade_conversao || 0)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Conversão</p>
                  </div>
                </div>

                {/* Sentimento */}
                {insights.sentimento_geral && (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                    {getSentimentIcon(insights.sentimento_geral)}
                    <span className="text-sm capitalize">{insights.sentimento_geral}</span>
                  </div>
                )}

                {/* Gatilhos de Compra */}
                {insights.gatilhos_compra && insights.gatilhos_compra.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3 text-green-500" />
                      Gatilhos de Compra
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {insights.gatilhos_compra.map((gatilho, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] h-5 bg-green-500/5">
                          {gatilho}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Objeções */}
                {insights.objecoes_identificadas && insights.objecoes_identificadas.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3 text-red-500" />
                      Objeções
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {insights.objecoes_identificadas.map((objecao, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] h-5 bg-red-500/5">
                          {objecao}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interesses */}
                {insights.principais_interesses && insights.principais_interesses.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <Target className="h-3 w-3 text-primary" />
                      Interesses
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {insights.principais_interesses.map((interesse, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] h-5">
                          {interesse}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumo IA */}
                {insights.resumo_ia && (
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Resumo
                    </h5>
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 leading-relaxed">
                      {insights.resumo_ia}
                    </p>
                  </div>
                )}

                {/* Padrões */}
                {(insights.horario_preferido || insights.dia_preferido) && (
                  <div className="grid grid-cols-2 gap-2">
                    {insights.horario_preferido && (
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">Horário</p>
                        <p className="text-xs font-medium capitalize">{insights.horario_preferido}</p>
                      </div>
                    )}
                    {insights.dia_preferido && (
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">Dia</p>
                        <p className="text-xs font-medium capitalize">{insights.dia_preferido}</p>
                      </div>
                    )}
                  </div>
                )}

                {insights.ultima_analise && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    Atualizado {formatDistanceToNow(new Date(insights.ultima_analise), { addSuffix: true, locale: ptBR })}
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab Perfil */}
          <TabsContent value="perfil" className="m-0 p-3 space-y-3">
            {/* Score e Métricas */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className={cn('text-lg font-bold', getScoreColor(contato.score_interesse || 0))}>
                  {contato.score_interesse || 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Score</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{('total_interacoes' in contato ? (contato as any).total_interacoes : 0) || 0}</p>
                <p className="text-[10px] text-muted-foreground">Interações</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{contato.conversas_analisadas || 0}</p>
                <p className="text-[10px] text-muted-foreground">Mensagens</p>
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-2">
              <a 
                href={`tel:${contato.telefone}`} 
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {contato.telefone}
              </a>
              {'email' in contato && (contato as any).email && (
                <a 
                  href={`mailto:${(contato as any).email}`}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors truncate"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {(contato as any).email}
                </a>
              )}
            </div>

            {/* Interesse Principal */}
            {contato.interesse_principal && (
              <div className="space-y-1.5">
                <h5 className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3 text-primary" />
                  Interesse Principal
                </h5>
                <Badge variant="outline" className="text-xs">
                  {interesseLabels[contato.interesse_principal] || contato.interesse_principal}
                </Badge>
              </div>
            )}

            {/* Dores Identificadas */}
            {contato.dores_identificadas && contato.dores_identificadas.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Dores Identificadas
                </h5>
                <div className="flex flex-wrap gap-1">
                  {contato.dores_identificadas.map((dor, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] h-5 bg-amber-500/5">
                      {doresLabels[String(dor)] || String(dor)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Gatilhos de Compra */}
            {contato.gatilhos && contato.gatilhos.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3 text-green-500" />
                  Gatilhos de Compra
                </h5>
                <div className="flex flex-wrap gap-1">
                  {contato.gatilhos.map((gatilho, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] h-5 bg-green-500/5">
                      {gatilho}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Objeções */}
            {contato.objecoes && contato.objecoes.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-red-500" />
                  Objeções
                </h5>
                <div className="flex flex-wrap gap-1">
                  {contato.objecoes.map((objecao, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] h-5 bg-red-500/5">
                      {String(objecao)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo IA */}
            {contato.resumo_ia && (
              <div className="space-y-1.5">
                <h5 className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Resumo da IA
                </h5>
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 leading-relaxed">
                  {contato.resumo_ia}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <Separator />
            <div className="space-y-1.5 text-[10px] text-muted-foreground">
              {contato.ultimo_contato && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Último contato: {formatDistanceToNow(new Date(contato.ultimo_contato), { addSuffix: true, locale: ptBR })}
                </div>
              )}
              {'classificado_em' in contato && contato.classificado_em && (
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3 w-3" />
                  Classificado: {format(new Date(contato.classificado_em), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Criado: {format(new Date(contato.created_at!), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
