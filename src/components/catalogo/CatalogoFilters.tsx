import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CatalogoFilters as FiltersType } from "@/hooks/usePublicTradeIns";
import { CATEGORIAS, CONDICOES } from "@/lib/tradeInConfig";
import { useState } from "react";

interface CatalogoFiltersProps {
  filters: FiltersType;
  setFilters: (filters: FiltersType) => void;
  marcas: string[];
  precoRange: { min: number; max: number };
  totalResults: number;
}

export function CatalogoFilters({ 
  filters, 
  setFilters, 
  marcas, 
  precoRange,
  totalResults 
}: CatalogoFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localPreco, setLocalPreco] = useState<[number, number]>([
    filters.precoMin || precoRange.min,
    filters.precoMax || precoRange.max
  ]);

  const activeFiltersCount = [
    filters.categoria,
    filters.marca,
    filters.condicao,
    filters.precoMin,
    filters.precoMax,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({ busca: filters.busca });
    setLocalPreco([precoRange.min, precoRange.max]);
  };

  const applyFilters = () => {
    setFilters({
      ...filters,
      precoMin: localPreco[0] !== precoRange.min ? localPreco[0] : undefined,
      precoMax: localPreco[1] !== precoRange.max ? localPreco[1] : undefined,
    });
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Barra de busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca, modelo..."
            value={filters.busca || ""}
            onChange={(e) => setFilters({ ...filters, busca: e.target.value })}
            className="pl-10 h-12"
          />
        </div>
        
        {/* Mobile Filter Button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-12 gap-2 sm:hidden">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge className="h-5 w-5 p-0 justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6 overflow-y-auto">
              <FilterContent
                filters={filters}
                setFilters={setFilters}
                marcas={marcas}
                precoRange={precoRange}
                localPreco={localPreco}
                setLocalPreco={setLocalPreco}
              />
              
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={clearFilters}>
                  Limpar
                </Button>
                <Button className="flex-1" onClick={applyFilters}>
                  Ver {totalResults} resultados
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Desktop Filters */}
        <div className="hidden sm:flex gap-2">
          <Select
            value={filters.categoria || "all"}
            onValueChange={(v) => setFilters({ ...filters, categoria: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-[140px] h-12">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIAS.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={filters.marca || "all"}
            onValueChange={(v) => setFilters({ ...filters, marca: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-[140px] h-12">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {marcas.map(marca => (
                <SelectItem key={marca} value={marca}>
                  {marca}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={filters.condicao || "all"}
            onValueChange={(v) => setFilters({ ...filters, condicao: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-[140px] h-12">
              <SelectValue placeholder="Condição" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CONDICOES.map(cond => (
                <SelectItem key={cond.value} value={cond.value}>
                  {cond.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="h-12 w-12">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Active filters badges */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.categoria && (
            <Badge variant="secondary" className="gap-1 py-1 px-3">
              {CATEGORIAS.find(c => c.value === filters.categoria)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setFilters({ ...filters, categoria: undefined })}
              />
            </Badge>
          )}
          {filters.marca && (
            <Badge variant="secondary" className="gap-1 py-1 px-3">
              {filters.marca}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setFilters({ ...filters, marca: undefined })}
              />
            </Badge>
          )}
          {filters.condicao && (
            <Badge variant="secondary" className="gap-1 py-1 px-3">
              {CONDICOES.find(c => c.value === filters.condicao)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setFilters({ ...filters, condicao: undefined })}
              />
            </Badge>
          )}
          {(filters.precoMin || filters.precoMax) && (
            <Badge variant="secondary" className="gap-1 py-1 px-3">
              R$ {filters.precoMin?.toLocaleString('pt-BR') || '0'} - R$ {filters.precoMax?.toLocaleString('pt-BR') || '∞'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setFilters({ ...filters, precoMin: undefined, precoMax: undefined })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function FilterContent({ 
  filters, 
  setFilters, 
  marcas, 
  precoRange,
  localPreco,
  setLocalPreco
}: {
  filters: FiltersType;
  setFilters: (f: FiltersType) => void;
  marcas: string[];
  precoRange: { min: number; max: number };
  localPreco: [number, number];
  setLocalPreco: (v: [number, number]) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select
          value={filters.categoria || "all"}
          onValueChange={(v) => setFilters({ ...filters, categoria: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIAS.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Marca</Label>
        <Select
          value={filters.marca || "all"}
          onValueChange={(v) => setFilters({ ...filters, marca: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Todas as marcas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {marcas.map(marca => (
              <SelectItem key={marca} value={marca}>
                {marca}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Condição</Label>
        <Select
          value={filters.condicao || "all"}
          onValueChange={(v) => setFilters({ ...filters, condicao: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Todas as condições" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CONDICOES.map(cond => (
              <SelectItem key={cond.value} value={cond.value}>
                {cond.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-4">
        <Label>Faixa de Preço</Label>
        <div className="px-2">
          <Slider
            value={localPreco}
            onValueChange={(v) => setLocalPreco(v as [number, number])}
            min={precoRange.min}
            max={precoRange.max}
            step={100}
            className="mb-4"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>R$ {localPreco[0].toLocaleString('pt-BR')}</span>
            <span>R$ {localPreco[1].toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </>
  );
}
