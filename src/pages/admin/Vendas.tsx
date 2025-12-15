import { useState, useEffect } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Mail, Tag, Search, TrendingUp, Users, Target, Flame } from "lucide-react";
import { localStorageService, type Lead } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";

export default function Vendas() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtroScore, setFiltroScore] = useState<'todos' | 'urgente' | 'quente' | 'morno'>('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarLeads();
  }, []);

  const carregarLeads = () => {
    const todosLeads = localStorageService.listarLeads();
    setLeads(todosLeads);
  };

  const leadsFiltrados = leads.filter(lead => {
    const matchScore = filtroScore === 'todos' || lead.score === filtroScore;
    const matchBusca = lead.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       lead.email.toLowerCase().includes(busca.toLowerCase());
    return matchScore && matchBusca && lead.status !== 'convertido';
  });

  const contatarWhatsApp = (lead: Lead) => {
    const mensagem = `Olá ${lead.nome}! Vimos que você está interessado em ${lead.interesse}. Podemos ajudar?`;
    window.open(`https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(mensagem)}`, '_blank');
    
    localStorageService.atualizarLead(lead.id, { status: 'contatado' });
    carregarLeads();
    
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
    carregarLeads();
  };

  const getScoreBadge = (score: Lead['score']) => {
    const configs = {
      urgente: { variant: 'urgent' as const, label: 'URGENTE', desc: 'Visitou 3x + últimos 2 dias' },
      quente: { variant: 'warning' as const, label: 'QUENTE', desc: 'Visitou 2-3x esta semana' },
      morno: { variant: 'neutral' as const, label: 'MORNO', desc: 'Visitou 1x semana passada' },
    };
    return configs[score];
  };

  const leadsUrgentes = leads.filter(l => l.score === 'urgente' && l.status !== 'convertido').length;
  const leadsQuentes = leads.filter(l => l.score === 'quente' && l.status !== 'convertido').length;
  const leadsMornos = leads.filter(l => l.score === 'morno' && l.status !== 'convertido').length;
  const totalLeads = leadsUrgentes + leadsQuentes + leadsMornos;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PremiumBadge variant="default" size="sm" icon={Users}>
              {totalLeads} leads
            </PremiumBadge>
            {leadsUrgentes > 0 && (
              <PremiumBadge variant="urgent" size="sm" pulse icon={Flame}>
                {leadsUrgentes} urgentes
              </PremiumBadge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Gestão de Vendas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Leads filtrados por prioridade - não perca oportunidades
          </p>
        </div>
      </div>

      {/* KPIs Premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Total Leads
                </p>
                <AnimatedNumber 
                  value={totalLeads} 
                  className="text-2xl sm:text-3xl font-bold text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">Aguardando contato</p>
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
                <p className="text-xs text-muted-foreground mt-1">Prioridade máxima</p>
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
                <p className="text-xs text-muted-foreground mt-1">Boa chance conversão</p>
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
                <p className="text-xs text-muted-foreground mt-1">Requer aquecimento</p>
              </div>
              <div className="icon-container shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Filtros Premium */}
      <PremiumCard>
        <CardHeader className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
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

      {/* Lista de Leads Premium */}
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
            <p className="font-medium text-foreground">Nenhum lead pendente</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filtroScore === 'todos' 
                ? 'Todos os leads foram contatados!' 
                : `Nenhum lead ${filtroScore} encontrado.`}
            </p>
          </div>
        </PremiumCard>
      )}
    </div>
  );
}
