import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicTradeIn {
  id: string;
  equipamento_recebido: string;
  descricao: string | null;
  valor_entrada: number;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  tamanho: string | null;
  ano: number | null;
  condicao: string | null;
  fotos: string[];
  foto_url: string | null;
  data_entrada: string;
}

export interface CatalogoFilters {
  categoria?: string;
  marca?: string;
  precoMin?: number;
  precoMax?: number;
  condicao?: string;
  busca?: string;
}

export const usePublicTradeIns = (filters?: CatalogoFilters) => {
  return useQuery({
    queryKey: ["public-trade-ins", filters],
    queryFn: async () => {
      let query = supabase
        .from("trade_ins")
        .select("id, equipamento_recebido, descricao, valor_entrada, categoria, marca, modelo, tamanho, ano, condicao, fotos, foto_url, data_entrada")
        .eq("status", "em_estoque")
        .order("created_at", { ascending: false });

      if (filters?.categoria) {
        query = query.eq("categoria", filters.categoria);
      }

      if (filters?.marca) {
        query = query.eq("marca", filters.marca);
      }

      if (filters?.condicao) {
        query = query.eq("condicao", filters.condicao);
      }

      if (filters?.precoMin) {
        query = query.gte("valor_entrada", filters.precoMin);
      }

      if (filters?.precoMax) {
        query = query.lte("valor_entrada", filters.precoMax);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtro de busca local (nome/modelo/marca)
      let results = (data as PublicTradeIn[]) || [];
      
      if (filters?.busca) {
        const searchLower = filters.busca.toLowerCase();
        results = results.filter(item => 
          item.equipamento_recebido?.toLowerCase().includes(searchLower) ||
          item.marca?.toLowerCase().includes(searchLower) ||
          item.modelo?.toLowerCase().includes(searchLower) ||
          item.descricao?.toLowerCase().includes(searchLower)
        );
      }

      return results;
    },
  });
};

export const useTradeInMarcas = () => {
  return useQuery({
    queryKey: ["trade-in-marcas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_ins")
        .select("marca")
        .eq("status", "em_estoque")
        .not("marca", "is", null);

      if (error) throw error;

      const marcas = [...new Set(data.map(d => d.marca).filter(Boolean))];
      return marcas.sort();
    },
  });
};

export const useCatalogoStats = () => {
  return useQuery({
    queryKey: ["catalogo-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_ins")
        .select("id, categoria, valor_entrada")
        .eq("status", "em_estoque");

      if (error) throw error;

      const items = data || [];
      const categorias = [...new Set(items.map(i => i.categoria).filter(Boolean))];
      const menorPreco = items.length ? Math.min(...items.map(i => i.valor_entrada)) : 0;
      const maiorPreco = items.length ? Math.max(...items.map(i => i.valor_entrada)) : 0;

      return {
        total: items.length,
        categorias,
        menorPreco,
        maiorPreco,
      };
    },
  });
};
