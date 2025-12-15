import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { localStorageService, type Agendamento } from "@/lib/localStorage";
import { StatusBadge } from "@/components/StatusBadge";
import { AulaDialog } from "@/components/AulaDialog";
import { format } from "date-fns";
import { Search, Calendar, Plus, Trash2, Edit, Clock, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";

const traduzirTipoAula = (tipo: string) => {
  const tipos: Record<string, string> = {
    'iniciante': 'Iniciante',
    'intermediario': 'Intermediário',
    'avancado': 'Avançado',
    'wing_foil': 'Wing Foil'
  };
  return tipos[tipo] || tipo;
};

const traduzirLocalizacao = (local: string) => {
  const locais: Record<string, string> = {
    'florianopolis': 'Florianópolis',
    'taiba': 'Taíba'
  };
  return locais[local] || local;
};

export default function Aulas() {
  const [aulas, setAulas] = useState<Agendamento[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroLocal, setFiltroLocal] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAula, setSelectedAula] = useState<Agendamento | undefined>();
  const { toast } = useToast();

  useEffect(() => { loadAulas(); }, []);

  const loadAulas = () => {
    try {
      const agendamentos = localStorageService.listarAgendamentos();
      agendamentos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      setAulas(agendamentos);
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as aulas.", variant: "destructive" });
    }
  };

  const aulasFiltradas = aulas.filter((aula) => {
    const matchBusca = aula.cliente_nome.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || aula.status === filtroStatus;
    const matchLocal = filtroLocal === 'todos' || aula.localizacao === filtroLocal;
    return matchBusca && matchStatus && matchLocal;
  });

  const deletarAula = (id: string) => {
    if (localStorageService.deletarAgendamento(id)) {
      toast({ title: "Aula deletada com sucesso!" });
      loadAulas();
    }
  };

  const handleEdit = (aula: Agendamento) => {
    setSelectedAula(aula);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAula(undefined);
  };

  // Stats
  const pendentes = aulas.filter(a => a.status === 'pendente').length;
  const confirmadas = aulas.filter(a => a.status === 'confirmada').length;
  const canceladas = aulas.filter(a => a.status === 'cancelada').length;
  const receitaTotal = aulas.filter(a => a.status === 'confirmada').reduce((acc, a) => acc + a.valor, 0);

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PremiumBadge variant="default" size="sm" icon={Calendar}>
              {aulas.length} aulas
            </PremiumBadge>
            {pendentes > 0 && (
              <PremiumBadge variant="warning" size="sm" pulse>
                {pendentes} pendentes
              </PremiumBadge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Aulas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie todos os agendamentos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2 min-h-[44px]">
            <Plus className="h-4 w-4" />
            Nova Aula
          </Button>
          <Button asChild className="gap-2 min-h-[44px]">
            <Link to="/agendar-aula">
              <Calendar className="h-4 w-4" />
              Agendamento Público
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs Premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Pendentes
                </p>
                <AnimatedNumber 
                  value={pendentes} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container bg-warning/10 shrink-0">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Confirmadas
                </p>
                <AnimatedNumber 
                  value={confirmadas} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
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
                  Canceladas
                </p>
                <AnimatedNumber 
                  value={canceladas} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container bg-destructive/10 shrink-0">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Receita Total
                </p>
                <AnimatedNumber 
                  value={receitaTotal} 
                  format="currency"
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container shrink-0">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Lista de Aulas Premium */}
      <PremiumCard>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            Filtros
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar cliente..." 
                value={busca} 
                onChange={(e) => setBusca(e.target.value)} 
                className="pl-10 min-h-[44px] bg-muted/30 border-border/50 focus:bg-background" 
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] bg-muted/30 border-border/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="confirmada">Confirmadas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroLocal} onValueChange={setFiltroLocal}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] bg-muted/30 border-border/50">
                <SelectValue placeholder="Local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="florianopolis">Florianópolis</SelectItem>
                <SelectItem value="taiba">Taíba</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {aulasFiltradas.length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">
                {busca || filtroStatus !== 'todos' || filtroLocal !== 'todos' 
                  ? "Nenhuma aula encontrada com os filtros aplicados." 
                  : "Nenhuma aula agendada ainda."}
              </p>
            </div>
          ) : (
            <>
              {/* Tabela Desktop Premium */}
              <div className="hidden lg:block overflow-x-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="text-muted-foreground font-medium">Data</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Tipo</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Local</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Horário</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Valor</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aulasFiltradas.map((aula) => (
                      <TableRow key={aula.id} className="border-border/50 hover:bg-muted/30">
                        <TableCell className="font-medium">{format(new Date(aula.data), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-medium">{aula.cliente_nome}</TableCell>
                        <TableCell className="text-muted-foreground">{traduzirTipoAula(aula.tipo_aula)}</TableCell>
                        <TableCell className="text-muted-foreground">{traduzirLocalizacao(aula.localizacao)}</TableCell>
                        <TableCell className="text-muted-foreground">{aula.horario}</TableCell>
                        <TableCell><StatusBadge status={aula.status} /></TableCell>
                        <TableCell className="font-medium">R$ {aula.valor}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(aula)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deletarAula(aula.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Cards Mobile Premium */}
              <div className="lg:hidden space-y-3">
                {aulasFiltradas.map((aula) => (
                  <div 
                    key={aula.id} 
                    className="p-4 border border-border/50 rounded-xl bg-muted/20 hover:bg-muted/30 transition-all duration-200 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{aula.cliente_nome}</p>
                        <p className="text-sm text-muted-foreground">{traduzirTipoAula(aula.tipo_aula)}</p>
                      </div>
                      <StatusBadge status={aula.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Data:</span>
                        <span className="ml-1 font-medium">{format(new Date(aula.data), 'dd/MM/yyyy')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hora:</span>
                        <span className="ml-1 font-medium">{aula.horario}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Local:</span>
                        <span className="ml-1 font-medium">{traduzirLocalizacao(aula.localizacao)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="ml-1 font-medium text-primary">R$ {aula.valor}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(aula)} className="flex-1 min-h-[44px]">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => deletarAula(aula.id)} 
                        className="min-h-[44px] text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </PremiumCard>

      <AulaDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSave={() => {
          loadAulas();
          handleCloseDialog();
        }}
        aula={selectedAula}
      />
    </div>
  );
}
