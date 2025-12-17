import React, { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClienteTableRow } from "./ClienteTableRow";
import type { ClienteAgregado } from "@/lib/localStorage";

interface VirtualizedClienteTableProps {
  clientes: ClienteAgregado[];
  onEdit: (cliente: ClienteAgregado) => void;
}

export function VirtualizedClienteTable({ clientes, onEdit }: VirtualizedClienteTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: clientes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Altura estimada de cada linha
    overscan: 10, // Mais overscan para tabelas
  });

  const handleEdit = useCallback((cliente: ClienteAgregado) => {
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
                      key={cliente.email}
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
