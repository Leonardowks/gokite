import { useState } from "react";
import { Check, X, MoreHorizontal, Edit, Trash2, QrCode, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface EquipamentoItem {
  id: string;
  nome: string;
  tipo: string;
  tamanho: string | null;
  quantidade_fisica: number | null;
  ean: string | null;
  status: string;
  localizacao: string | null;
  cost_price: number | null;
  sale_price: number | null;
  source_type: string | null;
}

interface InventarioTableProps {
  items: EquipamentoItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit?: (item: EquipamentoItem) => void;
  onDelete?: (item: EquipamentoItem) => void;
  isLoading?: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  disponivel: { label: 'Disponível', className: 'bg-success/20 text-success border-success/30' },
  alugado: { label: 'Alugado', className: 'bg-warning/20 text-warning border-warning/30' },
  manutencao: { label: 'Manutenção', className: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
  vendido: { label: 'Vendido', className: 'bg-muted text-muted-foreground border-muted' },
};

const tipoIcons: Record<string, string> = {
  kite: '🪁',
  wing: '🪽',
  prancha: '🏄',
  barra: '🎛️',
  trapezio: '🎽',
  acessorio: '🔧',
  wetsuit: '🩱',
};

export function InventarioTable({
  items,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  isLoading,
}: InventarioTableProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(i => i.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="p-8 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p>Carregando inventário...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="p-8 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum item encontrado</p>
          <p className="text-sm">Ajuste os filtros ou cadastre novos equipamentos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) (el as any).indeterminate = someSelected;
                }}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Tamanho</TableHead>
            <TableHead className="text-center">Qtd</TableHead>
            <TableHead className="text-center">EAN</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className={cn(
                "transition-colors",
                selectedIds.includes(item.id) && "bg-primary/5"
              )}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={() => toggleOne(item.id)}
                />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span>{item.nome}</span>
                  {item.source_type === 'supplier' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      ☁️
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  <span>{tipoIcons[item.tipo] || '📦'}</span>
                  <span className="capitalize">{item.tipo}</span>
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.tamanho || '-'}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="font-mono">
                  {item.quantidade_fisica || 1}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {item.ean ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/20 text-success">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-destructive/20 text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn("text-xs", statusConfig[item.status]?.className)}
                >
                  {statusConfig[item.status]?.label || item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.localizacao || '-'}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(item.cost_price)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(item)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete?.(item)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
