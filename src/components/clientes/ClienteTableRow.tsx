import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { format } from "date-fns";
import { Mail, Phone, Edit } from "lucide-react";
import type { ClienteAgregado } from "@/lib/localStorage";

interface ClienteTableRowProps {
  cliente: ClienteAgregado;
  onEdit: (cliente: ClienteAgregado) => void;
  style?: React.CSSProperties;
}

export const ClienteTableRow = React.memo(function ClienteTableRow({ 
  cliente, 
  onEdit,
  style 
}: ClienteTableRowProps) {
  const handleWhatsApp = () => {
    window.open(`https://wa.me/${cliente.whatsapp}`, '_blank');
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {cliente.whatsapp}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <PremiumBadge variant="default" size="sm">
          {cliente.total_aulas} aulas
        </PremiumBadge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {cliente.ultima_aula ? format(new Date(cliente.ultima_aula), 'dd/MM/yyyy') : 'N/A'}
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleWhatsApp}
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
