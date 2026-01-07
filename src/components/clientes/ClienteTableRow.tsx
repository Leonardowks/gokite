import { memo, CSSProperties } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { format } from "date-fns";
import { Mail, Phone, Edit, Eye, Wallet } from "lucide-react";
import type { ClienteComAulas } from "@/hooks/useSupabaseClientes";

interface ClienteTableRowProps {
  cliente: ClienteComAulas;
  onEdit: (cliente: ClienteComAulas) => void;
  onViewDetails?: (cliente: ClienteComAulas) => void;
  style?: CSSProperties;
}

export const ClienteTableRow = memo(function ClienteTableRow({ 
  cliente, 
  onEdit,
  onViewDetails,
  style 
}: ClienteTableRowProps) {
  const handleWhatsApp = () => {
    const telefone = cliente.telefone?.replace(/\D/g, '') || '';
    if (telefone) {
      window.open(`https://wa.me/55${telefone}`, '_blank');
    }
  };

  const storeCredit = cliente.store_credit || 0;

  return (
    <TableRow style={style} className="border-border/50 hover:bg-muted/30">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {cliente.nome}
          {storeCredit > 0 && (
            <PremiumBadge variant="success" size="sm" icon={Wallet}>
              R$ {storeCredit.toLocaleString('pt-BR')}
            </PremiumBadge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            {cliente.email}
          </div>
          {cliente.telefone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {cliente.telefone}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <PremiumBadge variant="default" size="sm">
          {cliente.total_aulas} aulas
        </PremiumBadge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {cliente.ultima_aula ? format(new Date(cliente.ultima_aula), 'dd/MM/yyyy') : 'Sem aulas'}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleWhatsApp}
            disabled={!cliente.telefone}
          >
            <Phone className="h-4 w-4" />
          </Button>
          {onViewDetails && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewDetails(cliente)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(cliente)}
            className="gap-1.5"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});
