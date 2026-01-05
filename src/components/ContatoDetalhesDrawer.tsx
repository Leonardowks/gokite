import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  MessageSquare,
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Clock,
  Calendar,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Zap,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContatoInteligencia } from '@/hooks/useContatosInteligencia';
import { ContatoComUltimaMensagem } from '@/hooks/useConversasPage';
import { useConversasContato, useInsightsContato, useAnalisarConversas } from '@/hooks/useConversasWhatsapp';
import { cn } from '@/lib/utils';

interface ContatoDetalhesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contato: ContatoInteligencia | ContatoComUltimaMensagem | null;
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

export function ContatoDetalhesDrawer({ open, onOpenChange, contato }: ContatoDetalhesDrawerProps) {
  const [activeTab, setActiveTab] = useState('perfil');
  
  const { data: conversas = [], isLoading: loadingConversas } = useConversasContato(contato?.id || null);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header com info do contato */}
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
              <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {contato.nome?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{contato.nome || 'Sem nome'}</SheetTitle>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={cn('text-xs', statusColors[contato.status || 'nao_classificado'])}>
                  {statusLabels[contato.status || 'nao_classificado']}
                </Badge>
                {contato.prioridade && contato.prioridade !== 'baixa' && (
                  <Badge className={cn('text-xs', prioridadeLabels[contato.prioridade]?.color)}>
                    {prioridadeLabels[contato.prioridade]?.label}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <a 
                  href={`tel:${contato.telefone}`} 
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {contato.telefone}
                </a>
                {'email' in contato && contato.email && (
                  <a 
                    href={`mailto:${contato.email}`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors truncate"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {contato.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
            <TabsTrigger 
              value="perfil" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              <User className="h-4 w-4 mr-2" />
              Perfil
            </TabsTrigger>
            <TabsTrigger 
              value="conversas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Conversas
              {conversas.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {conversas.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="insights"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              <Brain className="h-4 w-4 mr-2" />
              Insights IA
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Tab Perfil */}
            <TabsContent value="perfil" className="m-0 p-4 space-y-4">
              {/* Score e Métricas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className={cn('text-2xl font-bold', getScoreColor(contato.score_interesse || 0))}>
                    {contato.score_interesse || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{'total_interacoes' in contato ? contato.total_interacoes || 0 : 0}</p>
                  <p className="text-xs text-muted-foreground">Interações</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{contato.conversas_analisadas || 0}</p>
                  <p className="text-xs text-muted-foreground">Mensagens</p>
                </div>
              </div>

              {/* Interesse Principal */}
              {contato.interesse_principal && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Interesse Principal
                  </h4>
                  <Badge variant="outline" className="text-sm">
                    {interesseLabels[contato.interesse_principal] || contato.interesse_principal}
                  </Badge>
                </div>
              )}

              {/* Dores Identificadas */}
              {contato.dores_identificadas && contato.dores_identificadas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Dores Identificadas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {contato.dores_identificadas.map((dor) => (
                      <Badge key={dor} variant="outline" className="text-xs bg-amber-500/5">
                        {doresLabels[dor] || dor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Gatilhos de Compra */}
              {contato.gatilhos && contato.gatilhos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    Gatilhos de Compra
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {contato.gatilhos.map((gatilho, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-green-500/5">
                        {gatilho}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Objeções */}
              {contato.objecoes && contato.objecoes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    Objeções
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {contato.objecoes.map((objecao, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-red-500/5">
                        {objecao}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo IA */}
              {contato.resumo_ia && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Resumo da IA
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {contato.resumo_ia}
                  </p>
                </div>
              )}

              {/* Campanha Sugerida */}
              {'campanha_sugerida' in contato && contato.campanha_sugerida && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Campanha Sugerida
                  </h4>
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                    {contato.campanha_sugerida}
                  </Badge>
                </div>
              )}

              {/* Timestamps */}
              <Separator />
              <div className="space-y-2 text-xs text-muted-foreground">
                {contato.ultimo_contato && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Último contato: {formatDistanceToNow(new Date(contato.ultimo_contato), { addSuffix: true, locale: ptBR })}
                  </div>
                )}
                {'classificado_em' in contato && contato.classificado_em && (
                  <div className="flex items-center gap-2">
                    <Brain className="h-3 w-3" />
                    Classificado: {format(new Date(contato.classificado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Criado: {format(new Date(contato.created_at!), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>
            </TabsContent>

            {/* Tab Conversas */}
            <TabsContent value="conversas" className="m-0 p-4">
              {loadingConversas ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversas.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Importe conversas do WhatsApp ou conecte a Evolution API
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversas.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.remetente === 'empresa' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm',
                          msg.remetente === 'empresa'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.conteudo}
                        </p>
                        <div className={cn(
                          'flex items-center gap-2 mt-1 text-[10px]',
                          msg.remetente === 'empresa' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          <span>
                            {format(new Date(msg.data_mensagem), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                          {msg.tipo_midia !== 'texto' && (
                            <Badge variant="outline" className="h-4 text-[9px] px-1">
                              {msg.tipo_midia}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab Insights */}
            <TabsContent value="insights" className="m-0 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Análise de Conversas</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAnalisar}
                  disabled={analisarMutation.isPending || conversas.length === 0}
                >
                  {analisarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Analisar
                </Button>
              </div>

              {loadingInsights ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !insights ? (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Insights não disponíveis</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em "Analisar" para gerar insights das conversas
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Métricas de Engajamento */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Score Engajamento</p>
                      <div className="flex items-center gap-2">
                        <p className={cn('text-2xl font-bold', getScoreColor(insights.score_engajamento || 0))}>
                          {insights.score_engajamento || 0}
                        </p>
                        <Progress 
                          value={insights.score_engajamento || 0} 
                          className="h-2 flex-1"
                        />
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Prob. Conversão</p>
                      <div className="flex items-center gap-2">
                        <p className={cn('text-2xl font-bold', getScoreColor(insights.probabilidade_conversao || 0))}>
                          {Math.round(insights.probabilidade_conversao || 0)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Estatísticas de Mensagens */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold">{insights.total_mensagens || 0}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-blue-500">{insights.mensagens_enviadas || 0}</p>
                      <p className="text-xs text-muted-foreground">Enviadas</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-green-500">{insights.mensagens_recebidas || 0}</p>
                      <p className="text-xs text-muted-foreground">Recebidas</p>
                    </div>
                  </div>

                  {/* Sentimento */}
                  {insights.sentimento_geral && (
                    <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                      {getSentimentIcon(insights.sentimento_geral)}
                      <div>
                        <p className="text-sm font-medium capitalize">{insights.sentimento_geral}</p>
                        <p className="text-xs text-muted-foreground">Sentimento predominante</p>
                      </div>
                    </div>
                  )}

                  {/* Padrões de Comportamento */}
                  {(insights.horario_preferido || insights.dia_preferido) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Padrões de Comportamento</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {insights.horario_preferido && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Horário Preferido</p>
                            <p className="font-medium capitalize">{insights.horario_preferido}</p>
                          </div>
                        )}
                        {insights.dia_preferido && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Dia Preferido</p>
                            <p className="font-medium capitalize">{insights.dia_preferido}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interesses */}
                  {insights.principais_interesses && insights.principais_interesses.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Principais Interesses
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.principais_interesses.map((interesse, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {interesse}
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
                          <Badge key={i} variant="outline" className="text-xs bg-green-500/5">
                            {gatilho}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Objeções */}
                  {insights.objecoes_identificadas && insights.objecoes_identificadas.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                        Objeções Identificadas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.objecoes_identificadas.map((objecao, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-red-500/5">
                            {objecao}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Próxima Ação Sugerida */}
                  {insights.proxima_acao_sugerida && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        Próxima Ação Sugerida
                      </h4>
                      <p className="text-sm bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                        {insights.proxima_acao_sugerida}
                      </p>
                    </div>
                  )}

                  {/* Resumo IA */}
                  {insights.resumo_ia && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Resumo da Análise
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                        {insights.resumo_ia}
                      </p>
                    </div>
                  )}

                  {/* Última Análise */}
                  {insights.ultima_analise && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Última análise: {format(new Date(insights.ultima_analise), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer com ações */}
        <div className="p-4 border-t bg-muted/30 flex gap-2">
          <Button 
            className="flex-1" 
            onClick={() => window.open(`https://wa.me/${contato.telefone}`, '_blank')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Abrir WhatsApp
          </Button>
          <Button variant="outline" size="icon">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
