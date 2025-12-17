import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
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
    kite: { emoji: '🪁', label: 'Kite' },
    wing: { emoji: '🦅', label: 'Wing' },
    barra: { emoji: '🎛️', label: 'Barra' },
    prancha_twintip: { emoji: '🏄', label: 'Twintip' },
    prancha_kitewave: { emoji: '🏄', label: 'Kitewave' },
    trapezio: { emoji: '🎽', label: 'Trapézio' },
    acessorio: { emoji: '🔧', label: 'Acessório' },
    wetsuit: { emoji: '🤿', label: 'Wetsuit' },
  };

  const status = statusConfig[equipamento.status as keyof typeof statusConfig] || statusConfig.disponivel;
  const tipo = tipoConfig[equipamento.tipo as keyof typeof tipoConfig] || { emoji: '📦', label: 'Outro' };

  return (
    <Card className="hover-lift overflow-hidden group">
      <CardContent className="p-0">
        {/* Header visual com imagem ou emoji fallback */}
        <div className={`h-40 relative overflow-hidden ${
          !equipamento.foto_url ? (
            equipamento.status === 'disponivel' ? 'bg-success/10' :
            equipamento.status === 'alugado' ? 'bg-warning/10' :
            'bg-destructive/10'
          ) : ''
        }`}>
          {equipamento.foto_url ? (
            <OptimizedImage
              src={equipamento.foto_url}
              alt={equipamento.nome}
              aspectRatio="4/3"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-6xl">
              {tipo.emoji}
            </div>
          )}
          {/* Status overlay */}
          <div className="absolute top-2 right-2">
            <Badge className={`${status.color} text-xs shadow-lg`}>
              {status.icon} {status.label}
            </Badge>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-4 space-y-3">
          {/* Título */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base line-clamp-1">
              {equipamento.nome}
            </h3>
            
            {/* Tipo e Tamanho */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {tipo.emoji} {tipo.label}
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
