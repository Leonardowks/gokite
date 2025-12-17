import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClienteTableRow } from "./ClienteTableRow";
import type { ClienteComAulas } from "@/hooks/useSupabaseClientes";

interface VirtualizedClienteTableProps {
  clientes: ClienteComAulas[];
  onEdit: (cliente: ClienteComAulas) => void;
}

export function VirtualizedClienteTable({ clientes, onEdit }: VirtualizedClienteTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: clientes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  const handleEdit = useCallback((cliente: ClienteComAulas) => {
    onEdit(cliente);
  }, [onEdit]);

  return (
    <div 
      ref={parentRef} 
      className="h-[60vh] overflow-auto rounded-lg scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
    >
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="text-muted-foreground font-medium">Nome</TableHead>
            <TableHead className="text-muted-foreground font-medium">Contato</TableHead>
            <TableHead className="text-muted-foreground font-medium">Total de Aulas</TableHead>
            <TableHead className="text-muted-foreground font-medium">Última Aula</TableHead>
            <TableHead className="text-muted-foreground font-medium">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <tr style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            <td colSpan={5} style={{ padding: 0, position: 'relative' }}>
              <div style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const cliente = clientes[virtualRow.index];
                  return (
                    <div
                      key={cliente.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                        display: 'table',
                        tableLayout: 'fixed',
                      }}
                    >
                      <ClienteTableRow 
                        cliente={cliente} 
                        onEdit={handleEdit}
                      />
                    </div>
                  );
                })}
              </div>
            </td>
          </tr>
        </TableBody>
      </Table>
    </div>
  );
}
