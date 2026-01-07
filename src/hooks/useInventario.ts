import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback } from "react";

export interface InventarioFilters {
  searchTerm?: string;
  status?: string[];
  tipo?: string[];
  localizacao?: string[];
  comEan?: boolean | null;
  sourceType?: string[];
  orderBy?: 'nome' | 'quantidade' | 'updated_at';
  orderDir?: 'asc' | 'desc';
}

export interface ContagemItem {
  equipamentoId: string;
  nome: string;
  ean: string | null;
  quantidadeSistema: number;
  quantidadeContada: number;
  conferido: boolean;
  divergencia: number;
}

export interface SessaoContagem {
  id: string;
  inicioEm: Date;
  itensConferidos: ContagemItem[];
  itensPendentes: ContagemItem[];
}

// Hook para listagem completa com filtros
export function useInventarioCompleto(filters: InventarioFilters) {
  return useQuery({
    queryKey: ['inventario-completo', filters],
    queryFn: async () => {
      let query = supabase
        .from('equipamentos')
        .select('id, nome, tipo, tamanho, status, localizacao, quantidade_fisica, ean, source_type, cost_price, sale_price, updated_at')
        .order(filters.orderBy || 'nome', { ascending: filters.orderDir !== 'desc' });

      // Search filter
      if (filters.searchTerm) {
        query = query.or(`nome.ilike.%${filters.searchTerm}%,ean.ilike.%${filters.searchTerm}%`);
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Tipo filter
      if (filters.tipo && filters.tipo.length > 0) {
        query = query.in('tipo', filters.tipo);
      }

      // Localizacao filter
      if (filters.localizacao && filters.localizacao.length > 0) {
        query = query.in('localizacao', filters.localizacao);
      }

      // EAN filter
      if (filters.comEan === true) {
        query = query.not('ean', 'is', null);
      } else if (filters.comEan === false) {
        query = query.is('ean', null);
      }

      // Source type filter
      if (filters.sourceType && filters.sourceType.length > 0) {
        query = query.in('source_type', filters.sourceType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// Hook para estatísticas do inventário
export function useInventarioStats() {
  return useQuery({
    queryKey: ['inventario-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipamentos')
        .select('id, ean, status, quantidade_fisica, cost_price');

      if (error) throw error;

      const items = data || [];
      const total = items.length;
      const comEan = items.filter(e => e.ean).length;
      const semEan = items.filter(e => !e.ean).length;
      const totalUnidades = items.reduce((acc, e) => acc + (e.quantidade_fisica || 1), 0);
      const valorTotal = items.reduce((acc, e) => acc + ((e.cost_price || 0) * (e.quantidade_fisica || 1)), 0);

      const porStatus = {
        disponivel: items.filter(e => e.status === 'disponivel').length,
        alugado: items.filter(e => e.status === 'alugado').length,
        manutencao: items.filter(e => e.status === 'manutencao').length,
        vendido: items.filter(e => e.status === 'vendido').length,
      };

      return {
        total,
        comEan,
        semEan,
        percentualEan: total > 0 ? Math.round((comEan / total) * 100) : 0,
        totalUnidades,
        valorTotal,
        porStatus,
      };
    },
  });
}

// Hook para opções de filtro (valores únicos)
export function useInventarioFilterOptions() {
  return useQuery({
    queryKey: ['inventario-filter-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipamentos')
        .select('tipo, status, localizacao, source_type');

      if (error) throw error;

      const items = data || [];
      
      return {
        tipos: [...new Set(items.map(e => e.tipo).filter(Boolean))],
        statuses: [...new Set(items.map(e => e.status).filter(Boolean))],
        localizacoes: [...new Set(items.map(e => e.localizacao).filter(Boolean))],
        sourceTypes: [...new Set(items.map(e => e.source_type).filter(Boolean))],
      };
    },
  });
}

// Hook para gerenciar sessão de contagem
export function useContagemFisica() {
  const queryClient = useQueryClient();
  const [sessao, setSessao] = useState<SessaoContagem | null>(null);
  const [isActive, setIsActive] = useState(false);

  const iniciarContagem = useCallback(async () => {
    // Buscar todos os equipamentos para a contagem
    const { data: equipamentos } = await supabase
      .from('equipamentos')
      .select('id, nome, ean, quantidade_fisica')
      .order('nome');

    const itensPendentes: ContagemItem[] = (equipamentos || []).map(e => ({
      equipamentoId: e.id,
      nome: e.nome,
      ean: e.ean,
      quantidadeSistema: e.quantidade_fisica || 1,
      quantidadeContada: 0,
      conferido: false,
      divergencia: 0,
    }));

    const novaSessao: SessaoContagem = {
      id: crypto.randomUUID(),
      inicioEm: new Date(),
      itensConferidos: [],
      itensPendentes,
    };

    setSessao(novaSessao);
    setIsActive(true);

    // Salvar no localStorage para persistência
    localStorage.setItem('contagem_sessao', JSON.stringify(novaSessao));

    return novaSessao;
  }, []);

  const registrarContagem = useCallback((codigo: string, quantidade: number = 1) => {
    if (!sessao) return null;

    // Buscar por EAN primeiro
    let itemIndex = sessao.itensPendentes.findIndex(
      i => i.ean?.toLowerCase() === codigo.toLowerCase()
    );

    // Se não encontrou por EAN, buscar por nome parcial
    if (itemIndex === -1) {
      itemIndex = sessao.itensPendentes.findIndex(
        i => i.nome.toLowerCase().includes(codigo.toLowerCase())
      );
    }

    if (itemIndex === -1) {
      return { success: false, error: `Código "${codigo}" não encontrado no inventário` };
    }

    const item = sessao.itensPendentes[itemIndex];
    const novaQuantidade = item.quantidadeContada + quantidade;
    
    const itemAtualizado: ContagemItem = {
      ...item,
      quantidadeContada: novaQuantidade,
      conferido: true,
      divergencia: novaQuantidade - item.quantidadeSistema,
    };

    const novaSessao: SessaoContagem = {
      ...sessao,
      itensPendentes: sessao.itensPendentes.filter((_, i) => i !== itemIndex),
      itensConferidos: [...sessao.itensConferidos.filter(i => i.equipamentoId !== item.equipamentoId), itemAtualizado],
    };

    setSessao(novaSessao);
    localStorage.setItem('contagem_sessao', JSON.stringify(novaSessao));

    return { success: true, item: itemAtualizado };
  }, [sessao]);

  const encerrarContagem = useCallback(() => {
    setIsActive(false);
    localStorage.removeItem('contagem_sessao');
    return sessao;
  }, [sessao]);

  const restaurarSessao = useCallback(() => {
    const saved = localStorage.getItem('contagem_sessao');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.inicioEm = new Date(parsed.inicioEm);
      setSessao(parsed);
      setIsActive(true);
      return parsed;
    }
    return null;
  }, []);

  return {
    sessao,
    isActive,
    iniciarContagem,
    registrarContagem,
    encerrarContagem,
    restaurarSessao,
  };
}

// Mutation para atualizar quantidade após contagem
export function useAtualizarQuantidadeFisica() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ equipamentoId, novaQuantidade, motivo }: { 
      equipamentoId: string; 
      novaQuantidade: number;
      motivo?: string;
    }) => {
      // Validar quantidade
      if (novaQuantidade < 0) {
        throw new Error('Quantidade não pode ser negativa');
      }

      // Atualizar equipamento
      const { error: updateError } = await supabase
        .from('equipamentos')
        .update({ quantidade_fisica: novaQuantidade })
        .eq('id', equipamentoId);

      if (updateError) throw updateError;

      // Registrar movimentação
      const { error: movError } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          equipamento_id: equipamentoId,
          tipo: 'ajuste_inventario',
          quantidade: novaQuantidade,
          origem: 'contagem_fisica',
          notas: motivo || 'Ajuste por contagem física',
        });

      if (movError) throw movError;

      return { equipamentoId, novaQuantidade };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    },
  });
}

// Hook para exportar inventário
export function useExportarInventario() {
  return useMutation({
    mutationFn: async (items: any[]) => {
      const headers = ['Nome', 'Tipo', 'Tamanho', 'Quantidade', 'EAN', 'Status', 'Localização', 'Custo', 'Preço Venda'];
      
      const rows = items.map(item => [
        item.nome,
        item.tipo,
        item.tamanho || '',
        item.quantidade_fisica || 1,
        item.ean || '',
        item.status,
        item.localizacao || '',
        item.cost_price || 0,
        item.sale_price || 0,
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      return { success: true };
    },
  });
}
