import { memo, CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { format } from "date-fns";
import { Mail, Phone, Edit } from "lucide-react";
import type { ClienteComAulas } from "@/hooks/useSupabaseClientes";

interface ClienteCardProps {
  cliente: ClienteComAulas;
  onEdit: (cliente: ClienteComAulas) => void;
  style?: CSSProperties;
}

export const ClienteCard = memo(function ClienteCard({ 
  cliente, 
  onEdit,
  style 
}: ClienteCardProps) {
  const handleWhatsApp = () => {
    const telefone = cliente.telefone?.replace(/\D/g, '') || '';
    if (telefone) {
      window.open(`https://wa.me/55${telefone}`, '_blank');
    }
  };

  return (
    <div 
      style={style}
      className="p-4 border border-border/50 rounded-xl bg-muted/20 hover:bg-muted/30 transition-all duration-200"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <p className="font-semibold text-base">{cliente.nome}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
            <Mail className="h-3 w-3" />
            <span className="truncate">{cliente.email}</span>
          </div>
          {cliente.telefone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Phone className="h-3 w-3" />
              <span>{cliente.telefone}</span>
            </div>
          )}
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
          onClick={handleWhatsApp}
          disabled={!cliente.telefone}
        >
          <Phone className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 min-h-[44px]"
          onClick={() => onEdit(cliente)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>
    </div>
  );
});
