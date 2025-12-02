import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { localStorageService, type ClienteAgregado } from "@/lib/localStorage";
import { ClienteDialog } from "@/components/ClienteDialog";
import { format } from "date-fns";
import { Search, UserPlus, Mail, Phone, Edit } from "lucide-react";

export default function Clientes() {
  const [clientes, setClientes] = useState<ClienteAgregado[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteAgregado | undefined>();
  const { toast } = useToast();

  useEffect(() => { loadClientes(); }, []);

  const loadClientes = () => {
    try {
      setClientes(localStorageService.listarClientes());
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os clientes.", variant: "destructive" });
    }
  };

  const filteredClientes = clientes.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.whatsapp.includes(searchTerm)
  );

  const handleEdit = (cliente: ClienteAgregado) => {
    setSelectedCliente(cliente);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCliente(undefined);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Gerencie seus clientes e histórico</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 min-h-[44px] w-full sm:w-auto">
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Lista de Clientes</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 min-h-[44px]" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {filteredClientes.length === 0 ? (
            <p className="text-center text-sm sm:text-base text-muted-foreground py-6 sm:py-8">{searchTerm ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}</p>
          ) : (
            <>
              {/* Cards Mobile */}
              <div className="md:hidden space-y-3">
                {filteredClientes.map((cliente) => (
                  <Card key={cliente.email}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-base">{cliente.nome}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{cliente.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Phone className="h-3 w-3" />
                            <span>{cliente.whatsapp}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3 pb-3 border-b">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Aulas:</span>
                          <span className="font-semibold ml-1">{cliente.total_aulas}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cliente.ultima_aula ? format(new Date(cliente.ultima_aula), 'dd/MM/yyyy') : 'Sem aulas'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 min-h-[44px]"
                          onClick={() => window.open(`https://wa.me/${cliente.whatsapp}`, '_blank')}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Ligar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 min-h-[44px]"
                          onClick={() => handleEdit(cliente)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Tabela Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Total de Aulas</TableHead>
                    <TableHead>Última Aula</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.email}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {cliente.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {cliente.whatsapp}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{cliente.total_aulas}</TableCell>
                      <TableCell>
                        {cliente.ultima_aula ? format(new Date(cliente.ultima_aula), 'dd/MM/yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(cliente)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ClienteDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSave={() => {
          loadClientes();
          handleCloseDialog();
        }}
        cliente={selectedCliente}
      />
    </div>
  );
}
