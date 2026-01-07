import { useState, useMemo, useCallback } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ClienteDialog } from "@/components/ClienteDialog";
import { 
  Search, 
  UserPlus, 
  Users, 
  Calendar, 
  Loader2,
  Phone,
  Mail,
  Tag,
  TrendingUp,
  Target,
  Flame
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { useDebounce } from "@/hooks/useDebounce";
import { VirtualizedClienteList, VirtualizedClienteTable, ClienteDetalhesDrawer } from "@/components/clientes";
import { useClientesListagem, useCreateCliente, useUpdateCliente, type ClienteComAulas } from "@/hooks/useSupabaseClientes";
import { localStorageService, type Lead } from "@/lib/localStorage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteComAulas | undefined>();
  const [detalhesCliente, setDetalhesCliente] = useState<ClienteComAulas | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("clientes");
  const [filtroScore, setFiltroScore] = useState<'todos' | 'urgente' | 'quente' | 'morno'>('todos');
  const [leads, setLeads] = useState<Lead[]>(() => localStorageService.listarLeads());
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

  const handleViewDetails = useCallback((cliente: ClienteComAulas) => {
    setDetalhesCliente(cliente);
    setDetalhesOpen(true);
  }, []);

  const handleSave = useCallback(async (data: { nome: string; email: string; telefone: string }) => {
    try {
      if (selectedCliente) {
        await updateMutation.mutateAsync({
          id: selectedCliente.id,
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
        });
        toast({ title: "Cliente atualizado!", description: "As informações foram salvas com sucesso." });
      } else {
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

  // Leads filtrados
  const leadsFiltrados = useMemo(() => {
    return leads.filter(lead => {
      const matchScore = filtroScore === 'todos' || lead.score === filtroScore;
      const matchBusca = lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchScore && matchBusca && lead.status !== 'convertido';
    });
  }, [leads, filtroScore, searchTerm]);

  const leadsUrgentes = leads.filter(l => l.score === 'urgente' && l.status !== 'convertido').length;
  const leadsQuentes = leads.filter(l => l.score === 'quente' && l.status !== 'convertido').length;
  const leadsMornos = leads.filter(l => l.score === 'morno' && l.status !== 'convertido').length;
  const totalLeads = leadsUrgentes + leadsQuentes + leadsMornos;

  const contatarWhatsApp = (lead: Lead) => {
    const mensagem = `Olá ${lead.nome}! Vimos que você está interessado em ${lead.interesse}. Podemos ajudar?`;
    window.open(`https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(mensagem)}`, '_blank');
    
    localStorageService.atualizarLead(lead.id, { status: 'contatado' });
    setLeads(localStorageService.listarLeads());
    
    toast({
      title: "WhatsApp enviado!",
      description: `Mensagem enviada para ${lead.nome}`,
    });
  };

  const aplicarDesconto = (lead: Lead) => {
    toast({
      title: "Cupom gerado!",
      description: `Cupom 15OFF enviado para ${lead.email}`,
    });
    
    localStorageService.atualizarLead(lead.id, { status: 'contatado' });
    setLeads(localStorageService.listarLeads());
  };

  const getScoreBadge = (score: Lead['score']) => {
    const configs = {
      urgente: { variant: 'urgent' as const, label: 'URGENTE', desc: 'Visitou 3x + últimos 2 dias' },
      quente: { variant: 'warning' as const, label: 'QUENTE', desc: 'Visitou 2-3x esta semana' },
      morno: { variant: 'neutral' as const, label: 'MORNO', desc: 'Visitou 1x semana passada' },
    };
    return configs[score];
  };

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
            {totalLeads > 0 && (
              <PremiumBadge variant="warning" size="sm" icon={Target}>
                {totalLeads} prospectos
              </PremiumBadge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Clientes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie clientes e prospectos
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 min-h-[44px] w-full sm:w-auto">
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes ({clientes.length})
          </TabsTrigger>
          <TabsTrigger value="prospectos" className="gap-2">
            <Target className="h-4 w-4" />
            Prospectos ({totalLeads})
          </TabsTrigger>
        </TabsList>

        {/* Tab Clientes */}
        <TabsContent value="clientes" className="space-y-5 mt-5">
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
                      onViewDetails={handleViewDetails}
                    />
                  </div>

                  {/* Tabela Virtualizada Desktop */}
                  <div className="hidden md:block">
                    <VirtualizedClienteTable 
                      clientes={clientes} 
                      onEdit={handleEdit}
                      onViewDetails={handleViewDetails}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </PremiumCard>
        </TabsContent>

        {/* Tab Prospectos */}
        <TabsContent value="prospectos" className="space-y-5 mt-5">
          {/* KPIs de Leads */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <PremiumCard hover>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                      Total Prospectos
                    </p>
                    <AnimatedNumber 
                      value={totalLeads} 
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
                      Urgentes
                    </p>
                    <AnimatedNumber 
                      value={leadsUrgentes} 
                      className="text-2xl sm:text-3xl font-bold text-destructive"
                    />
                  </div>
                  <div className="icon-container bg-destructive/10 shrink-0">
                    <Target className="h-5 w-5 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard hover>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                      Quentes
                    </p>
                    <AnimatedNumber 
                      value={leadsQuentes} 
                      className="text-2xl sm:text-3xl font-bold text-warning"
                    />
                  </div>
                  <div className="icon-container bg-warning/10 shrink-0">
                    <Flame className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard hover>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                      Mornos
                    </p>
                    <AnimatedNumber 
                      value={leadsMornos} 
                      className="text-2xl sm:text-3xl font-bold text-foreground"
                    />
                  </div>
                  <div className="icon-container shrink-0">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </PremiumCard>
          </div>

          {/* Filtros de Leads */}
          <PremiumCard>
            <CardHeader className="p-4 sm:p-5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 min-h-[44px] bg-muted/30 border-border/50 focus:bg-background"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={filtroScore === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroScore('todos')}
                    className="min-h-[40px]"
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filtroScore === 'urgente' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroScore('urgente')}
                    className="min-h-[40px]"
                  >
                    🔴 Urgente
                  </Button>
                  <Button
                    variant={filtroScore === 'quente' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroScore('quente')}
                    className={`min-h-[40px] ${filtroScore === 'quente' ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : ''}`}
                  >
                    🟠 Quente
                  </Button>
                  <Button
                    variant={filtroScore === 'morno' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroScore('morno')}
                    className="min-h-[40px]"
                  >
                    🟡 Morno
                  </Button>
                </div>
              </div>
            </CardHeader>
          </PremiumCard>

          {/* Lista de Leads */}
          <div className="space-y-4">
            {leadsFiltrados.map((lead) => {
              const scoreBadge = getScoreBadge(lead.score);
              const diasDesdeVisita = Math.floor((Date.now() - new Date(lead.ultima_visita).getTime()) / 86400000);
              
              return (
                <PremiumCard 
                  key={lead.id} 
                  hover
                  className={
                    lead.score === 'urgente' ? 'border-destructive/30' : 
                    lead.score === 'quente' ? 'border-warning/30' : 
                    ''
                  }
                >
                  <CardHeader className="p-4 sm:p-5">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <CardTitle className="text-lg sm:text-xl font-display">{lead.nome}</CardTitle>
                          <PremiumBadge 
                            variant={scoreBadge.variant} 
                            size="sm"
                            pulse={lead.score === 'urgente'}
                          >
                            {scoreBadge.label}
                          </PremiumBadge>
                          {lead.status === 'contatado' && (
                            <PremiumBadge variant="success" size="sm">
                              ✓ Contatado
                            </PremiumBadge>
                          )}
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {lead.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {lead.whatsapp}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">{lead.interesse}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <p className="text-xs text-muted-foreground">{scoreBadge.desc}</p>
                        <p className="text-sm font-medium">
                          {lead.visitas} visitas • última há {diasDesdeVisita}d
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 pt-0">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        className="flex-1 gap-2 bg-success hover:bg-success/90 text-success-foreground min-h-[44px]"
                        onClick={() => contatarWhatsApp(lead)}
                      >
                        <Phone className="h-4 w-4" />
                        WhatsApp
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="flex-1 gap-2 min-h-[44px]"
                        onClick={() => aplicarDesconto(lead)}
                      >
                        <Tag className="h-4 w-4" />
                        Aplicar 15% Desconto
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="gap-2 min-h-[44px]"
                        onClick={() => window.open(`mailto:${lead.email}`, '_blank')}
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                    </div>
                  </CardContent>
                </PremiumCard>
              );
            })}
          </div>

          {leadsFiltrados.length === 0 && (
            <PremiumCard>
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-foreground">Nenhum prospecto pendente</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filtroScore === 'todos' 
                    ? 'Todos os prospectos foram contatados!' 
                    : `Nenhum prospecto ${filtroScore} encontrado.`}
                </p>
              </div>
            </PremiumCard>
          )}
        </TabsContent>
      </Tabs>

      <ClienteDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSave={handleSave}
        cliente={selectedCliente}
        isLoading={isSaving}
      />

      <ClienteDetalhesDrawer
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        cliente={detalhesCliente}
        onEdit={handleEdit}
      />
    </div>
  );
}
