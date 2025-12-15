import { useState, useEffect } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { localStorageService, type ClienteAgregado } from "@/lib/localStorage";
import { ClienteDialog } from "@/components/ClienteDialog";
import { format } from "date-fns";
import { Search, UserPlus, Mail, Phone, Edit, Users, Calendar } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";

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

  const totalAulas = clientes.reduce((acc, c) => acc + c.total_aulas, 0);

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PremiumBadge variant="default" size="sm" icon={Users}>
              {clientes.length} clientes
            </PremiumBadge>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Clientes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie seus clientes e histórico
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 min-h-[44px] w-full sm:w-auto">
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* KPIs Premium */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Total de Clientes
                </p>
                <AnimatedNumber 
                  value={clientes.length} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Total de Aulas
                </p>
                <AnimatedNumber 
                  value={totalAulas} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
              </div>
              <div className="icon-container shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Lista de Clientes Premium */}
      <PremiumCard>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            Lista de Clientes
          </CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, email ou telefone..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 min-h-[44px] bg-muted/30 border-border/50 focus:bg-background" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {filteredClientes.length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">
                {searchTerm ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
              </p>
            </div>
          ) : (
            <>
              {/* Cards Mobile Premium */}
              <div className="md:hidden space-y-3">
                {filteredClientes.map((cliente) => (
                  <div 
                    key={cliente.email} 
                    className="p-4 border border-border/50 rounded-xl bg-muted/20 hover:bg-muted/30 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-base">{cliente.nome}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{cliente.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Phone className="h-3 w-3" />
                          <span>{cliente.whatsapp}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <PremiumBadge variant="default" size="sm">
                          {cliente.total_aulas} aulas
                        </PremiumBadge>
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
                        WhatsApp
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
                  </div>
                ))}
              </div>

              {/* Tabela Desktop Premium */}
              <div className="hidden md:block overflow-x-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="text-muted-foreground font-medium">Nome</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Contato</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Total de Aulas</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Última Aula</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientes.map((cliente) => (
                      <TableRow key={cliente.email} className="border-border/50 hover:bg-muted/30">
                        <TableCell className="font-medium">{cliente.nome}</TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              {cliente.email}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {cliente.whatsapp}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PremiumBadge variant="default" size="sm">
                            {cliente.total_aulas} aulas
                          </PremiumBadge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cliente.ultima_aula ? format(new Date(cliente.ultima_aula), 'dd/MM/yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`https://wa.me/${cliente.whatsapp}`, '_blank')}
                              className="gap-2"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(cliente)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </PremiumCard>

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
