import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PremiumCard } from '@/components/ui/premium-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Brain,
  Upload,
  Sparkles,
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  Search,
  Rocket,
  Phone,
  Mail,
  RefreshCw,
  MessageSquare,
  BarChart3,
  Wifi,
  WifiOff,
  Settings,
  UserCheck,
} from 'lucide-react';
import {
  useContatosInteligencia,
  useEstatisticasContatos,
  useClassificarContatos,
  useEnriquecerContatos,
  ContatoFiltros,
} from '@/hooks/useContatosInteligencia';
import { ImportarContatosDialog } from '@/components/ImportarContatosDialog';
import { ImportarConversasDialog } from '@/components/ImportarConversasDialog';
import { CampanhaDialog } from '@/components/CampanhaDialog';
import { EvolutionConfigDialog } from '@/components/EvolutionConfigDialog';
import { ContatoDetalhesDrawer } from '@/components/ContatoDetalhesDrawer';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useEstatisticasConversas, useAnalisarConversas } from '@/hooks/useConversasWhatsapp';
import { useEvolutionStatus, useConversasRealtime } from '@/hooks/useEvolutionConfig';
import { ContatoInteligencia } from '@/hooks/useContatosInteligencia';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  nao_classificado: 'Não Classificado',
  lead: 'Lead',
  cliente_ativo: 'Cliente Ativo',
  cliente_inativo: 'Cliente Inativo',
  invalido: 'Inválido',
};

const statusColors: Record<string, string> = {
  nao_classificado: 'bg-muted text-muted-foreground',
  lead: 'bg-blue-500/10 text-blue-600',
  cliente_ativo: 'bg-green-500/10 text-green-600',
  cliente_inativo: 'bg-amber-500/10 text-amber-600',
  invalido: 'bg-red-500/10 text-red-600',
};

const prioridadeColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-blue-500/10 text-blue-600',
  alta: 'bg-amber-500/10 text-amber-600',
  urgente: 'bg-red-500/10 text-red-600',
};

const doresLabels: Record<string, string> = {
  preco: '💰 Preço',
  distancia: '📍 Distância',
  horario: '🕐 Horário',
  equipamento: '🎿 Equipamento',
  medo: '😰 Medo',
  clima: '🌦️ Clima',
};

const interesseLabels: Record<string, string> = {
  kite: '🪁 Kitesurf',
  wing: '🦅 Wing Foil',
  foil: '🏄 Foil',
  aluguel: '🏠 Aluguel',
  equipamento_usado: '🔄 Equipamento Usado',
};

const campanhaLabels: Record<string, string> = {
  reativacao: '🔄 Reativação',
  upsell: '📈 Upsell',
  trade_in: '🔄 Trade-in',
  indicacao: '👥 Indicação',
  boas_vindas: '👋 Boas Vindas',
};

