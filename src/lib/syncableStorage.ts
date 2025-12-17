import { addToSyncQueue } from './syncQueue';
import { localStorageService, Agendamento, Equipamento, Aluguel, Lead } from './localStorage';

// Wrapper that adds sync queue integration
// Operations are saved locally AND queued for server sync when offline

type EntityType = 'aula' | 'cliente' | 'aluguel' | 'equipamento' | 'lead';

function shouldQueueForSync(): boolean {
  return !navigator.onLine;
}

function queueOperation(type: 'create' | 'update' | 'delete', entity: EntityType, data: Record<string, unknown>) {
  if (shouldQueueForSync()) {
    addToSyncQueue(type, entity, data);
    console.log(`[SyncableStorage] Queued ${type} for ${entity} (offline)`);
  } else {
    console.log(`[SyncableStorage] ${type} ${entity} (online - immediate)`);
  }
}

export const syncableStorage = {
  // ========== AGENDAMENTOS ==========
  salvarAgendamento: (data: Omit<Agendamento, 'id' | 'created_at'>): Agendamento => {
    const result = localStorageService.salvarAgendamento(data);
    queueOperation('create', 'aula', result as unknown as Record<string, unknown>);
    return result;
  },

  atualizarStatus: (id: string, status: Agendamento['status']): boolean => {
    const result = localStorageService.atualizarStatus(id, status);
    if (result) {
      queueOperation('update', 'aula', { id, status });
    }
    return result;
  },

  atualizarAgendamento: (id: string, dados: Agendamento): boolean => {
    const result = localStorageService.atualizarAgendamento(id, dados);
    if (result) {
      queueOperation('update', 'aula', dados as unknown as Record<string, unknown>);
    }
    return result;
  },

  deletarAgendamento: (id: string): boolean => {
    const result = localStorageService.deletarAgendamento(id);
    if (result) {
      queueOperation('delete', 'aula', { id });
    }
    return result;
  },

  // ========== EQUIPAMENTOS ==========
  salvarEquipamento: (data: Omit<Equipamento, 'id' | 'created_at'>): Equipamento => {
    const result = localStorageService.salvarEquipamento(data);
    queueOperation('create', 'equipamento', result as unknown as Record<string, unknown>);
    return result;
  },

  atualizarEquipamento: (id: string, dados: Partial<Equipamento>): boolean => {
    const result = localStorageService.atualizarEquipamento(id, dados);
    if (result) {
      queueOperation('update', 'equipamento', { id, ...dados });
    }
    return result;
  },

  // ========== ALUGUÉIS ==========
  salvarAluguel: (data: Omit<Aluguel, 'id' | 'created_at'>): Aluguel => {
    const result = localStorageService.salvarAluguel(data);
    queueOperation('create', 'aluguel', result as unknown as Record<string, unknown>);
    return result;
  },

  finalizarAluguel: (id: string): boolean => {
    const result = localStorageService.finalizarAluguel(id);
    if (result) {
      queueOperation('update', 'aluguel', { id, status: 'concluido' });
    }
    return result;
  },

  // ========== LEADS ==========
  salvarLead: (data: Omit<Lead, 'id' | 'created_at'>): Lead => {
    const result = localStorageService.salvarLead(data);
    queueOperation('create', 'lead', result as unknown as Record<string, unknown>);
    return result;
  },

  atualizarLead: (id: string, dados: Partial<Lead>): boolean => {
    const result = localStorageService.atualizarLead(id, dados);
    if (result) {
      queueOperation('update', 'lead', { id, ...dados });
    }
    return result;
  },

  // ========== READ OPERATIONS (no sync needed) ==========
  listarAgendamentos: localStorageService.listarAgendamentos,
  buscarPorId: localStorageService.buscarPorId,
  listarEquipamentos: localStorageService.listarEquipamentos,
  listarAlugueis: localStorageService.listarAlugueis,
  listarLeads: localStorageService.listarLeads,
  listarPedidos: localStorageService.listarPedidos,
  getEstatisticas: localStorageService.getEstatisticas,
  listarClientes: localStorageService.listarClientes,
  
  // Mock initialization
  inicializarMockCompleto: localStorageService.inicializarMockCompleto,
};
