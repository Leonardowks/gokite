// Configurações e constantes para o módulo de Trade-in

export const CATEGORIAS = [
  { value: 'kite', label: 'Kite', icon: '🪁' },
  { value: 'prancha', label: 'Prancha', icon: '🏄' },
  { value: 'wing', label: 'Wing', icon: '🦅' },
  { value: 'barra', label: 'Barra', icon: '🎣' },
  { value: 'trapezio', label: 'Trapézio', icon: '🦺' },
  { value: 'wetsuit', label: 'Wetsuit', icon: '🩱' },
  { value: 'acessorio', label: 'Acessório', icon: '🎒' },
] as const;

export const CONDICOES = [
  { value: 'novo', label: 'Novo', color: 'bg-emerald-500', textColor: 'text-emerald-500' },
  { value: 'seminovo', label: 'Seminovo', color: 'bg-green-500', textColor: 'text-green-500' },
  { value: 'usado_bom', label: 'Usado Bom', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  { value: 'usado_regular', label: 'Usado Regular', color: 'bg-orange-500', textColor: 'text-orange-500' },
  { value: 'desgastado', label: 'Desgastado', color: 'bg-red-500', textColor: 'text-red-500' },
] as const;

export const MARCAS_COMUNS = [
  'Duotone',
  'Core',
  'Ozone',
  'North',
  'Cabrinha',
  'Slingshot',
  'F-One',
  'Naish',
  'Liquid Force',
  'RRD',
  'Airush',
  'Eleveight',
  'Ocean Rodeo',
  'Crazyfly',
  'Gong',
  'Armstrong',
  'Axis',
  'Outro',
] as const;

export type Categoria = typeof CATEGORIAS[number]['value'];
export type Condicao = typeof CONDICOES[number]['value'];
export type Marca = typeof MARCAS_COMUNS[number];

export const getCategoriaByValue = (value: string | null) => 
  CATEGORIAS.find(c => c.value === value);

export const getCondicaoByValue = (value: string | null) => 
  CONDICOES.find(c => c.value === value);

export const formatNomeEquipamento = (
  marca?: string | null, 
  modelo?: string | null, 
  tamanho?: string | null
): string => {
  const parts = [marca, modelo, tamanho].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '';
};
