import { memo, CSSProperties } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { format } from "date-fns";
import { Mail, Phone, Edit } from "lucide-react";
import type { ClienteComAulas } from "@/hooks/useSupabaseClientes";

interface ClienteTableRowProps {
  cliente: ClienteComAulas;
  onEdit: (cliente: ClienteComAulas) => void;
  style?: CSSProperties;
}

export const ClienteTableRow = memo(function ClienteTableRow({ 
  cliente, 
  onEdit,
  style 
}: ClienteTableRowProps) {
  const handleWhatsApp = () => {
    const telefone = cliente.telefone?.replace(/\D/g, '') || '';
    if (telefone) {
      window.open(`https://wa.me/55${telefone}`, '_blank');
    }
  };

  return (
    <TableRow style={style} className="border-border/50 hover:bg-muted/30">
      <TableCell className="font-medium">{cliente.nome}</TableCell>
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
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleWhatsApp}
            disabled={!cliente.telefone}
            className="gap-2"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(cliente)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});
