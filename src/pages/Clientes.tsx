import { useState, useMemo, useCallback } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ClienteDialog } from "@/components/ClienteDialog";
import { Search, UserPlus, Users, Calendar, Loader2 } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { useDebounce } from "@/hooks/useDebounce";
import { VirtualizedClienteList, VirtualizedClienteTable } from "@/components/clientes";
import { useClientesListagem, useCreateCliente, useUpdateCliente, type ClienteComAulas } from "@/hooks/useSupabaseClientes";

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteComAulas | undefined>();
  const { toast } = useToast();

  // Debounce de 300ms na busca
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Hooks do Supabase
  const { data: clientes = [], isLoading, error, refetch } = useClientesListagem(debouncedSearch);
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();

  // Mostrar erro se houver
  if (error) {
    console.error("Erro ao carregar clientes:", error);
  }

  // Callbacks memoizados
  const handleEdit = useCallback((cliente: ClienteComAulas) => {
    setSelectedCliente(cliente);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedCliente(undefined);
  }, []);

  const handleSave = useCallback(async (data: { nome: string; email: string; telefone: string }) => {
    try {
      if (selectedCliente) {
        // Atualizar cliente existente
        await updateMutation.mutateAsync({
          id: selectedCliente.id,
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
        });
        toast({ title: "Cliente atualizado!", description: "As informações foram salvas com sucesso." });
      } else {
        // Criar novo cliente
        await createMutation.mutateAsync({
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
        });
        toast({ title: "Cliente adicionado!", description: "O novo cliente foi cadastrado com sucesso." });
      }
      handleCloseDialog();
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      toast({ 
        title: "Erro ao salvar", 
        description: "Não foi possível salvar as informações do cliente.", 
        variant: "destructive" 
      });
    }
  }, [selectedCliente, updateMutation, createMutation, toast, handleCloseDialog]);

  // KPIs memoizados
  const totalAulas = useMemo(() => 
    clientes.reduce((acc, c) => acc + c.total_aulas, 0), 
    [clientes]
  );

  const isSearching = searchTerm !== debouncedSearch;
  const isSaving = createMutation.isPending || updateMutation.isPending;

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
              className="pl-10 pr-10 min-h-[44px] bg-muted/30 border-border/50 focus:bg-background" 
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-10 sm:py-12">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-destructive/50" />
              </div>
              <p className="text-destructive text-sm mb-4">Erro ao carregar clientes.</p>
              <Button variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : clientes.length === 0 ? (
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
              {/* Lista Virtualizada Mobile */}
              <div className="md:hidden">
                <VirtualizedClienteList 
                  clientes={clientes} 
                  onEdit={handleEdit} 
                />
              </div>

              {/* Tabela Virtualizada Desktop */}
              <div className="hidden md:block">
                <VirtualizedClienteTable 
                  clientes={clientes} 
                  onEdit={handleEdit} 
                />
              </div>
            </>
          )}
        </CardContent>
      </PremiumCard>

      <ClienteDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSave={handleSave}
        cliente={selectedCliente}
        isLoading={isSaving}
      />
    </div>
  );
}
