import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, TrendingUp } from "lucide-react";
import type { Lead } from "@/lib/localStorage";

interface LeadPipelineProps {
  leads: Lead[];
  onContatarWhatsApp?: (lead: Lead) => void;
  onEnviarEmail?: (lead: Lead) => void;
}

type Stage = 'novo' | 'contatado' | 'proposta' | 'convertido';

const stages: { id: Stage; label: string; color: string }[] = [
  { id: 'novo', label: 'Novo', color: 'bg-muted' },
  { id: 'contatado', label: 'Contatado', color: 'bg-primary/10' },
  { id: 'proposta', label: 'Proposta', color: 'bg-warning/10' },
  { id: 'convertido', label: 'Vendido', color: 'bg-success/10' },
];

export function LeadPipeline({ leads, onContatarWhatsApp, onEnviarEmail }: LeadPipelineProps) {
  const getLeadsByStage = (stage: Stage) => {
    return leads.filter(lead => lead.status === stage);
  };

  const getScoreBadge = (score: string) => {
    if (score === 'urgente') return { variant: 'destructive' as const, label: '🔥 Urgente' };
    if (score === 'quente') return { variant: 'default' as const, label: '🟠 Quente' };
    return { variant: 'secondary' as const, label: '🟡 Morno' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Pipeline de Vendas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stages.map((stage) => {
            const stageLeads = getLeadsByStage(stage.id);
            
            return (
              <div key={stage.id} className="space-y-3">
                {/* Header da coluna */}
                <div className={`${stage.color} rounded-lg p-3 border`}>
                  <div className="font-semibold text-sm">{stage.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stageLeads.length} {stageLeads.length === 1 ? 'lead' : 'leads'}
                  </div>
                </div>

                {/* Cards dos leads */}
                <div className="space-y-2">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      Nenhum lead aqui
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const scoreBadge = getScoreBadge(lead.score);
                      
                      return (
                        <Card key={lead.id} className="hover-lift">
                          <CardContent className="p-3 space-y-2">
                            <div className="space-y-1">
                              <div className="font-medium text-sm line-clamp-1">
                                {lead.nome}
                              </div>
                              <Badge {...scoreBadge} className="text-xs">
                                {scoreBadge.label}
                              </Badge>
                            </div>

                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="line-clamp-1">{lead.email}</div>
                              <div className="line-clamp-1">{lead.whatsapp}</div>
                            </div>

                            {stage.id !== 'convertido' && (
                              <div className="flex gap-1 pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-8 text-xs"
                                  onClick={() => onContatarWhatsApp?.(lead)}
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-8 text-xs"
                                  onClick={() => onEnviarEmail?.(lead)}
                                >
                                  <Mail className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
