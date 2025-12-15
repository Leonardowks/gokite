import { useState, useEffect } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, MapPin, DollarSign, Calendar, AlertTriangle, Plus, Wrench, CheckCircle } from "lucide-react";
import { localStorageService, type Equipamento, type Aluguel } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";

export default function Estoque() {
  const { toast } = useToast();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [alugueis, setAlugueis] = useState<Aluguel[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | Equipamento['status']>('todos');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    setEquipamentos(localStorageService.listarEquipamentos());
    setAlugueis(localStorageService.listarAlugueis());
  };

  const equipamentosFiltrados = equipamentos.filter(eq => 
    filtroStatus === 'todos' || eq.status === filtroStatus
  );

  const alugueisAtivos = alugueis.filter(a => a.status === 'ativo');

  const getStatusBadge = (status: Equipamento['status']) => {
    const configs = {
      disponivel: { variant: 'success' as const, label: 'Disponível' },
      alugado: { variant: 'warning' as const, label: 'Alugado' },
      manutencao: { variant: 'urgent' as const, label: 'Manutenção' },
    };
    return configs[status];
  };

  const getTipoLabel = (tipo: Equipamento['tipo']) => {
    const labels = {
      prancha: '🏄 Prancha',
      asa: '🪁 Asa',
      trapezio: '⚓ Trapézio',
      colete: '🦺 Colete',
      wetsuit: '🤿 Wetsuit',
    };
    return labels[tipo];
  };

  const getLocalizacaoLabel = (loc: string) => {
    return loc === 'florianopolis' ? 'Florianópolis' : 'Taíba';
  };

  const diasParaVencer = (dataFim: string) => {
    const dias = Math.ceil((new Date(dataFim).getTime() - Date.now()) / 86400000);
    return dias;
  };

  const finalizarAluguel = (aluguel: Aluguel) => {
    localStorageService.finalizarAluguel(aluguel.id);
    carregarDados();
    
    toast({
      title: "Aluguel finalizado!",
      description: `Equipamento ${aluguel.equipamento_id} liberado`,
    });
  };

  const cobrarAtrasado = (aluguel: Aluguel) => {
    const mensagem = `Olá ${aluguel.cliente_nome}! O aluguel do equipamento venceu. Por favor, retorne o equipamento.`;
    window.open(`https://wa.me/${aluguel.cliente_whatsapp}?text=${encodeURIComponent(mensagem)}`, '_blank');
    
    toast({
      title: "WhatsApp enviado!",
      description: `Cobrança enviada para ${aluguel.cliente_nome}`,
    });
  };

  // Estatísticas
  const totalEquipamentos = equipamentos.length;
  const disponiveis = equipamentos.filter(e => e.status === 'disponivel').length;
  const alugados = equipamentos.filter(e => e.status === 'alugado').length;
  const manutencao = equipamentos.filter(e => e.status === 'manutencao').length;
  const ocupacaoFloripa = Math.round((equipamentos.filter(e => e.localizacao === 'florianopolis' && e.status === 'alugado').length / equipamentos.filter(e => e.localizacao === 'florianopolis').length) * 100) || 0;
  const ocupacaoTaiba = Math.round((equipamentos.filter(e => e.localizacao === 'taiba' && e.status === 'alugado').length / equipamentos.filter(e => e.localizacao === 'taiba').length) * 100) || 0;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PremiumBadge variant="default" size="sm" icon={Package}>
              {totalEquipamentos} equipamentos
            </PremiumBadge>
            {alugueisAtivos.length > 0 && (
              <PremiumBadge variant="warning" size="sm">
                {alugueisAtivos.length} ativos
              </PremiumBadge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Gestão de Estoque
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Controle de equipamentos e aluguéis em tempo real
          </p>
        </div>
        
        <Button className="gap-2 min-h-[44px] w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo Equipamento
        </Button>
      </div>

      {/* KPIs Premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Total
                </p>
                <AnimatedNumber 
                  value={totalEquipamentos} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">{disponiveis} disponíveis</p>
              </div>
              <div className="icon-container shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Disponíveis
                </p>
                <AnimatedNumber 
                  value={disponiveis} 
                  className="text-2xl sm:text-3xl font-bold text-success"
                />
                <p className="text-xs text-muted-foreground mt-1">Prontos para alugar</p>
              </div>
              <div className="icon-container bg-success/10 shrink-0">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Alugados
                </p>
                <AnimatedNumber 
                  value={alugados} 
                  className="text-2xl sm:text-3xl font-bold text-warning"
                />
                <p className="text-xs text-muted-foreground mt-1">{alugueisAtivos.length} aluguéis ativos</p>
              </div>
              <div className="icon-container bg-warning/10 shrink-0">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Manutenção
                </p>
                <AnimatedNumber 
                  value={manutencao} 
                  className="text-2xl sm:text-3xl font-bold text-destructive"
                />
                <p className="text-xs text-muted-foreground mt-1">Precisam reparo</p>
              </div>
              <div className="icon-container bg-destructive/10 shrink-0">
                <Wrench className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Ocupação por Localização Premium */}
      <div className="grid gap-4 md:grid-cols-2">
        <PremiumCard>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              Florianópolis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="flex items-center gap-4">
              <AnimatedNumber 
                value={ocupacaoFloripa} 
                suffix="%"
                className="text-3xl sm:text-4xl font-bold text-primary"
              />
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 rounded-full" 
                  style={{ width: `${ocupacaoFloripa}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Taxa de ocupação</p>
          </CardContent>
        </PremiumCard>

        <PremiumCard>
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-accent" />
              </div>
              Taíba
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="flex items-center gap-4">
              <AnimatedNumber 
                value={ocupacaoTaiba} 
                suffix="%"
                className="text-3xl sm:text-4xl font-bold text-accent"
              />
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-500 rounded-full" 
                  style={{ width: `${ocupacaoTaiba}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Taxa de ocupação</p>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Filtros Premium */}
      <PremiumCard>
        <CardHeader className="p-4 sm:p-5">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filtroStatus === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('todos')}
              className="min-h-[40px]"
            >
              Todos ({totalEquipamentos})
            </Button>
            <Button
              variant={filtroStatus === 'disponivel' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('disponivel')}
              className="min-h-[40px]"
            >
              Disponíveis ({disponiveis})
            </Button>
            <Button
              variant={filtroStatus === 'alugado' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('alugado')}
              className="min-h-[40px]"
            >
              Alugados ({alugados})
            </Button>
            <Button
              variant={filtroStatus === 'manutencao' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('manutencao')}
              className="min-h-[40px]"
            >
              Manutenção ({manutencao})
            </Button>
          </div>
        </CardHeader>
      </PremiumCard>

      {/* Grid de Equipamentos Premium */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {equipamentosFiltrados.map((eq) => {
          const statusBadge = getStatusBadge(eq.status);
          return (
            <PremiumCard key={eq.id} hover>
              <CardHeader className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg font-display">{eq.nome}</CardTitle>
                    <p className="text-sm text-muted-foreground">{getTipoLabel(eq.tipo)} • {eq.tamanho}</p>
                  </div>
                  <PremiumBadge variant={statusBadge.variant} size="sm">
                    {statusBadge.label}
                  </PremiumBadge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {getLocalizacaoLabel(eq.localizacao)}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-primary">
                    <DollarSign className="h-4 w-4" />
                    R$ {eq.preco_dia}/dia
                  </span>
                </div>
                
                {eq.ultimo_aluguel && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Último aluguel: {new Date(eq.ultimo_aluguel).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </CardContent>
            </PremiumCard>
          );
        })}
      </div>

      {/* Aluguéis Ativos Premium */}
      {alugueisAtivos.length > 0 && (
        <PremiumCard>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-warning" />
              </div>
              Aluguéis Ativos
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Equipamentos atualmente alugados - acompanhe devoluções</p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {/* Cards Mobile */}
            <div className="md:hidden space-y-3">
              {alugueisAtivos.map((aluguel) => {
                const equipamento = equipamentos.find(e => e.id === aluguel.equipamento_id);
                const dias = diasParaVencer(aluguel.data_fim);
                const atrasado = dias < 0;
                
                return (
                  <div 
                    key={aluguel.id} 
                    className={`p-4 border rounded-xl transition-all ${
                      atrasado ? 'border-destructive/50 bg-destructive/5' : 'border-border/50 bg-muted/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-semibold">{equipamento?.nome || aluguel.equipamento_id}</p>
                        <p className="text-sm text-muted-foreground">{aluguel.cliente_nome}</p>
                      </div>
                      {atrasado ? (
                        <PremiumBadge variant="urgent" size="sm" icon={AlertTriangle} pulse>
                          {Math.abs(dias)}d atrasado
                        </PremiumBadge>
                      ) : dias === 0 ? (
                        <PremiumBadge variant="urgent" size="sm">Hoje</PremiumBadge>
                      ) : dias === 1 ? (
                        <PremiumBadge variant="warning" size="sm">Amanhã</PremiumBadge>
                      ) : (
                        <PremiumBadge variant="neutral" size="sm">{dias}d</PremiumBadge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm mb-3 pb-3 border-b border-border/50">
                      <p><span className="text-muted-foreground">Período:</span> {new Date(aluguel.data_inicio).toLocaleDateString('pt-BR')} até {new Date(aluguel.data_fim).toLocaleDateString('pt-BR')}</p>
                      <p><span className="text-muted-foreground">Valor:</span> <span className="font-medium text-primary">R$ {aluguel.valor_total}</span></p>
                    </div>
                    <div className="flex gap-2">
                      {atrasado && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="flex-1 min-h-[44px]"
                          onClick={() => cobrarAtrasado(aluguel)}
                        >
                          Cobrar
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 min-h-[44px]"
                        onClick={() => finalizarAluguel(aluguel)}
                      >
                        Finalizar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabela Desktop */}
            <div className="hidden md:block rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-muted-foreground font-medium">Equipamento</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Período</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Valor</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                    <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alugueisAtivos.map((aluguel) => {
                    const equipamento = equipamentos.find(e => e.id === aluguel.equipamento_id);
                    const dias = diasParaVencer(aluguel.data_fim);
                    const atrasado = dias < 0;
                    
                    return (
                      <TableRow key={aluguel.id} className="border-border/50 hover:bg-muted/30">
                        <TableCell className="font-medium">{equipamento?.nome || aluguel.equipamento_id}</TableCell>
                        <TableCell>{aluguel.cliente_nome}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm">{new Date(aluguel.data_inicio).toLocaleDateString('pt-BR')}</p>
                            <p className="text-sm text-muted-foreground">até {new Date(aluguel.data_fim).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-primary">R$ {aluguel.valor_total}</TableCell>
                        <TableCell>
                          {atrasado ? (
                            <PremiumBadge variant="urgent" size="sm" icon={AlertTriangle} pulse>
                              {Math.abs(dias)}d atrasado
                            </PremiumBadge>
                          ) : dias === 0 ? (
                            <PremiumBadge variant="urgent" size="sm">Vence HOJE</PremiumBadge>
                          ) : dias === 1 ? (
                            <PremiumBadge variant="warning" size="sm">Vence amanhã</PremiumBadge>
                          ) : (
                            <PremiumBadge variant="neutral" size="sm">Vence em {dias}d</PremiumBadge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {atrasado && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => cobrarAtrasado(aluguel)}
                              >
                                Cobrar
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => finalizarAluguel(aluguel)}
                            >
                              Finalizar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </PremiumCard>
      )}
    </div>
  );
}
