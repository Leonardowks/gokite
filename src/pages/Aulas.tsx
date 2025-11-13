import { useEffect, useState } from "react";
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { localStorageService, type Agendamento } from "@/lib/localStorage";
import { StatusBadge } from "@/components/StatusBadge";
import { traduzirTipoAula, traduzirLocalizacao } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Aulas() {
  const [aulas, setAulas] = useState<Agendamento[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroLocal, setFiltroLocal] = useState("todos");
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Aulas</h1>
          <p className="text-muted-foreground">Gerencie e agende aulas de kitesurf</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Agendar Aula
        </Button>
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
      </Card>

      <Card>
        <CardContent className="pt-6">
          {aulasFiltradas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {busca || filtroStatus !== 'todos' || filtroLocal !== 'todos' ? "Nenhuma aula encontrada." : "Nenhuma aula agendada."}
            </p>
          ) : (
            <>
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aulasFiltradas.map((aula) => (
                      <TableRow key={aula.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{format(new Date(aula.data), 'dd/MM/yyyy', { locale: ptBR })}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {aula.horario}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{aula.cliente_nome}</TableCell>
                        <TableCell>{traduzirTipoAula(aula.tipo_aula)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {traduzirLocalizacao(aula.localizacao)}
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={aula.status} /></TableCell>
                        <TableCell className="font-semibold">R$ {aula.valor.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => deletarAula(aula.id)} className="text-destructive hover:text-destructive">
                            Deletar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="block lg:hidden space-y-4">
                {aulasFiltradas.map((aula) => (
                  <Card key={aula.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-lg">{aula.cliente_nome}</p>
                            <p className="text-sm text-muted-foreground">{traduzirTipoAula(aula.tipo_aula)}</p>
                          </div>
                          <StatusBadge status={aula.status} />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(aula.data), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {aula.horario}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {traduzirLocalizacao(aula.localizacao)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-semibold text-lg">R$ {aula.valor.toFixed(2)}</span>
                          <Button size="sm" variant="ghost" onClick={() => deletarAula(aula.id)} className="text-destructive">
                            Deletar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
