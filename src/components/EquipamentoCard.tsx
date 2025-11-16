import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, DollarSign } from "lucide-react";
import type { Equipamento } from "@/lib/localStorage";

interface EquipamentoCardProps {
  equipamento: Equipamento;
  onAlugar?: (equipamento: Equipamento) => void;
  onDetalhes?: (equipamento: Equipamento) => void;
}

export function EquipamentoCard({ equipamento, onAlugar, onDetalhes }: EquipamentoCardProps) {
  const statusConfig = {
    disponivel: {
      color: 'bg-success text-success-foreground',
      label: 'Disponível',
      icon: '✓'
    },
    alugado: {
      color: 'bg-warning text-warning-foreground',
      label: 'Alugado',
      icon: '📍'
    },
    manutencao: {
      color: 'bg-destructive text-destructive-foreground',
      label: 'Manutenção',
      icon: '🔧'
    }
  };

  const tipoConfig = {
    prancha: { emoji: '🏄', label: 'Prancha' },
    asa: { emoji: '🪁', label: 'Asa' },
    trapezio: { emoji: '🎽', label: 'Trapézio' },
    outro: { emoji: '📦', label: 'Outro' }
  };

  const status = statusConfig[equipamento.status as keyof typeof statusConfig] || statusConfig.disponivel;
  const tipo = tipoConfig[equipamento.tipo as keyof typeof tipoConfig] || tipoConfig.outro;

  return (
    <Card className="hover-lift overflow-hidden group">
      <CardContent className="p-0">
        {/* Header visual com emoji grande */}
        <div className={`h-32 flex items-center justify-center text-6xl ${
          equipamento.status === 'disponivel' ? 'bg-success/10' :
          equipamento.status === 'alugado' ? 'bg-warning/10' :
          'bg-destructive/10'
        }`}>
          {tipo.emoji}
        </div>

        {/* Conteúdo */}
        <div className="p-4 space-y-3">
          {/* Título e Status */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base line-clamp-1">
                {equipamento.nome}
              </h3>
              <Badge className={`${status.color} text-xs shrink-0`}>
                {status.icon} {status.label}
              </Badge>
            </div>
            
            {/* Tipo e Tamanho */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {tipo.label}
              </Badge>
              {equipamento.tamanho && (
                <Badge variant="outline" className="text-xs">
                  {equipamento.tamanho}
                </Badge>
              )}
            </div>
          </div>

          {/* Informações */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-xs">
                {equipamento.localizacao === 'florianopolis' ? 'Florianópolis' : 'Taíba'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <DollarSign className="h-4 w-4 text-success" />
              <span className="text-sm">R$ {equipamento.preco_dia}/dia</span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            {equipamento.status === 'disponivel' ? (
              <Button 
                className="flex-1"
                onClick={() => onAlugar?.(equipamento)}
              >
                Alugar Agora
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onDetalhes?.(equipamento)}
              >
                Ver Detalhes
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
