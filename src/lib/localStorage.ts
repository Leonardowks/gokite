export interface Agendamento {
  id: string;
  tipo_aula: 'kitesurf_iniciante' | 'kitesurf_intermediario' | 'kitesurf_avancado' | 'wing_foil' | 'foil' | 'downwind';
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
  tipo: 'kite' | 'wing' | 'barra' | 'prancha_twintip' | 'prancha_kitewave' | 'trapezio' | 'acessorio' | 'wetsuit';
  status: 'disponivel' | 'alugado' | 'manutencao';
  localizacao: 'florianopolis' | 'taiba';
  preco_dia: number;
  preco_venda?: number;
  ultimo_aluguel?: string;
  foto_url?: string;
  tamanho?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
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

export interface PedidoEcommerce {
  id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_whatsapp: string;
  itens: {
    produto_nome: string;
    quantidade: number;
    preco_unitario: number;
    tamanho?: string;
  }[];
  valor_total: number;
  status: 'pendente' | 'pago' | 'separando' | 'enviado' | 'entregue' | 'cancelado';
  endereco_entrega: string;
  frete: number;
  created_at: string;
}

const STORAGE_KEY = 'gokite_aulas';
const EQUIPAMENTOS_KEY = 'gokite_equipamentos';
const ALUGUEIS_KEY = 'gokite_alugueis';
const LEADS_KEY = 'gokite_leads';
const PEDIDOS_KEY = 'gokite_pedidos';

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
        tipo_aula: 'kitesurf_iniciante',
        localizacao: 'florianopolis',
        data: amanha.toISOString(),
        horario: '10:00',
        cliente_nome: 'João Silva',
        cliente_email: 'joao@email.com',
        cliente_whatsapp: '48999887766',
        experiencia: 'nunca',
        status: 'pendente',
        valor: 450,
        created_at: hoje.toISOString(),
      },
      {
        id: 'A002',
        tipo_aula: 'kitesurf_intermediario',
        localizacao: 'taiba',
        data: depoisAmanha.toISOString(),
        horario: '14:00',
        cliente_nome: 'Maria Santos',
        cliente_email: 'maria@email.com',
        cliente_whatsapp: '85988776655',
        experiencia: 'poucas_vezes',
        status: 'confirmada',
        valor: 550,
        created_at: hoje.toISOString(),
      },
      {
        id: 'A003',
        tipo_aula: 'kitesurf_avancado',
        localizacao: 'florianopolis',
        data: tresDias.toISOString(),
        horario: '08:00',
        cliente_nome: 'Pedro Oliveira',
        cliente_email: 'pedro@email.com',
        cliente_whatsapp: '48987654321',
        experiencia: 'experiente',
        status: 'confirmada',
        valor: 650,
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
        valor: 750,
        created_at: hoje.toISOString(),
      },
      {
        id: 'A005',
        tipo_aula: 'kitesurf_iniciante',
        localizacao: 'florianopolis',
        data: hoje.toISOString(),
        horario: '14:00',
        cliente_nome: 'Carlos Mendes',
        cliente_email: 'carlos@email.com',
        cliente_whatsapp: '48998877665',
        experiencia: 'nunca',
        status: 'confirmada',
        valor: 450,
        created_at: hoje.toISOString(),
      },
      {
        id: 'A006',
        tipo_aula: 'foil',
        localizacao: 'florianopolis',
        data: depoisAmanha.toISOString(),
        horario: '10:00',
        cliente_nome: 'Ricardo Almeida',
        cliente_email: 'ricardo@email.com',
        cliente_whatsapp: '48991234567',
        experiencia: 'experiente',
        status: 'pendente',
        valor: 800,
        created_at: hoje.toISOString(),
      },
      {
        id: 'A007',
        tipo_aula: 'downwind',
        localizacao: 'taiba',
        data: tresDias.toISOString(),
        horario: '07:00',
        cliente_nome: 'Fernando Souza',
        cliente_email: 'fernando@email.com',
        cliente_whatsapp: '85987654321',
        experiencia: 'experiente',
        status: 'confirmada',
        valor: 900,
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

  // ========== PEDIDOS E-COMMERCE ==========
  listarPedidos: (): PedidoEcommerce[] => {
    try {
      const data = localStorage.getItem(PEDIDOS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[GoKite-LocalStorage] Erro ao listar pedidos:', error);
      return [];
    }
  },

  salvarPedido: (data: Omit<PedidoEcommerce, 'id' | 'created_at'>): PedidoEcommerce => {
    const pedidos = localStorageService.listarPedidos();
    const novoPedido: PedidoEcommerce = {
      ...data,
      id: `PED${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    pedidos.push(novoPedido);
    localStorage.setItem(PEDIDOS_KEY, JSON.stringify(pedidos));
    return novoPedido;
  },

  atualizarPedido: (id: string, dados: Partial<PedidoEcommerce>): boolean => {
    const pedidos = localStorageService.listarPedidos();
    const index = pedidos.findIndex(p => p.id === id);
    if (index !== -1) {
      pedidos[index] = { ...pedidos[index], ...dados };
      localStorage.setItem(PEDIDOS_KEY, JSON.stringify(pedidos));
      return true;
    }
    return false;
  },

  // ========== INICIALIZAR MOCK COMPLETO ==========
  inicializarMockCompleto: () => {
    localStorageService.inicializarMock();
    
    // Equipamentos Mock - Produtos reais Duotone do site gokite.com.br
    if (!localStorage.getItem(EQUIPAMENTOS_KEY)) {
      const mockEquipamentos: Equipamento[] = [
        // KITES DUOTONE
        { id: 'EQ001', nome: 'Kite Duotone Neo SLS 2026', tipo: 'kite', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 350, preco_venda: 12429, tamanho: '9m', marca: 'Duotone', modelo: 'Neo SLS', ano: 2026, created_at: new Date().toISOString() },
        { id: 'EQ002', nome: 'Kite Duotone Neo SLS 2026', tipo: 'kite', status: 'alugado', localizacao: 'florianopolis', preco_dia: 350, preco_venda: 12429, tamanho: '12m', marca: 'Duotone', modelo: 'Neo SLS', ano: 2026, ultimo_aluguel: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 'EQ003', nome: 'Kite Duotone Dice SLS 2026', tipo: 'kite', status: 'disponivel', localizacao: 'taiba', preco_dia: 380, preco_venda: 13029, tamanho: '10m', marca: 'Duotone', modelo: 'Dice SLS', ano: 2026, created_at: new Date().toISOString() },
        { id: 'EQ004', nome: 'Kite Duotone Rebel SLS 2026', tipo: 'kite', status: 'alugado', localizacao: 'taiba', preco_dia: 380, preco_venda: 13029, tamanho: '11m', marca: 'Duotone', modelo: 'Rebel SLS', ano: 2026, ultimo_aluguel: new Date(Date.now() - 172800000).toISOString(), created_at: new Date().toISOString() },
        { id: 'EQ005', nome: 'Kite Duotone Evo SLS 2025', tipo: 'kite', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 320, preco_venda: 10999, tamanho: '8m', marca: 'Duotone', modelo: 'Evo SLS', ano: 2025, created_at: new Date().toISOString() },
        
        // WINGS DUOTONE
        { id: 'EQ006', nome: 'Wing Duotone Unit SLS 2026', tipo: 'wing', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 250, preco_venda: 8589, tamanho: '5m', marca: 'Duotone', modelo: 'Unit SLS', ano: 2026, created_at: new Date().toISOString() },
        { id: 'EQ007', nome: 'Wing Duotone Unit SLS 2026', tipo: 'wing', status: 'alugado', localizacao: 'taiba', preco_dia: 250, preco_venda: 8589, tamanho: '4m', marca: 'Duotone', modelo: 'Unit SLS', ano: 2026, ultimo_aluguel: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 'EQ008', nome: 'Wing Duotone Unit 2025', tipo: 'wing', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 200, preco_venda: 6299, tamanho: '6m', marca: 'Duotone', modelo: 'Unit', ano: 2025, created_at: new Date().toISOString() },
        
        // BARRAS DUOTONE
        { id: 'EQ009', nome: 'Barra Duotone ClickBar Quad Control', tipo: 'barra', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 100, preco_venda: 5859, tamanho: 'M/22-24', marca: 'Duotone', modelo: 'ClickBar', ano: 2026, created_at: new Date().toISOString() },
        { id: 'EQ010', nome: 'Barra Duotone Trust Bar Quad Control', tipo: 'barra', status: 'disponivel', localizacao: 'taiba', preco_dia: 80, preco_venda: 4299, tamanho: 'M/22-24', marca: 'Duotone', modelo: 'Trust Bar', ano: 2025, created_at: new Date().toISOString() },
        
        // PRANCHAS TWINTIP
        { id: 'EQ011', nome: 'Prancha Duotone Select 2026', tipo: 'prancha_twintip', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 150, preco_venda: 3899, tamanho: '140cm', marca: 'Duotone', modelo: 'Select', ano: 2026, created_at: new Date().toISOString() },
        { id: 'EQ012', nome: 'Prancha Duotone Jaime 2025', tipo: 'prancha_twintip', status: 'alugado', localizacao: 'taiba', preco_dia: 180, preco_venda: 4599, tamanho: '138cm', marca: 'Duotone', modelo: 'Jaime', ano: 2025, ultimo_aluguel: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 'EQ013', nome: 'Prancha Duotone Soleil 2026', tipo: 'prancha_twintip', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 150, preco_venda: 3699, tamanho: '136cm', marca: 'Duotone', modelo: 'Soleil', ano: 2026, created_at: new Date().toISOString() },
        
        // PRANCHAS KITEWAVE/SURFBOARD
        { id: 'EQ014', nome: 'Prancha Duotone Whip SLS 2026', tipo: 'prancha_kitewave', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 200, preco_venda: 5299, tamanho: '5\'4"', marca: 'Duotone', modelo: 'Whip SLS', ano: 2026, created_at: new Date().toISOString() },
        { id: 'EQ015', nome: 'Prancha Duotone Fish SLS 2025', tipo: 'prancha_kitewave', status: 'disponivel', localizacao: 'taiba', preco_dia: 180, preco_venda: 4799, tamanho: '5\'8"', marca: 'Duotone', modelo: 'Fish SLS', ano: 2025, created_at: new Date().toISOString() },
        
        // TRAPÉZIOS
        { id: 'EQ016', nome: 'Trapézio Mystic Majestic X 2025', tipo: 'trapezio', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 60, preco_venda: 1899, tamanho: 'L', marca: 'Mystic', modelo: 'Majestic X', ano: 2025, created_at: new Date().toISOString() },
        { id: 'EQ017', nome: 'Trapézio Mystic Majestic X 2025', tipo: 'trapezio', status: 'manutencao', localizacao: 'florianopolis', preco_dia: 60, preco_venda: 1899, tamanho: 'M', marca: 'Mystic', modelo: 'Majestic X', ano: 2025, created_at: new Date().toISOString() },
        { id: 'EQ018', nome: 'Trapézio Ion Apex Curv 15', tipo: 'trapezio', status: 'disponivel', localizacao: 'taiba', preco_dia: 50, preco_venda: 1599, tamanho: 'M', marca: 'Ion', modelo: 'Apex Curv 15', ano: 2024, created_at: new Date().toISOString() },
        
        // WETSUITS
        { id: 'EQ019', nome: 'Wetsuit Mystic Star 5/4mm', tipo: 'wetsuit', status: 'disponivel', localizacao: 'florianopolis', preco_dia: 40, preco_venda: 899, tamanho: 'L', marca: 'Mystic', modelo: 'Star 5/4mm', ano: 2025, created_at: new Date().toISOString() },
        { id: 'EQ020', nome: 'Wetsuit Mystic Star 3/2mm', tipo: 'wetsuit', status: 'disponivel', localizacao: 'taiba', preco_dia: 35, preco_venda: 699, tamanho: 'M', marca: 'Mystic', modelo: 'Star 3/2mm', ano: 2025, created_at: new Date().toISOString() },
      ];
      localStorage.setItem(EQUIPAMENTOS_KEY, JSON.stringify(mockEquipamentos));
      console.log('[GoKite-LocalStorage] Equipamentos Duotone mock inicializados');
    }

    // Aluguéis Mock
    if (!localStorage.getItem(ALUGUEIS_KEY)) {
      const hoje = new Date();
      const mockAlugueis: Aluguel[] = [
        { id: 'AL001', equipamento_id: 'EQ002', cliente_nome: 'Carlos Mendes', cliente_email: 'carlos@email.com', cliente_whatsapp: '48998877665', data_inicio: new Date(hoje.getTime() - 86400000).toISOString(), data_fim: new Date(hoje.getTime() + 86400000).toISOString(), valor_total: 700, status: 'ativo', created_at: new Date(hoje.getTime() - 86400000).toISOString() },
        { id: 'AL002', equipamento_id: 'EQ004', cliente_nome: 'Ana Costa', cliente_email: 'ana@email.com', cliente_whatsapp: '85999112233', data_inicio: new Date(hoje.getTime() - 172800000).toISOString(), data_fim: hoje.toISOString(), valor_total: 760, status: 'ativo', created_at: new Date(hoje.getTime() - 172800000).toISOString() },
        { id: 'AL003', equipamento_id: 'EQ007', cliente_nome: 'Roberto Lima', cliente_email: 'roberto@email.com', cliente_whatsapp: '85987654321', data_inicio: new Date(hoje.getTime() - 43200000).toISOString(), data_fim: new Date(hoje.getTime() + 172800000).toISOString(), valor_total: 750, status: 'ativo', created_at: new Date(hoje.getTime() - 43200000).toISOString() },
        { id: 'AL004', equipamento_id: 'EQ012', cliente_nome: 'Fernanda Silva', cliente_email: 'fernanda@email.com', cliente_whatsapp: '48991234567', data_inicio: new Date(hoje.getTime() - 259200000).toISOString(), data_fim: new Date(hoje.getTime() + 86400000).toISOString(), valor_total: 720, status: 'ativo', created_at: new Date(hoje.getTime() - 259200000).toISOString() },
      ];
      localStorage.setItem(ALUGUEIS_KEY, JSON.stringify(mockAlugueis));
      console.log('[GoKite-LocalStorage] Aluguéis mock inicializados');
    }

    // Leads Mock
    if (!localStorage.getItem(LEADS_KEY)) {
      const hoje = new Date();
      const mockLeads: Lead[] = [
        { id: 'L001', nome: 'Roberto Silva', email: 'roberto@email.com', whatsapp: '48991234567', visitas: 5, ultima_visita: new Date(hoje.getTime() - 3600000).toISOString(), interesse: 'Kite Duotone Neo SLS', score: 'urgente', status: 'novo', created_at: new Date(hoje.getTime() - 172800000).toISOString() },
        { id: 'L002', nome: 'Fernanda Oliveira', email: 'fernanda@email.com', whatsapp: '85987654321', visitas: 4, ultima_visita: new Date(hoje.getTime() - 86400000).toISOString(), interesse: 'Wing Duotone Unit SLS', score: 'urgente', status: 'novo', created_at: new Date(hoje.getTime() - 259200000).toISOString() },
        { id: 'L003', nome: 'Lucas Santos', email: 'lucas@email.com', whatsapp: '48999887766', visitas: 2, ultima_visita: new Date(hoje.getTime() - 172800000).toISOString(), interesse: 'Aula Kitesurf Iniciante', score: 'quente', status: 'novo', created_at: new Date(hoje.getTime() - 345600000).toISOString() },
        { id: 'L004', nome: 'Juliana Costa', email: 'juliana@email.com', whatsapp: '85988776655', visitas: 2, ultima_visita: new Date(hoje.getTime() - 259200000).toISOString(), interesse: 'Prancha Duotone Select', score: 'quente', status: 'novo', created_at: new Date(hoje.getTime() - 432000000).toISOString() },
        { id: 'L005', nome: 'Marcos Lima', email: 'marcos@email.com', whatsapp: '48987654321', visitas: 1, ultima_visita: new Date(hoje.getTime() - 604800000).toISOString(), interesse: 'Aula Wing Foil', score: 'morno', status: 'novo', created_at: new Date(hoje.getTime() - 604800000).toISOString() },
        { id: 'L006', nome: 'Carolina Ferreira', email: 'carolina@email.com', whatsapp: '85999998888', visitas: 3, ultima_visita: new Date(hoje.getTime() - 43200000).toISOString(), interesse: 'Trapézio Mystic', score: 'quente', status: 'contatado', created_at: new Date(hoje.getTime() - 518400000).toISOString() },
      ];
      localStorage.setItem(LEADS_KEY, JSON.stringify(mockLeads));
      console.log('[GoKite-LocalStorage] Leads mock inicializados');
    }

    // Pedidos E-commerce Mock
    if (!localStorage.getItem(PEDIDOS_KEY)) {
      const hoje = new Date();
      const mockPedidos: PedidoEcommerce[] = [
        { 
          id: 'PED001', 
          cliente_nome: 'André Martins', 
          cliente_email: 'andre@email.com', 
          cliente_whatsapp: '48999112233',
          itens: [
            { produto_nome: 'Kite Duotone Neo SLS 2026', quantidade: 1, preco_unitario: 12429, tamanho: '10m' }
          ],
          valor_total: 12429,
          status: 'pago',
          endereco_entrega: 'Rua das Flores, 123 - Florianópolis/SC',
          frete: 0,
          created_at: new Date(hoje.getTime() - 86400000).toISOString()
        },
        { 
          id: 'PED002', 
          cliente_nome: 'Patrícia Souza', 
          cliente_email: 'patricia@email.com', 
          cliente_whatsapp: '85988887777',
          itens: [
            { produto_nome: 'Wing Duotone Unit SLS 2026', quantidade: 1, preco_unitario: 8589, tamanho: '5m' },
            { produto_nome: 'Trapézio Mystic Majestic X 2025', quantidade: 1, preco_unitario: 1899, tamanho: 'M' }
          ],
          valor_total: 10488,
          status: 'separando',
          endereco_entrega: 'Av. Beira Mar, 456 - Fortaleza/CE',
          frete: 0,
          created_at: new Date(hoje.getTime() - 172800000).toISOString()
        },
        { 
          id: 'PED003', 
          cliente_nome: 'Gustavo Pereira', 
          cliente_email: 'gustavo@email.com', 
          cliente_whatsapp: '48997776655',
          itens: [
            { produto_nome: 'Barra Duotone ClickBar Quad Control', quantidade: 1, preco_unitario: 5859, tamanho: 'M/22-24' }
          ],
          valor_total: 5859,
          status: 'enviado',
          endereco_entrega: 'Rua do Comércio, 789 - Joinville/SC',
          frete: 0,
          created_at: new Date(hoje.getTime() - 259200000).toISOString()
        },
        { 
          id: 'PED004', 
          cliente_nome: 'Mariana Alves', 
          cliente_email: 'mariana@email.com', 
          cliente_whatsapp: '85996665544',
          itens: [
            { produto_nome: 'Prancha Duotone Select 2026', quantidade: 1, preco_unitario: 3899, tamanho: '140cm' },
            { produto_nome: 'Wetsuit Mystic Star 3/2mm', quantidade: 1, preco_unitario: 699, tamanho: 'M' }
          ],
          valor_total: 4598,
          status: 'pendente',
          endereco_entrega: 'Rua da Praia, 321 - Aracati/CE',
          frete: 0,
          created_at: new Date(hoje.getTime() - 43200000).toISOString()
        },
        { 
          id: 'PED005', 
          cliente_nome: 'Rafael Costa', 
          cliente_email: 'rafael@email.com', 
          cliente_whatsapp: '48993334455',
          itens: [
            { produto_nome: 'Kite Duotone Dice SLS 2026', quantidade: 1, preco_unitario: 13029, tamanho: '9m' }
          ],
          valor_total: 13029,
          status: 'entregue',
          endereco_entrega: 'Av. Atlântica, 567 - Balneário Camboriú/SC',
          frete: 0,
          created_at: new Date(hoje.getTime() - 604800000).toISOString()
        },
      ];
      localStorage.setItem(PEDIDOS_KEY, JSON.stringify(mockPedidos));
      console.log('[GoKite-LocalStorage] Pedidos E-commerce mock inicializados');
    }
  },
};
