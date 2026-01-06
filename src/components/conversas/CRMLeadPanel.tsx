import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User,
  Phone,
  Mail,
  Tag,
  DollarSign,
  Download,
  Save,
  X,
  Plus,
  Loader2,
  ChevronRight,
  ShoppingBag,
  History,
  RefreshCw,
  Sparkles,
  Brain,
  Target,
  Zap,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Minus,
  TrendingUp,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContatoComUltimaMensagem, useImportarHistorico } from '@/hooks/useConversasPage';
import { useAtualizarContato } from '@/hooks/useContatosInteligencia';
import { useInsightsContato, useAnalisarConversas } from '@/hooks/useConversasWhatsapp';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CRMLeadPanelProps {
  contato: ContatoComUltimaMensagem | null;
  onClose: () => void;
}

// Tags pré-definidas
const TAGS_PREDEFINIDAS = [
  { label: 'Aluno', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  { label: 'Venda', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  { label: 'Kite Novo', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30' },
  { label: 'Kite Usado', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  { label: 'Wing', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  { label: 'Foil', color: 'bg-pink-500/10 text-pink-600 border-pink-500/30' },
  { label: 'Aluguel', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  { label: 'VIP', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
];

const statusLabels: Record<string, string> = {
  nao_classificado: 'Não Classificado',
  lead: 'Lead',
  lead_quente: 'Lead Quente',
  cliente_ativo: 'Cliente Ativo',
  cliente_inativo: 'Cliente Inativo',
  invalido: 'Inválido',
};

const statusColors: Record<string, string> = {
  nao_classificado: 'bg-muted text-muted-foreground',
  lead: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  lead_quente: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
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

export function CRMLeadPanel({ contato, onClose }: CRMLeadPanelProps) {
  const [nome, setNome] = useState(contato?.nome || '');
  const [email, setEmail] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [novaTag, setNovaTag] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const importarHistorico = useImportarHistorico();
  const atualizarContato = useAtualizarContato();
  const { data: insights, isLoading: loadingInsights } = useInsightsContato(contato?.id || null);
  const analisarMutation = useAnalisarConversas();

  if (!contato) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-card border-l text-muted-foreground p-4">
        <User className="h-12 w-12 opacity-20 mb-3" />
        <p className="text-sm">Selecione um contato</p>
        <p className="text-xs text-muted-foreground/70">para ver os detalhes</p>
      </div>
    );
  }

  const displayName = contato.whatsapp_profile_name || contato.nome || contato.telefone;

  const handleAddTag = (tagLabel: string) => {
    if (!tags.includes(tagLabel)) {
      setTags([...tags, tagLabel]);
      setIsEditing(true);
    }
  };

  const handleRemoveTag = (tagLabel: string) => {
    setTags(tags.filter(t => t !== tagLabel));
    setIsEditing(true);
  };

  const handleAddCustomTag = () => {
    if (novaTag.trim() && !tags.includes(novaTag.trim())) {
      setTags([...tags, novaTag.trim()]);
      setNovaTag('');
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    try {
      await atualizarContato.mutateAsync({
        id: contato.id,
        updates: {
          nome,
          email: email || null,
        },
      });
      setIsEditing(false);
      toast.success('Dados salvos com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar dados');
    }
  };

  const handleImportarHistorico = () => {
    importarHistorico.mutate({ contatoId: contato.id });
  };

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
      {/* Header */}
      <div className="p-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            CRM Lead
          </h3>
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
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src={contato.whatsapp_profile_picture || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <div className="flex items-center gap-1.5 mt-1">
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

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Botões de Ação Rápida */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={handleImportarHistorico}
              disabled={importarHistorico.isPending}
            >
              {importarHistorico.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              Importar Msgs
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={handleAnalisar}
              disabled={analisarMutation.isPending}
            >
              {analisarMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Brain className="h-3.5 w-3.5 mr-1.5" />
              )}
              Analisar IA
            </Button>
          </div>

          {/* Insights IA - Card compacto */}
          {insights && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-2 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Insights IA
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {insights.proxima_acao_sugerida && (
                  <div className="bg-background/50 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Próxima Ação</p>
                    <p className="text-xs leading-relaxed">
                      {insights.proxima_acao_sugerida}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background/50 rounded-lg p-2 text-center">
                    <p className={cn('text-lg font-bold', getScoreColor(insights.score_engajamento || 0))}>
                      {insights.score_engajamento || 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Engajamento</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2 text-center">
                    <p className={cn('text-lg font-bold', getScoreColor(insights.probabilidade_conversao || 0))}>
                      {Math.round(insights.probabilidade_conversao || 0)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Conversão</p>
                  </div>
                </div>

                {insights.sentimento_geral && (
                  <div className="flex items-center gap-2 bg-background/50 rounded-lg p-2">
                    {getSentimentIcon(insights.sentimento_geral)}
                    <span className="text-xs capitalize">{insights.sentimento_geral}</span>
                  </div>
                )}

                {insights.gatilhos_compra && insights.gatilhos_compra.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3 text-green-500" />
                      Gatilhos
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {insights.gatilhos_compra.slice(0, 3).map((g, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] h-5 bg-green-500/5">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {insights.objecoes_identificadas && insights.objecoes_identificadas.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3 text-red-500" />
                      Objeções
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {insights.objecoes_identificadas.slice(0, 3).map((o, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] h-5 bg-red-500/5">
                          {o}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {insights.ultima_analise && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    {formatDistanceToNow(new Date(insights.ultima_analise), { addSuffix: true, locale: ptBR })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {!insights && !loadingInsights && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <Brain className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Clique em "Analisar IA" para gerar insights</p>
              </CardContent>
            </Card>
          )}

          {loadingInsights && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Etiquetas/Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                Etiquetas
              </Label>
            </div>

            {/* Tags selecionadas */}
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const predefined = TAGS_PREDEFINIDAS.find(t => t.label === tag);
                return (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={cn(
                      'text-xs h-6 pr-1.5 gap-1 cursor-pointer hover:opacity-80',
                      predefined?.color || 'bg-muted'
                    )}
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                );
              })}
            </div>

            {/* Tags pré-definidas para adicionar */}
            <div className="flex flex-wrap gap-1">
              {TAGS_PREDEFINIDAS.filter(t => !tags.includes(t.label)).map((tag) => (
                <Badge
                  key={tag.label}
                  variant="outline"
                  className={cn(
                    'text-[10px] h-5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity',
                    tag.color
                  )}
                  onClick={() => handleAddTag(tag.label)}
                >
                  <Plus className="h-2.5 w-2.5 mr-0.5" />
                  {tag.label}
                </Badge>
              ))}
            </div>

            {/* Adicionar tag personalizada */}
            <div className="flex gap-1.5">
              <Input
                placeholder="Nova etiqueta..."
                value={novaTag}
                onChange={(e) => setNovaTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2"
                onClick={handleAddCustomTag}
                disabled={!novaTag.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Dados Cadastrais */}
          <div className="space-y-3">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Dados Cadastrais
            </Label>

            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Nome</Label>
                <Input
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    setIsEditing(true);
                  }}
                  placeholder="Nome do contato"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsEditing(true);
                  }}
                  placeholder="email@exemplo.com"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Telefone</Label>
                <div className="flex items-center gap-2 px-2 h-8 bg-muted/50 rounded-md">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">{contato.telefone}</span>
                </div>
              </div>
            </div>

            {isEditing && (
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={handleSave}
                disabled={atualizarContato.isPending}
              >
                {atualizarContato.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                Salvar Alterações
              </Button>
            )}
          </div>

          <Separator />

          {/* Histórico de Compras (Placeholder) */}
          <Card className="bg-muted/30">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-xs font-medium flex items-center gap-2">
                <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                Histórico de Compras
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex items-center justify-between py-3 border border-dashed rounded-lg border-muted-foreground/30 px-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Gasto</p>
                  <p className="text-lg font-bold text-muted-foreground/50">R$ 0,00</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Compras</p>
                  <p className="text-lg font-bold text-muted-foreground/50">0</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Em breve: integração com financeiro
              </p>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <div className="space-y-1.5 pt-2">
            {contato.created_at && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Criado {formatDistanceToNow(new Date(contato.created_at), { addSuffix: true, locale: ptBR })}
              </div>
            )}
            {contato.ultimo_contato && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <History className="h-3 w-3" />
                Último contato {formatDistanceToNow(new Date(contato.ultimo_contato), { addSuffix: true, locale: ptBR })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
