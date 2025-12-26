import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AulaRecord {
  instrutor: string;
  tipo: string;
  preco: number;
  status: string;
  data: string;
}

interface InstrutorStats {
  instrutor: string;
  totalAulas: number;
  aulasConfirmadas: number;
  receitaTotal: number;
  ticketMedio: number;
}

interface TipoAulaStats {
  tipo: string;
  totalAulas: number;
  aulasConfirmadas: number;
  receitaTotal: number;
  ticketMedio: number;
}

export function useAulasStatsByInstrutor(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["aulas-stats-instrutor", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("instrutor, tipo, preco, status, data")
        .gte("data", startDate)
        .lte("data", endDate);

      if (error) throw error;

      const aulas = (data || []) as AulaRecord[];

      // Agregar por instrutor
      const statsByInstrutor: Record<string, InstrutorStats> = {};
      
      aulas.forEach((aula) => {
        const key = aula.instrutor || "Não definido";
        if (!statsByInstrutor[key]) {
          statsByInstrutor[key] = {
            instrutor: key,
            totalAulas: 0,
            aulasConfirmadas: 0,
            receitaTotal: 0,
            ticketMedio: 0,
          };
        }
        statsByInstrutor[key].totalAulas += 1;
        if (aula.status === "confirmada") {
          statsByInstrutor[key].aulasConfirmadas += 1;
          statsByInstrutor[key].receitaTotal += aula.preco || 0;
        }
      });

      // Calcular ticket médio
      Object.values(statsByInstrutor).forEach((stat) => {
        stat.ticketMedio = stat.aulasConfirmadas > 0 
          ? stat.receitaTotal / stat.aulasConfirmadas 
          : 0;
      });

      return Object.values(statsByInstrutor).sort((a, b) => b.receitaTotal - a.receitaTotal);
    },
  });
}

export function useAulasStatsByTipo(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["aulas-stats-tipo", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("instrutor, tipo, preco, status, data")
        .gte("data", startDate)
        .lte("data", endDate);

      if (error) throw error;

      const aulas = (data || []) as AulaRecord[];

      // Agregar por tipo
      const statsByTipo: Record<string, TipoAulaStats> = {};
      
      aulas.forEach((aula) => {
        const key = aula.tipo || "Não definido";
        if (!statsByTipo[key]) {
          statsByTipo[key] = {
            tipo: key,
            totalAulas: 0,
            aulasConfirmadas: 0,
            receitaTotal: 0,
            ticketMedio: 0,
          };
        }
        statsByTipo[key].totalAulas += 1;
        if (aula.status === "confirmada") {
          statsByTipo[key].aulasConfirmadas += 1;
          statsByTipo[key].receitaTotal += aula.preco || 0;
        }
      });

      // Calcular ticket médio
      Object.values(statsByTipo).forEach((stat) => {
        stat.ticketMedio = stat.aulasConfirmadas > 0 
          ? stat.receitaTotal / stat.aulasConfirmadas 
          : 0;
      });

      return Object.values(statsByTipo).sort((a, b) => b.receitaTotal - a.receitaTotal);
    },
  });
}

const TIPO_AULA_CONFIG: Record<string, { label: string; color: string }> = {
  kite_iniciante: { label: "Kite Iniciante", color: "hsl(var(--chart-1))" },
  kite_avancado: { label: "Kite Avançado", color: "hsl(var(--chart-2))" },
  wing_iniciante: { label: "Wing Iniciante", color: "hsl(var(--chart-3))" },
  wing_avancado: { label: "Wing Avançado", color: "hsl(var(--chart-4))" },
  foil: { label: "Foil", color: "hsl(var(--chart-5))" },
  avulsa: { label: "Aula Avulsa", color: "hsl(var(--success))" },
  pacote: { label: "Pacote", color: "hsl(var(--warning))" },
};

export function getTipoAulaLabel(tipo: string): string {
  return TIPO_AULA_CONFIG[tipo]?.label || tipo;
}

export function getTipoAulaColor(tipo: string): string {
  return TIPO_AULA_CONFIG[tipo]?.color || "hsl(var(--chart-1))";
}
