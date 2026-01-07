import { Search, X, Filter, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { InventarioFilters } from "@/hooks/useInventario";

interface FilterOption {
  value: string;
  label: string;
}

interface InventarioFiltersProps {
  filters: InventarioFilters;
  onFiltersChange: (filters: InventarioFilters) => void;
  filterOptions: {
    tipos: string[];
    statuses: string[];
    localizacoes: string[];
    sourceTypes: string[];
  };
}

const statusLabels: Record<string, string> = {
  disponivel: '🟢 Disponível',
  alugado: '🟡 Alugado',
  manutencao: '🔧 Manutenção',
  vendido: '⚪ Vendido',
};

const tipoLabels: Record<string, string> = {
  kite: '🪁 Kite',
  wing: '🪽 Wing',
  prancha: '🏄 Prancha',
  barra: '🎛️ Barra',
  trapezio: '🎽 Trapézio',
  acessorio: '🔧 Acessório',
  wetsuit: '🩱 Wetsuit',
};

const sourceLabels: Record<string, string> = {
  owned: '🏠 Próprio',
  supplier: '☁️ Fornecedor',
};

export function InventarioFilters({ filters, onFiltersChange, filterOptions }: InventarioFiltersProps) {
  const activeFiltersCount = [
    filters.status?.length,
    filters.tipo?.length,
    filters.localizacao?.length,
    filters.sourceType?.length,
    filters.comEan !== null ? 1 : 0,
  ].reduce((acc, v) => acc + (v || 0), 0);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchTerm: value || undefined });
  };

  const handleMultiSelect = (key: keyof InventarioFilters, value: string, checked: boolean) => {
    const current = (filters[key] as string[]) || [];
    const updated = checked
      ? [...current, value]
      : current.filter(v => v !== value);
    onFiltersChange({ ...filters, [key]: updated.length > 0 ? updated : undefined });
  };

  const handleEanFilter = (value: string) => {
    let comEan: boolean | null = null;
    if (value === 'com') comEan = true;
    if (value === 'sem') comEan = false;
    onFiltersChange({ ...filters, comEan });
  };

  const handleOrderChange = (value: string) => {
    const [orderBy, orderDir] = value.split('-') as [InventarioFilters['orderBy'], InventarioFilters['orderDir']];
    onFiltersChange({ ...filters, orderBy, orderDir });
  };

  const clearFilters = () => {
    onFiltersChange({ searchTerm: filters.searchTerm });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card rounded-xl border">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou EAN..."
          value={filters.searchTerm || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
        {filters.searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => handleSearchChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtros Avançados</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  Limpar
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {filterOptions.statuses.map(status => (
                  <div key={status} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={filters.status?.includes(status) || false}
                      onCheckedChange={(checked) => handleMultiSelect('status', status, !!checked)}
                    />
                    <Label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                      {statusLabels[status] || status}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipo Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {filterOptions.tipos.map(tipo => (
                  <div key={tipo} className="flex items-center gap-2">
                    <Checkbox
                      id={`tipo-${tipo}`}
                      checked={filters.tipo?.includes(tipo) || false}
                      onCheckedChange={(checked) => handleMultiSelect('tipo', tipo, !!checked)}
                    />
                    <Label htmlFor={`tipo-${tipo}`} className="text-sm cursor-pointer">
                      {tipoLabels[tipo] || tipo}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Localização Filter */}
            {filterOptions.localizacoes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Localização</Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.localizacoes.map(loc => (
                    <div key={loc} className="flex items-center gap-2">
                      <Checkbox
                        id={`loc-${loc}`}
                        checked={filters.localizacao?.includes(loc) || false}
                        onCheckedChange={(checked) => handleMultiSelect('localizacao', loc, !!checked)}
                      />
                      <Label htmlFor={`loc-${loc}`} className="text-sm cursor-pointer">
                        {loc}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EAN Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Código EAN</Label>
              <Select
                value={filters.comEan === true ? 'com' : filters.comEan === false ? 'sem' : 'todos'}
                onValueChange={handleEanFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com">🟢 Com EAN</SelectItem>
                  <SelectItem value="sem">🔴 Sem EAN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Origem Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Origem</Label>
              <div className="flex gap-4">
                {filterOptions.sourceTypes.map(source => (
                  <div key={source} className="flex items-center gap-2">
                    <Checkbox
                      id={`source-${source}`}
                      checked={filters.sourceType?.includes(source) || false}
                      onCheckedChange={(checked) => handleMultiSelect('sourceType', source, !!checked)}
                    />
                    <Label htmlFor={`source-${source}`} className="text-sm cursor-pointer">
                      {sourceLabels[source] || source}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort Select */}
      <Select
        value={`${filters.orderBy || 'nome'}-${filters.orderDir || 'asc'}`}
        onValueChange={handleOrderChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="nome-asc">Nome A-Z</SelectItem>
          <SelectItem value="nome-desc">Nome Z-A</SelectItem>
          <SelectItem value="quantidade-desc">Maior quantidade</SelectItem>
          <SelectItem value="quantidade-asc">Menor quantidade</SelectItem>
          <SelectItem value="updated_at-desc">Mais recente</SelectItem>
          <SelectItem value="updated_at-asc">Mais antigo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
