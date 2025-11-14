import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { localStorageService, type Agendamento } from "@/lib/localStorage";
import { StatusBadge } from "@/components/StatusBadge";
import { AulaDialog } from "@/components/AulaDialog";
import { format } from "date-fns";
import { Search, Calendar, Plus, Trash2, Edit } from "lucide-react";

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Aulas</h1>
          <p className="text-muted-foreground">Gerencie todos os agendamentos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Aula
          </Button>
          <Button asChild className="gap-2">
            <Link to="/agendar-aula">
              <Calendar className="h-4 w-4" />
              Agendamento Público
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
              <SelectTrigger className="w-full sm:w-[180px]">
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
        <CardContent>
          {aulasFiltradas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {busca || filtroStatus !== 'todos' || filtroLocal !== 'todos' 
                ? "Nenhuma aula encontrada com os filtros aplicados." 
                : "Nenhuma aula agendada ainda."}
            </p>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aulasFiltradas.map((aula) => (
                      <TableRow key={aula.id}>
                        <TableCell>{format(new Date(aula.data), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-medium">{aula.cliente_nome}</TableCell>
                        <TableCell>{traduzirTipoAula(aula.tipo_aula)}</TableCell>
                        <TableCell>{traduzirLocalizacao(aula.localizacao)}</TableCell>
                        <TableCell>{aula.horario}</TableCell>
                        <TableCell><StatusBadge status={aula.status} /></TableCell>
                        <TableCell>R$ {aula.valor}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(aula)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deletarAula(aula.id)}
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Deletar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Cards Mobile */}
              <div className="lg:hidden space-y-4">
                {aulasFiltradas.map((aula) => (
                  <Card key={aula.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{aula.cliente_nome}</p>
                          <p className="text-sm text-muted-foreground">{traduzirTipoAula(aula.tipo_aula)}</p>
                        </div>
                        <StatusBadge status={aula.status} />
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><strong>Data:</strong> {format(new Date(aula.data), 'dd/MM/yyyy')} às {aula.horario}</p>
                        <p><strong>Local:</strong> {traduzirLocalizacao(aula.localizacao)}</p>
                        <p><strong>Valor:</strong> R$ {aula.valor}</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(aula)} className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deletarAula(aula.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
