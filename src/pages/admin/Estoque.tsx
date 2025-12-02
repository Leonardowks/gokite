import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, MapPin, DollarSign, Calendar, AlertTriangle, Plus } from "lucide-react";
import { localStorageService, type Equipamento, type Aluguel } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";

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
      disponivel: { variant: 'default' as const, label: '✓ Disponível' },
      alugado: { variant: 'secondary' as const, label: '📦 Alugado' },
      manutencao: { variant: 'destructive' as const, label: '🔧 Manutenção' },
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
    return loc === 'florianopolis' ? '📍 Florianópolis' : '📍 Taíba';
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">📦 Gestão de Estoque</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Controle de equipamentos e aluguéis em tempo real</p>
        </div>
        
        <Button className="gap-2 min-h-[44px] w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo Equipamento
        </Button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Equipamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEquipamentos}</div>
            <p className="text-xs text-muted-foreground mt-1">{disponiveis} disponíveis</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-green-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{disponiveis}</div>
            <p className="text-xs text-muted-foreground mt-1">Prontos para alugar</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-orange-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Alugados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{alugados}</div>
            <p className="text-xs text-muted-foreground mt-1">{alugueisAtivos.length} aluguéis ativos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Manutenção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{manutencao}</div>
            <p className="text-xs text-muted-foreground mt-1">Precisam reparo</p>
          </CardContent>
        </Card>
      </div>

      {/* Ocupação por Localização */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📍 Florianópolis</CardTitle>
            <CardDescription>Taxa de ocupação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-primary">{ocupacaoFloripa}%</div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: `${ocupacaoFloripa}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📍 Taíba</CardTitle>
            <CardDescription>Taxa de ocupação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-orange-600">{ocupacaoTaiba}%</div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-600 transition-all" 
                  style={{ width: `${ocupacaoTaiba}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filtroStatus === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('todos')}
            >
              Todos ({totalEquipamentos})
            </Button>
            <Button
              variant={filtroStatus === 'disponivel' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('disponivel')}
            >
              Disponíveis ({disponiveis})
            </Button>
            <Button
              variant={filtroStatus === 'alugado' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('alugado')}
            >
              Alugados ({alugados})
            </Button>
            <Button
              variant={filtroStatus === 'manutencao' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('manutencao')}
            >
              Manutenção ({manutencao})
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Grid de Equipamentos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {equipamentosFiltrados.map((eq) => {
          const statusBadge = getStatusBadge(eq.status);
          return (
            <Card key={eq.id} className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{eq.nome}</CardTitle>
                    <CardDescription>{getTipoLabel(eq.tipo)} • {eq.tamanho}</CardDescription>
                  </div>
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
            </Card>
          );
        })}
      </div>

      {/* Aluguéis Ativos */}
      {alugueisAtivos.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Aluguéis Ativos</CardTitle>
            <CardDescription className="text-sm">Equipamentos atualmente alugados - acompanhe devoluções</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {/* Cards Mobile */}
            <div className="md:hidden space-y-3">
              {alugueisAtivos.map((aluguel) => {
                const equipamento = equipamentos.find(e => e.id === aluguel.equipamento_id);
                const dias = diasParaVencer(aluguel.data_fim);
                const atrasado = dias < 0;
                
                return (
                  <Card key={aluguel.id} className={atrasado ? 'border-destructive/50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-base">{equipamento?.nome || aluguel.equipamento_id}</p>
                          <p className="text-sm text-muted-foreground">{aluguel.cliente_nome}</p>
                        </div>
                        {atrasado ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {Math.abs(dias)}d atrasado
                          </Badge>
                        ) : dias === 0 ? (
                          <Badge variant="destructive">Hoje</Badge>
                        ) : dias === 1 ? (
                          <Badge variant="secondary">Amanhã</Badge>
                        ) : (
                          <Badge variant="outline">{dias}d</Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm mb-3 pb-3 border-b">
                        <p><strong>Período:</strong> {new Date(aluguel.data_inicio).toLocaleDateString('pt-BR')} até {new Date(aluguel.data_fim).toLocaleDateString('pt-BR')}</p>
                        <p><strong>Valor:</strong> R$ {aluguel.valor_total}</p>
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Tabela Desktop */}
            <div className="hidden md:block">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alugueisAtivos.map((aluguel) => {
                  const equipamento = equipamentos.find(e => e.id === aluguel.equipamento_id);
                  const dias = diasParaVencer(aluguel.data_fim);
                  const atrasado = dias < 0;
                  
                  return (
                    <TableRow key={aluguel.id}>
                      <TableCell className="font-medium">{equipamento?.nome || aluguel.equipamento_id}</TableCell>
                      <TableCell>{aluguel.cliente_nome}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{new Date(aluguel.data_inicio).toLocaleDateString('pt-BR')}</p>
                          <p className="text-sm text-muted-foreground">até {new Date(aluguel.data_fim).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">R$ {aluguel.valor_total}</TableCell>
                      <TableCell>
                        {atrasado ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {Math.abs(dias)}d atrasado
                          </Badge>
                        ) : dias === 0 ? (
                          <Badge variant="destructive">Vence HOJE</Badge>
                        ) : dias === 1 ? (
                          <Badge variant="secondary">Vence amanhã</Badge>
                        ) : (
                          <Badge variant="outline">Vence em {dias}d</Badge>
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
        </Card>
      )}
    </div>
  );
}
