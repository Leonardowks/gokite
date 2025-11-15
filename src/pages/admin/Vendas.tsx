import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Phone, Mail, Tag, Search, Filter, TrendingUp } from "lucide-react";
import { localStorageService, type Lead } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";

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
      urgente: { variant: 'destructive' as const, label: '🔴 URGENTE', desc: 'Visitou 3x + últimos 2 dias' },
      quente: { variant: 'default' as const, label: '🟠 QUENTE', desc: 'Visitou 2-3x esta semana' },
      morno: { variant: 'secondary' as const, label: '🟡 MORNO', desc: 'Visitou 1x semana passada' },
    };
    return configs[score];
  };

  const leadsUrgentes = leadsFiltrados.filter(l => l.score === 'urgente').length;
  const leadsQuentes = leadsFiltrados.filter(l => l.score === 'quente').length;
  const leadsMornos = leadsFiltrados.filter(l => l.score === 'morno').length;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">💰 Gestão de Vendas</h1>
          <p className="text-muted-foreground mt-1">Leads filtrados por prioridade - não perca oportunidades</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{leadsFiltrados.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando contato</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">🔴 Urgentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{leadsUrgentes}</div>
            <p className="text-xs text-muted-foreground mt-1">Prioridade máxima</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-orange-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">🟠 Quentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{leadsQuentes}</div>
            <p className="text-xs text-muted-foreground mt-1">Boa chance conversão</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-yellow-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">🟡 Mornos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{leadsMornos}</div>
            <p className="text-xs text-muted-foreground mt-1">Requer aquecimento</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filtroScore === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroScore('todos')}
              >
                Todos
              </Button>
              <Button
                variant={filtroScore === 'urgente' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFiltroScore('urgente')}
              >
                🔴 Urgente
              </Button>
              <Button
                variant={filtroScore === 'quente' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroScore('quente')}
                className={filtroScore === 'quente' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                🟠 Quente
              </Button>
              <Button
                variant={filtroScore === 'morno' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFiltroScore('morno')}
              >
                🟡 Morno
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Leads */}
      <div className="space-y-4">
        {leadsFiltrados.map((lead) => {
          const scoreBadge = getScoreBadge(lead.score);
          const diasDesdeVisita = Math.floor((Date.now() - new Date(lead.ultima_visita).getTime()) / 86400000);
          
          return (
            <Card 
              key={lead.id} 
              className={`hover:shadow-lg transition-all ${
                lead.score === 'urgente' ? 'border-destructive/50' : 
                lead.score === 'quente' ? 'border-orange-500/50' : 
                'border-yellow-500/50'
              }`}
            >
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <CardTitle className="text-xl">{lead.nome}</CardTitle>
                      <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
                      {lead.status === 'contatado' && (
                        <Badge variant="outline">✓ Contatado</Badge>
                      )}
                    </div>
                    
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4" />
                        {lead.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        {lead.whatsapp}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-medium">{lead.interesse}</span>
                      </div>
                    </CardDescription>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">{scoreBadge.desc}</p>
                    <p className="text-sm font-medium">
                      {lead.visitas} visitas • última há {diasDesdeVisita}d
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => contatarWhatsApp(lead)}
                  >
                    <Phone className="h-4 w-4" />
                    WhatsApp (Template)
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={() => aplicarDesconto(lead)}
                  >
                    <Tag className="h-4 w-4" />
                    Aplicar 15% Desconto
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => window.open(`mailto:${lead.email}`, '_blank')}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {leadsFiltrados.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-2">
            <p className="text-2xl">🎉</p>
            <p className="font-medium">Nenhum lead pendente</p>
            <p className="text-sm text-muted-foreground">
              {filtroScore === 'todos' 
                ? 'Todos os leads foram contatados!' 
                : `Nenhum lead ${filtroScore} encontrado.`}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
