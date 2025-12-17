import React, { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ClienteCard } from "./ClienteCard";
import type { ClienteAgregado } from "@/lib/localStorage";

interface VirtualizedClienteListProps {
  clientes: ClienteAgregado[];
  onEdit: (cliente: ClienteAgregado) => void;
}

export function VirtualizedClienteList({ clientes, onEdit }: VirtualizedClienteListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: clientes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180, // Altura estimada de cada card
    overscan: 5, // Renderiza 5 itens extras acima/abaixo para scroll suave
  });

  const handleEdit = useCallback((cliente: ClienteAgregado) => {
    onEdit(cliente);
  }, [onEdit]);

  return (
    <div 
      ref={parentRef} 
      className="h-[60vh] overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
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
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                padding: '6px 0',
              }}
            >
              <ClienteCard 
                cliente={cliente} 
                onEdit={handleEdit}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
