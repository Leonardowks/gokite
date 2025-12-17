import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calcular preço por tipo de aula
export const calcularPreco = (tipo: string): number => {
  const precos: Record<string, number> = {
    kitesurf_iniciante: 400,
    kitesurf_intermediario: 500,
    kitesurf_avancado: 600,
    wing_foil: 700,
    foil: 650,
    downwind: 750,
  };
  return precos[tipo] || 0;
};

// Formatar WhatsApp
export const formatarWhatsApp = (numero: string): string => {
  // 48999887766 → (48) 99988-7766
  if (numero.length !== 11) return numero;
  return numero.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

// Formatar data BR
export const formatarDataBR = (isoDate: string): string => {
  return format(new Date(isoDate), 'dd/MM/yyyy');
};

// Traduzir tipo de aula
export const traduzirTipoAula = (tipo: string): string => {
  const traducoes: Record<string, string> = {
    kitesurf_iniciante: 'Kitesurf Iniciante',
    kitesurf_intermediario: 'Kitesurf Intermediário',
    kitesurf_avancado: 'Kitesurf Avançado',
    wing_foil: 'Wing Foil',
    foil: 'Foil',
    downwind: 'Downwind',
  };
  return traducoes[tipo] || tipo;
};

// Traduzir localização
export const traduzirLocalizacao = (local: string): string => {
  const traducoes: Record<string, string> = {
    florianopolis: 'Florianópolis - SC',
    taiba: 'Taíba - CE',
  };
  return traducoes[local] || local;
};
