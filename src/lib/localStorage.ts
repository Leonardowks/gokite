export interface Agendamento {
  id: string;
  tipo_aula: 'iniciante' | 'intermediario' | 'avancado' | 'wing_foil';
  localizacao: 'florianopolis' | 'taiba';
  data: string; // ISO format
  horario: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_whatsapp: string;
  experiencia: 'nunca' | 'poucas_vezes' | 'experiente';
  status: 'pendente' | 'confirmada' | 'cancelada';
  valor: number;
  created_at: string;
}

export interface ClienteAgregado {
  nome: string;
  email: string;
  whatsapp: string;
  total_aulas: number;
  ultima_aula: string;
}

const STORAGE_KEY = 'gokite_aulas';

export const localStorageService = {
  // Salvar agendamento
  salvarAgendamento: (data: Omit<Agendamento, 'id' | 'created_at'>): Agendamento => {
    const agendamentos = localStorageService.listarAgendamentos();
    const novoAgendamento: Agendamento = {
      ...data,
      id: `A${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    agendamentos.push(novoAgendamento);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agendamentos));
    console.log('[GoKite-LocalStorage] Agendamento salvo:', novoAgendamento);
    return novoAgendamento;
  },

  // Listar agendamentos
  listarAgendamentos: (): Agendamento[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[GoKite-LocalStorage] Erro ao listar:', error);
      return [];
    }
  },

  // Buscar por ID
  buscarPorId: (id: string): Agendamento | undefined => {
    const agendamentos = localStorageService.listarAgendamentos();
    return agendamentos.find(a => a.id === id);
  },

  // Atualizar status
  atualizarStatus: (id: string, status: Agendamento['status']): boolean => {
    const agendamentos = localStorageService.listarAgendamentos();
    const index = agendamentos.findIndex(a => a.id === id);
    if (index !== -1) {
      agendamentos[index].status = status;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agendamentos));
      console.log('[GoKite-LocalStorage] Status atualizado:', id, status);
      return true;
    }
    return false;
  },

  // Deletar agendamento
  deletarAgendamento: (id: string): boolean => {
    const agendamentos = localStorageService.listarAgendamentos();
    const filtered = agendamentos.filter(a => a.id !== id);
    if (filtered.length < agendamentos.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log('[GoKite-LocalStorage] Agendamento deletado:', id);
      return true;
    }
    return false;
  },

  // Inicializar dados mock
  inicializarMock: () => {
    if (localStorage.getItem(STORAGE_KEY)) {
      console.log('[GoKite-LocalStorage] Dados já existem, pulando inicialização');
      return;
    }

    const hoje = new Date();
    const amanha = new Date(hoje.getTime() + 86400000);
    const depoisAmanha = new Date(hoje.getTime() + 172800000);
    const tresDias = new Date(hoje.getTime() + 259200000);

    const mockAulas: Agendamento[] = [
      {
        id: 'A001',
        tipo_aula: 'iniciante',
        localizacao: 'florianopolis',
        data: amanha.toISOString(),
        horario: '10:00',
        cliente_nome: 'João Silva',
        cliente_email: 'joao@email.com',
        cliente_whatsapp: '48999887766',
        experiencia: 'nunca',
        status: 'pendente',
        valor: 400,
        created_at: hoje.toISOString(),
      },
      {
        id: 'A002',
        tipo_aula: 'intermediario',
        localizacao: 'taiba',
        data: depoisAmanha.toISOString(),
        horario: '14:00',
        cliente_nome: 'Maria Santos',
        cliente_email: 'maria@email.com',
        cliente_whatsapp: '85988776655',
        experiencia: 'poucas_vezes',
        status: 'confirmada',
        valor: 500,
        created_at: hoje.toISOString(),
      },
      {
        id: 'A003',
        tipo_aula: 'avancado',
        localizacao: 'florianopolis',
        data: tresDias.toISOString(),
        horario: '08:00',
        cliente_nome: 'Pedro Oliveira',
        cliente_email: 'pedro@email.com',
        cliente_whatsapp: '48987654321',
        experiencia: 'experiente',
        status: 'confirmada',
        valor: 600,
        created_at: hoje.toISOString(),
      },
      {
        id: 'A004',
        tipo_aula: 'wing_foil',
        localizacao: 'taiba',
        data: amanha.toISOString(),
        horario: '16:00',
        cliente_nome: 'Ana Costa',
        cliente_email: 'ana@email.com',
        cliente_whatsapp: '85999112233',
        experiencia: 'poucas_vezes',
        status: 'pendente',
        valor: 700,
        created_at: hoje.toISOString(),
      },
      {
        id: 'A005',
        tipo_aula: 'iniciante',
        localizacao: 'florianopolis',
        data: hoje.toISOString(),
        horario: '14:00',
        cliente_nome: 'Carlos Mendes',
        cliente_email: 'carlos@email.com',
        cliente_whatsapp: '48998877665',
        experiencia: 'nunca',
        status: 'confirmada',
        valor: 400,
        created_at: hoje.toISOString(),
      },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockAulas));
    console.log('[GoKite-LocalStorage] Mock data inicializado:', mockAulas.length, 'aulas');
  },

  // Listar clientes únicos com dados agregados
  listarClientes: (): ClienteAgregado[] => {
    const agendamentos = localStorageService.listarAgendamentos();
    const clientesMap = new Map<string, ClienteAgregado>();

    agendamentos.forEach(aula => {
      if (!clientesMap.has(aula.cliente_email)) {
        clientesMap.set(aula.cliente_email, {
          nome: aula.cliente_nome,
          email: aula.cliente_email,
          whatsapp: aula.cliente_whatsapp,
          total_aulas: 0,
          ultima_aula: aula.data,
        });
      }
      const cliente = clientesMap.get(aula.cliente_email)!;
      cliente.total_aulas++;
      if (new Date(aula.data) > new Date(cliente.ultima_aula)) {
        cliente.ultima_aula = aula.data;
      }
    });

    return Array.from(clientesMap.values()).sort((a, b) => 
      new Date(b.ultima_aula).getTime() - new Date(a.ultima_aula).getTime()
    );
  },

  // Estatísticas para dashboard
  getEstatisticas: () => {
    const agendamentos = localStorageService.listarAgendamentos();
    const hoje = new Date().toISOString().split('T')[0];

    const aulasHoje = agendamentos.filter(a => a.data.startsWith(hoje));
    const receitaHoje = aulasHoje.reduce((sum, a) => sum + a.valor, 0);
    const aulasPendentes = agendamentos.filter(a => a.status === 'pendente');

    return {
      aulasHoje: aulasHoje.length,
      receitaHoje,
      aulasPendentes: aulasPendentes.length,
    };
  },
};