export default function Inteligencia() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importConversasOpen, setImportConversasOpen] = useState(false);
  const [campanhaDialogOpen, setCampanhaDialogOpen] = useState(false);
  const [evolutionConfigOpen, setEvolutionConfigOpen] = useState(false);
  const [contatoDetalhesOpen, setContatoDetalhesOpen] = useState(false);
  const [contatoSelecionado, setContatoSelecionado] = useState<ContatoInteligencia | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filtros, setFiltros] = useState<ContatoFiltros>({});
  
  // Estado para classificação em massa automática
  const [isClassificandoTodos, setIsClassificandoTodos] = useState(false);
  const [progressoClassificacao, setProgressoClassificacao] = useState({ processed: 0, total: 0, remaining: 0 });
  const abortRef = useRef(false);

  const { data: contatos = [], isLoading, refetch } = useContatosInteligencia(filtros);
  const { data: stats, refetch: refetchStats } = useEstatisticasContatos();
  const { data: statsConversas } = useEstatisticasConversas();
  const { data: evolutionStatus } = useEvolutionStatus();
  const classificarMutation = useClassificarContatos();
  const enriquecerMutation = useEnriquecerContatos();
  const analisarMutation = useAnalisarConversas();
  
  // Estado para enriquecimento em massa
  const [isEnriquecendo, setIsEnriquecendo] = useState(false);
  const [progressoEnriquecimento, setProgressoEnriquecimento] = useState({ enriched: 0, total: 0, remaining: 0 });
  
  // Realtime listener para novas mensagens
  useConversasRealtime((payload) => {
    toast.info('Nova mensagem recebida via WhatsApp');
  });

  const contatosSelecionados = useMemo(() => {
    if (selectedIds.length === 0) return contatos;
    return contatos.filter(c => selectedIds.includes(c.id));
  }, [contatos, selectedIds]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(contatos.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  const handleClassificar = () => {
    if (selectedIds.length > 0) {
      classificarMutation.mutate({ contatoIds: selectedIds });
    } else {
      classificarMutation.mutate({ batchSize: 500 });
    }
    setSelectedIds([]);
  };

  // Função para classificar todos os contatos automaticamente
  const handleClassificarTodos = useCallback(async () => {
    const naoClassificados = stats?.nao_classificados || 0;
    if (naoClassificados === 0) return;

    setIsClassificandoTodos(true);
    setProgressoClassificacao({ processed: 0, total: naoClassificados, remaining: naoClassificados });
    abortRef.current = false;

    let totalProcessed = 0;
    let remaining = naoClassificados;

    while (remaining > 0 && !abortRef.current) {
      try {
        const result = await classificarMutation.mutateAsync({ batchSize: 500 });
        
        totalProcessed += result.processed;
        remaining = result.remaining;
        
        setProgressoClassificacao({
          processed: totalProcessed,
          total: naoClassificados,
          remaining: remaining,
        });

        // Atualizar dados
        await refetch();
        await refetchStats();

        // Pequena pausa entre batches para não sobrecarregar
        if (remaining > 0 && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Erro na classificação em lote:', error);
        break;
      }
    }

    setIsClassificandoTodos(false);
  }, [stats?.nao_classificados, classificarMutation, refetch, refetchStats]);

  const handleCancelarClassificacao = () => {
    abortRef.current = true;
  };

  // Função para enriquecer contatos com dados do WhatsApp
  const handleEnriquecerContatos = useCallback(async () => {
    if (evolutionStatus?.status !== 'conectado') {
      toast.error('Conecte o WhatsApp primeiro');
      setEvolutionConfigOpen(true);
      return;
    }

    setIsEnriquecendo(true);
    setProgressoEnriquecimento({ enriched: 0, total: 0, remaining: 0 });

    let totalEnriched = 0;
    let remaining = 1; // Iniciar com valor > 0

    while (remaining > 0) {
      try {
        const result = await enriquecerMutation.mutateAsync({ batchSize: 50 });
        
        totalEnriched += result.enriched;
        remaining = result.remaining;
        
        setProgressoEnriquecimento({
          enriched: totalEnriched,
          total: totalEnriched + remaining,
          remaining: remaining,
        });

        // Atualizar dados
        await refetch();

        // Pequena pausa entre batches
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Erro no enriquecimento:', error);
        toast.error('Erro ao enriquecer contatos');
        break;
      }
    }

    if (totalEnriched > 0) {
      toast.success(`${totalEnriched} contatos enriquecidos com dados do WhatsApp`);
    }
    setIsEnriquecendo(false);
  }, [evolutionStatus?.status, enriquecerMutation, refetch]);

  // Limpar estado ao desmontar
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Central de Inteligência"
          description="Analise, classifique e segmente sua base de contatos com IA"
          icon={Brain}
        />
        
        {/* Status Evolution API */}
        <Button
          variant={evolutionStatus?.status === 'conectado' ? 'outline' : 'default'}
          onClick={() => setEvolutionConfigOpen(true)}
          className="gap-2"
        >
          {evolutionStatus?.status === 'conectado' ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="hidden sm:inline">WhatsApp Conectado</span>
            </>
          ) : evolutionStatus?.configured ? (
            <>
              <WifiOff className="h-4 w-4 text-yellow-500" />
              <span className="hidden sm:inline">Reconectar WhatsApp</span>
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Conectar WhatsApp</span>
            </>
          )}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-6">
        <PremiumCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">
                <AnimatedNumber value={stats?.total || 0} />
              </p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clientes Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                <AnimatedNumber value={stats?.por_status?.cliente_ativo || 0} />
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600/50" />
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clientes Inativos</p>
              <p className="text-2xl font-bold text-amber-600">
                <AnimatedNumber value={stats?.por_status?.cliente_inativo || 0} />
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-600/50" />
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Leads Quentes</p>
              <p className="text-2xl font-bold text-blue-600">
                <AnimatedNumber value={stats?.por_status?.lead || 0} />
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-600/50" />
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Não Classificados</p>
              <p className="text-2xl font-bold text-muted-foreground">
                <AnimatedNumber value={stats?.nao_classificados || 0} />
              </p>
            </div>
            <Sparkles className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </PremiumCard>

        <PremiumCard className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversas</p>
              <p className="text-2xl font-bold text-primary">
                <AnimatedNumber value={statsConversas?.totalConversas || 0} />
              </p>
              <p className="text-xs text-muted-foreground">
                {statsConversas?.contatosComConversas || 0} contatos
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-primary/50" />
          </div>
        </PremiumCard>
      </div>

      {/* Distribuição por Interesse e Dores */}
      {stats && (Object.keys(stats.por_interesse).length > 0 || Object.keys(stats.por_dor).length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.keys(stats.por_interesse).length > 0 && (
            <PremiumCard className="p-4">
              <h3 className="font-semibold mb-3">Distribuição por Interesse</h3>
              <div className="space-y-2">
                {Object.entries(stats.por_interesse)
                  .sort(([, a], [, b]) => b - a)
                  .map(([interesse, count]) => (
                    <div key={interesse} className="flex items-center gap-2">
                      <span className="text-sm w-32">{interesseLabels[interesse] || interesse}</span>
                      <Progress value={(count / stats.total) * 100} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {Math.round((count / stats.total) * 100)}%
                      </span>
                    </div>
                  ))}
              </div>
            </PremiumCard>
          )}

          {Object.keys(stats.por_dor).length > 0 && (
            <PremiumCard className="p-4">
              <h3 className="font-semibold mb-3">Dores Identificadas</h3>
              <div className="space-y-2">
                {Object.entries(stats.por_dor)
                  .sort(([, a], [, b]) => b - a)
                  .map(([dor, count]) => (
                    <div key={dor} className="flex items-center gap-2">
                      <span className="text-sm w-32">{doresLabels[dor] || dor}</span>
                      <Progress value={(count / stats.total) * 100} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </PremiumCard>
          )}
        </div>
      )}

      {/* Barra de progresso da classificação em massa */}
      {isClassificandoTodos && (
        <PremiumCard className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">Classificando todos os contatos...</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleCancelarClassificacao}>
              Cancelar
            </Button>
          </div>
          <Progress 
            value={progressoClassificacao.total > 0 
              ? (progressoClassificacao.processed / progressoClassificacao.total) * 100 
              : 0
            } 
            className="h-3 mb-2" 
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{progressoClassificacao.processed} processados</span>
            <span>{progressoClassificacao.remaining} restantes</span>
          </div>
        </PremiumCard>
      )}

      {/* Barra de progresso do enriquecimento */}
      {isEnriquecendo && (
        <PremiumCard className="p-4 border-green-500/20 bg-green-500/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 animate-pulse text-green-600" />
              <span className="font-medium">Enriquecendo contatos com dados do WhatsApp...</span>
            </div>
          </div>
          <Progress 
            value={progressoEnriquecimento.total > 0 
              ? (progressoEnriquecimento.enriched / progressoEnriquecimento.total) * 100 
              : 0
            } 
            className="h-3 mb-2" 
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{progressoEnriquecimento.enriched} enriquecidos</span>
            <span>{progressoEnriquecimento.remaining} restantes</span>
          </div>
        </PremiumCard>
      )}

      {/* Ações e Filtros */}
      <PremiumCard className="p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setImportDialogOpen(true)} disabled={isClassificandoTodos}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Contatos
            </Button>
            <Button 
              variant="outline"
              onClick={() => setImportConversasOpen(true)} 
              disabled={isClassificandoTodos}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Importar Conversas
            </Button>
            <Button
              variant="outline"
              onClick={handleClassificar}
              disabled={classificarMutation.isPending || isClassificandoTodos}
            >
              {classificarMutation.isPending && !isClassificandoTodos ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {selectedIds.length > 0
                ? `Classificar ${selectedIds.length} selecionados`
                : 'Classificar Lote'}
            </Button>
            {(stats?.nao_classificados || 0) > 0 && !isClassificandoTodos && (
              <Button
                variant="default"
                onClick={handleClassificarTodos}
                disabled={classificarMutation.isPending}
                className="bg-gradient-to-r from-primary to-primary/80"
              >
                <Brain className="h-4 w-4 mr-2" />
                Classificar Todos ({stats?.nao_classificados})
              </Button>
            )}
            {/* Botão para enriquecer contatos com dados do WhatsApp */}
            {evolutionStatus?.status === 'conectado' && !isEnriquecendo && (
              <Button
                variant="outline"
                onClick={handleEnriquecerContatos}
                disabled={isClassificandoTodos || enriquecerMutation.isPending}
                className="gap-2"
              >
                {enriquecerMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Enriquecer Contatos
              </Button>
            )}
            {contatosSelecionados.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setCampanhaDialogOpen(true)}
                disabled={isClassificandoTodos}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Criar Campanha ({contatosSelecionados.length})
              </Button>
            )}
            {/* Botão rápido para campanha com leads */}
            {(stats?.por_status?.lead || 0) > 0 && selectedIds.length === 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setFiltros({ ...filtros, status: 'lead' });
                  setTimeout(() => {
                    setSelectedIds(contatos.filter(c => c.status === 'lead').map(c => c.id));
                  }, 100);
                }}
                disabled={isClassificandoTodos}
              >
                <Target className="h-4 w-4 mr-2" />
                Campanha Leads ({stats?.por_status?.lead})
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-9 w-48"
                value={filtros.search || ''}
                onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
              />
            </div>

            <Select
              value={filtros.status || 'todos'}
              onValueChange={(v) => setFiltros({ ...filtros, status: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="nao_classificado">Não Classificado</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="cliente_ativo">Cliente Ativo</SelectItem>
                <SelectItem value="cliente_inativo">Cliente Inativo</SelectItem>
                <SelectItem value="invalido">Inválido</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filtros.campanha || 'todas'}
              onValueChange={(v) => setFiltros({ ...filtros, campanha: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Campanha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas Campanhas</SelectItem>
                <SelectItem value="reativacao">Reativação</SelectItem>
                <SelectItem value="upsell">Upsell</SelectItem>
                <SelectItem value="trade_in">Trade-in</SelectItem>
                <SelectItem value="indicacao">Indicação</SelectItem>
                <SelectItem value="boas_vindas">Boas Vindas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PremiumCard>

      {/* Tabela de Contatos */}
      <PremiumCard className="p-0 overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length === contatos.length && contatos.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Interesse</TableHead>
                <TableHead>Campanha Sugerida</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Resumo IA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : contatos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {Object.keys(filtros).length > 0
                      ? 'Nenhum contato encontrado com esses filtros'
                      : 'Nenhum contato importado ainda. Clique em "Importar Contatos" para começar.'}
                  </TableCell>
                </TableRow>
              ) : (
                contatos.map((contato) => (
                  <TableRow 
                    key={contato.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setContatoSelecionado(contato);
                      setContatoDetalhesOpen(true);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(contato.id)}
                        onCheckedChange={(c) => handleSelectOne(contato.id, !!c)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contato.nome || 'Sem nome'}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contato.telefone}
                          </span>
                          {contato.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contato.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[contato.status] || ''}>
                        {statusLabels[contato.status] || contato.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={contato.score_interesse} className="w-16 h-2" />
                        <span className="text-sm">{contato.score_interesse}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contato.interesse_principal && (
                        <span className="text-sm">
                          {interesseLabels[contato.interesse_principal] || contato.interesse_principal}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contato.campanha_sugerida && (
                        <Badge variant="outline">
                          {campanhaLabels[contato.campanha_sugerida] || contato.campanha_sugerida}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={prioridadeColors[contato.prioridade] || ''}>
                        {contato.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate" title={contato.resumo_ia || ''}>
                        {contato.resumo_ia || '-'}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PremiumCard>

      {/* Dialogs */}
      <ImportarContatosDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      <ImportarConversasDialog
        open={importConversasOpen}
        onOpenChange={setImportConversasOpen}
      />

      <CampanhaDialog
        open={campanhaDialogOpen}
        onOpenChange={setCampanhaDialogOpen}
        filtros={filtros}
        contatos={contatosSelecionados}
      />

      <EvolutionConfigDialog
        open={evolutionConfigOpen}
        onOpenChange={setEvolutionConfigOpen}
      />

      <ContatoDetalhesDrawer
        open={contatoDetalhesOpen}
        onOpenChange={setContatoDetalhesOpen}
        contato={contatoSelecionado}
      />
    </div>
  );
}
