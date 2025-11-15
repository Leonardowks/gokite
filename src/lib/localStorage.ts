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

export interface Equipamento {
  id: string;
  nome: string;
  tipo: 'prancha' | 'asa' | 'trapezio' | 'colete' | 'wetsuit';
  status: 'disponivel' | 'alugado' | 'manutencao';
  localizacao: 'florianopolis' | 'taiba';
  preco_dia: number;
  ultimo_aluguel?: string;
  foto_url?: string;
  tamanho?: string;
  created_at: string;
}

export interface Aluguel {
  id: string;
  equipamento_id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_whatsapp: string;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  status: 'ativo' | 'concluido' | 'atrasado';
  created_at: string;
}

export interface Lead {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  visitas: number;
  ultima_visita: string;
  interesse: string;
  score: 'urgente' | 'quente' | 'morno';
  status: 'novo' | 'contatado' | 'convertido';
  created_at: string;
}

const STORAGE_KEY = 'gokite_aulas';
const EQUIPAMENTOS_KEY = 'gokite_equipamentos';
const ALUGUEIS_KEY = 'gokite_alugueis';
const LEADS_KEY = 'gokite_leads';

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

  // Atualizar agendamento completo
  atualizarAgendamento: (id: string, dadosAtualizados: Agendamento): boolean => {
    const agendamentos = localStorageService.listarAgendamentos();
    const index = agendamentos.findIndex(a => a.id === id);
    if (index !== -1) {
      agendamentos[index] = { ...agendamentos[index], ...dadosAtualizados };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agendamentos));
      console.log('[GoKite-LocalStorage] Agendamento atualizado:', id);
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

  // ========== EQUIPAMENTOS ==========
  listarEquipamentos: (): Equipamento[] => {
    try {
      const data = localStorage.getItem(EQUIPAMENTOS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[GoKite-LocalStorage] Erro ao listar equipamentos:', error);
      return [];
    }
  },

  salvarEquipamento: (data: Omit<Equipamento, 'id' | 'created_at'>): Equipamento => {
    const equipamentos = localStorageService.listarEquipamentos();
    const novoEquipamento: Equipamento = {
      ...data,
      id: `EQ${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    equipamentos.push(novoEquipamento);
    localStorage.setItem(EQUIPAMENTOS_KEY, JSON.stringify(equipamentos));
    return novoEquipamento;
  },

  atualizarEquipamento: (id: string, dados: Partial<Equipamento>): boolean => {
    const equipamentos = localStorageService.listarEquipamentos();
    const index = equipamentos.findIndex(e => e.id === id);
    if (index !== -1) {
      equipamentos[index] = { ...equipamentos[index], ...dados };
      localStorage.setItem(EQUIPAMENTOS_KEY, JSON.stringify(equipamentos));
      return true;
    }
    return false;
  },

  // ========== ALUGUÉIS ==========
  listarAlugueis: (): Aluguel[] => {
    try {
      const data = localStorage.getItem(ALUGUEIS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[GoKite-LocalStorage] Erro ao listar aluguéis:', error);
      return [];
    }
  },

  salvarAluguel: (data: Omit<Aluguel, 'id' | 'created_at'>): Aluguel => {
    const alugueis = localStorageService.listarAlugueis();
    const novoAluguel: Aluguel = {
      ...data,
      id: `AL${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    alugueis.push(novoAluguel);
    localStorage.setItem(ALUGUEIS_KEY, JSON.stringify(alugueis));
    
    // Atualizar status do equipamento
    localStorageService.atualizarEquipamento(data.equipamento_id, { 
      status: 'alugado',
      ultimo_aluguel: new Date().toISOString()
    });
    
    return novoAluguel;
  },

  finalizarAluguel: (id: string): boolean => {
    const alugueis = localStorageService.listarAlugueis();
    const index = alugueis.findIndex(a => a.id === id);
    if (index !== -1) {
      const aluguel = alugueis[index];
      alugueis[index].status = 'concluido';
      localStorage.setItem(ALUGUEIS_KEY, JSON.stringify(alugueis));
      
      // Liberar equipamento
      localStorageService.atualizarEquipamento(aluguel.equipamento_id, { status: 'disponivel' });
      return true;
    }
    return false;
  },

  // ========== LEADS ==========
  listarLeads: (): Lead[] => {
    try {
      const data = localStorage.getItem(LEADS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[GoKite-LocalStorage] Erro ao listar leads:', error);
      return [];
    }
  },

  salvarLead: (data: Omit<Lead, 'id' | 'created_at'>): Lead => {
    const leads = localStorageService.listarLeads();
    const novoLead: Lead = {
      ...data,
      id: `L${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    leads.push(novoLead);
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
    return novoLead;
  },

  atualizarLead: (id: string, dados: Partial<Lead>): boolean => {
    const leads = localStorageService.listarLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index !== -1) {
      leads[index] = { ...leads[index], ...dados };
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
      return true;
    }
    return false;
  },

  // ========== INICIALIZAR MOCK COMPLETO ==========
  inicializarMockCompleto: () => {
    localStorageService.inicializarMock();
    
    // Equipamentos Mock
    if (!localStorage.getItem(EQUIPAMENTOS_KEY)) {
      const mockEquipamentos: Equipamento[] = [
        { id: 'EQ001', nome: 'Prancha North 135cm', tipo: 'prancha', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 150, tamanho: '135cm', created_at: new Date().toISOString() },
        { id: 'EQ002', nome: 'Prancha Cabrinha 140cm', tipo: 'prancha', status: 'alugado', localizacao: 'florianopolis', preco_dia: 180, tamanho: '140cm', ultimo_aluguel: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 'EQ003', nome: 'Asa Duotone 9m', tipo: 'asa', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 200, tamanho: '9m', created_at: new Date().toISOString() },
        { id: 'EQ004', nome: 'Asa North 12m', tipo: 'asa', status: 'alugado', localizacao: 'taiba', preco_dia: 220, tamanho: '12m', ultimo_aluguel: new Date(Date.now() - 172800000).toISOString(), created_at: new Date().toISOString() },
        { id: 'EQ005', nome: 'Trapézio Mystic L', tipo: 'trapezio', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 50, tamanho: 'L', created_at: new Date().toISOString() },
        { id: 'EQ006', nome: 'Trapézio Ion M', tipo: 'trapezio', status: 'manutencao', localizacao: 'florianopolis', preco_dia: 50, tamanho: 'M', created_at: new Date().toISOString() },
        { id: 'EQ007', nome: 'Prancha F-One 145cm', tipo: 'prancha', status: 'disponivel', localizacao: 'taiba', preco_dia: 170, tamanho: '145cm', created_at: new Date().toISOString() },
        { id: 'EQ008', nome: 'Asa Ozone 10m', tipo: 'asa', status: 'disponivel', localizacao: 'taiba', preco_dia: 210, tamanho: '10m', created_at: new Date().toISOString() },
      ];
      localStorage.setItem(EQUIPAMENTOS_KEY, JSON.stringify(mockEquipamentos));
      console.log('[GoKite-LocalStorage] Equipamentos mock inicializados');
    }

    // Aluguéis Mock
    if (!localStorage.getItem(ALUGUEIS_KEY)) {
      const hoje = new Date();
      const mockAlugueis: Aluguel[] = [
        { id: 'AL001', equipamento_id: 'EQ002', cliente_nome: 'Carlos Mendes', cliente_email: 'carlos@email.com', cliente_whatsapp: '48998877665', data_inicio: new Date(hoje.getTime() - 86400000).toISOString(), data_fim: new Date(hoje.getTime() + 86400000).toISOString(), valor_total: 360, status: 'ativo', created_at: new Date(hoje.getTime() - 86400000).toISOString() },
        { id: 'AL002', equipamento_id: 'EQ004', cliente_nome: 'Ana Costa', cliente_email: 'ana@email.com', cliente_whatsapp: '85999112233', data_inicio: new Date(hoje.getTime() - 172800000).toISOString(), data_fim: hoje.toISOString(), valor_total: 440, status: 'ativo', created_at: new Date(hoje.getTime() - 172800000).toISOString() },
      ];
      localStorage.setItem(ALUGUEIS_KEY, JSON.stringify(mockAlugueis));
      console.log('[GoKite-LocalStorage] Aluguéis mock inicializados');
    }

    // Leads Mock
    if (!localStorage.getItem(LEADS_KEY)) {
      const hoje = new Date();
      const mockLeads: Lead[] = [
        { id: 'L001', nome: 'Roberto Silva', email: 'roberto@email.com', whatsapp: '48991234567', visitas: 5, ultima_visita: new Date(hoje.getTime() - 3600000).toISOString(), interesse: 'Aula Wing Foil', score: 'urgente', status: 'novo', created_at: new Date(hoje.getTime() - 172800000).toISOString() },
        { id: 'L002', nome: 'Fernanda Oliveira', email: 'fernanda@email.com', whatsapp: '85987654321', visitas: 3, ultima_visita: new Date(hoje.getTime() - 86400000).toISOString(), interesse: 'Prancha 140cm', score: 'urgente', status: 'novo', created_at: new Date(hoje.getTime() - 259200000).toISOString() },
        { id: 'L003', nome: 'Lucas Santos', email: 'lucas@email.com', whatsapp: '48999887766', visitas: 2, ultima_visita: new Date(hoje.getTime() - 172800000).toISOString(), interesse: 'Aula Iniciante', score: 'quente', status: 'novo', created_at: new Date(hoje.getTime() - 345600000).toISOString() },
        { id: 'L004', nome: 'Juliana Costa', email: 'juliana@email.com', whatsapp: '85988776655', visitas: 2, ultima_visita: new Date(hoje.getTime() - 259200000).toISOString(), interesse: 'Aluguel Trapézio', score: 'quente', status: 'novo', created_at: new Date(hoje.getTime() - 432000000).toISOString() },
        { id: 'L005', nome: 'Marcos Lima', email: 'marcos@email.com', whatsapp: '48987654321', visitas: 1, ultima_visita: new Date(hoje.getTime() - 604800000).toISOString(), interesse: 'Wing Foil', score: 'morno', status: 'novo', created_at: new Date(hoje.getTime() - 604800000).toISOString() },
      ];
      localStorage.setItem(LEADS_KEY, JSON.stringify(mockLeads));
      console.log('[GoKite-LocalStorage] Leads mock inicializados');
    }
  },
};
