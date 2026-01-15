import { 
  DollarSign, 
  Zap, 
  Link, 
  Map, 
  HelpCircle,
  GraduationCap,
  ShoppingCart,
  RefreshCw,
  CreditCard,
  Calculator,
  UserCheck,
  Wallet,
  MessageSquare,
  Store,
  Brain,
  LayoutDashboard,
  TrendingUp,
  Users,
  Package,
  MessageCircle,
  Cloud,
  CloudCog,
  PackagePlus,
  RefreshCcw,
  Percent,
  Recycle,
  ClipboardCheck,
  AlertTriangle,
  Shield,
  ShoppingBag
} from "lucide-react";

export interface FlowStep {
  text: string;
  isAutomatic?: boolean;
}

export interface CommercialFlow {
  id: string;
  nome: string;
  icone: typeof DollarSign;
  descricao: string;
  passos: FlowStep[];
  automacoes: string[];
}

export interface Automation {
  id: string;
  nome: string;
  icone: typeof Zap;
  quando: string;
  como: string;
  resultado: string;
}

export interface Integration {
  id: string;
  nome: string;
  icone: typeof Link;
  funcao: string;
  configuracao: string;
  funcionalidades: string[];
  status?: "ativo" | "configurar" | "opcional";
}

export interface SystemArea {
  pagina: string;
  nome: string;
  icone: typeof LayoutDashboard;
  oqueVoceVe: string[];
  acaoRapida: string;
}

export interface FAQItem {
  id: string;
  pergunta: string;
  resposta: string;
  categoria: string;
}

export interface HelpCategory {
  id: string;
  titulo: string;
  icone: typeof DollarSign;
  descricao: string;
  cor: string;
}

// ============ CATEGORIAS PRINCIPAIS ============
export const helpCategories: HelpCategory[] = [
  {
    id: "dinamica",
    titulo: "Dinâmica Comercial",
    icone: DollarSign,
    descricao: "Como cada venda vira lucro no seu bolso",
    cor: "text-emerald-500"
  },
  {
    id: "automacoes",
    titulo: "Automações",
    icone: Zap,
    descricao: "O que o sistema faz sozinho",
    cor: "text-amber-500"
  },
  {
    id: "integracoes",
    titulo: "Integrações",
    icone: Link,
    descricao: "WhatsApp, Nuvemshop, IA",
    cor: "text-blue-500"
  },
  {
    id: "mapa",
    titulo: "Onde Encontrar",
    icone: Map,
    descricao: "Mapa do sistema",
    cor: "text-purple-500"
  },
  {
    id: "faq",
    titulo: "Perguntas Frequentes",
    icone: HelpCircle,
    descricao: "FAQ rápido",
    cor: "text-cyan-500"
  }
];

// ============ DINÂMICA COMERCIAL ============
export const commercialFlows: CommercialFlow[] = [
  {
    id: "aula",
    nome: "Venda de Aula",
    icone: GraduationCap,
    descricao: "Do agendamento ao lucro",
    passos: [
      { text: "Cliente agenda aula (site ou WhatsApp)" },
      { text: "Você confirma no sistema" },
      { text: "Transação criada", isAutomatic: true },
      { text: "Cliente vira 'aluno'", isAutomatic: true },
      { text: "Taxas e impostos calculados", isAutomatic: true },
      { text: "Lucro líquido atualizado", isAutomatic: true }
    ],
    automacoes: ["taxa_cartao", "imposto", "status_cliente", "whatsapp_confirmacao"]
  },
  {
    id: "produto",
    nome: "Venda de Produto",
    icone: ShoppingCart,
    descricao: "Loja física ou e-commerce",
    passos: [
      { text: "Você registra a venda em /vendas" },
      { text: "Informa custo do produto" },
      { text: "Margem calculada", isAutomatic: true },
      { text: "Taxa + imposto provisionados", isAutomatic: true },
      { text: "Lucro real no DRE", isAutomatic: true }
    ],
    automacoes: ["margem", "taxa_cartao", "imposto"]
  },
  {
    id: "tradein",
    nome: "Trade-in (Usado)",
    icone: RefreshCw,
    descricao: "Equipamento usado vira crédito",
    passos: [
      { text: "Cliente traz equipamento" },
      { text: "Você registra valor do crédito" },
      { text: "Store Credit no cadastro", isAutomatic: true },
      { text: "Cliente usa crédito em compras" },
      { text: "Desconto aplicado", isAutomatic: true },
      { text: "Ao vender o trade-in: lucro registrado" }
    ],
    automacoes: ["store_credit", "desconto_automatico"]
  },
  {
    id: "aluguel",
    nome: "Aluguel de Equipamento",
    icone: Package,
    descricao: "Locação e devolução",
    passos: [
      { text: "Você registra o aluguel" },
      { text: "Equipamento fica 'alugado'", isAutomatic: true },
      { text: "Alerta de devolução", isAutomatic: true },
      { text: "Na devolução: transação criada", isAutomatic: true }
    ],
    automacoes: ["status_equipamento", "alerta_devolucao"]
  },
  {
    id: "sob_encomenda",
    nome: "Venda Sob Encomenda",
    icone: Cloud,
    descricao: "Vender produto do fornecedor sem ter em estoque",
    passos: [
      { text: "Cliente escolhe produto do catálogo Duotone" },
      { text: "Você registra venda com prazo de entrega" },
      { text: "Margem calculada automaticamente", isAutomatic: true },
      { text: "Pedido feito ao fornecedor" },
      { text: "Produto chega e vai direto ao cliente" },
      { text: "Taxas e impostos calculados", isAutomatic: true }
    ],
    automacoes: ["margem", "taxa_cartao", "imposto", "sync_fornecedor"]
  },
  {
    id: "trazer_loja",
    nome: "Trazer para Loja",
    icone: PackagePlus,
    descricao: "Converter produto virtual em estoque físico",
    passos: [
      { text: "Você faz pedido ao fornecedor Duotone" },
      { text: "Seleciona produto em Sob Encomenda → Meus Virtuais" },
      { text: "Clica 'Trazer para Loja'" },
      { text: "Escolhe localização física (Floripa/Taíba)" },
      { text: "Produto aparece em Minha Loja", isAutomatic: true },
      { text: "Disponível para venda ou aluguel imediato" }
    ],
    automacoes: ["localizacao_fisica", "status_disponivel"]
  },
  {
    id: "contagem_fisica",
    nome: "Contagem Física (Inventário)",
    icone: ClipboardCheck,
    descricao: "Conferir estoque real com scanner",
    passos: [
      { text: "Clique em 'Iniciar Contagem'" },
      { text: "Escaneie cada produto com o celular" },
      { text: "Sistema registra quantidade contada", isAutomatic: true },
      { text: "Divergências detectadas automaticamente", isAutomatic: true },
      { text: "Aplique ajustes ou investigue a diferença" },
      { text: "Histórico salvo para auditoria", isAutomatic: true }
    ],
    automacoes: ["deteccao_divergencia", "historico_movimentacao"]
  },
  {
    id: "sync_nuvemshop",
    nome: "Sincronização de Estoque Nuvemshop",
    icone: RefreshCw,
    descricao: "Lovable é a fonte da verdade para o estoque",
    passos: [
      { text: "Você recebe mercadoria ou faz venda" },
      { text: "Estoque físico atualizado no sistema" },
      { text: "Buffer de segurança calculado", isAutomatic: true },
      { text: "Estoque enviado para Nuvemshop", isAutomatic: true },
      { text: "Se estoque = 0, produto indisponível no site", isAutomatic: true },
      { text: "Prazo de entrega ajustado (3 ou 8 dias)", isAutomatic: true }
    ],
    automacoes: ["buffer_seguranca", "sync_estoque", "prazo_entrega"]
  }
];

// ============ AUTOMAÇÕES ============
export const automations: Automation[] = [
  {
    id: "taxa_cartao",
    nome: "Cálculo de Taxas de Cartão",
    icone: CreditCard,
    quando: "Ao registrar qualquer receita",
    como: "Usa taxas configuradas em /financeiro/configuracoes",
    resultado: "Taxa estimada descontada do lucro líquido"
  },
  {
    id: "imposto",
    nome: "Provisão de Impostos",
    icone: Calculator,
    quando: "Ao registrar receita",
    como: "Aplica % do Simples Nacional (configurável)",
    resultado: "Imposto provisionado aparece no DRE"
  },
  {
    id: "lead_aluno",
    nome: "Conversão Lead → Aluno",
    icone: UserCheck,
    quando: "Aula confirmada ou venda realizada",
    como: "Sistema atualiza status automaticamente",
    resultado: "Cliente aparece como 'aluno' no CRM"
  },
  {
    id: "store_credit",
    nome: "Store Credit",
    icone: Wallet,
    quando: "Trade-in registrado com cliente",
    como: "Valor vira crédito na ficha do cliente",
    resultado: "Cliente pode usar em próximas compras"
  },
  {
    id: "whatsapp_auto",
    nome: "Notificação WhatsApp",
    icone: MessageSquare,
    quando: "Store credit usado / Aula confirmada",
    como: "Mensagem automática via Evolution API",
    resultado: "Cliente recebe confirmação no WhatsApp"
  },
  {
    id: "sync_ecommerce",
    nome: "Sincronização E-commerce",
    icone: Store,
    quando: "Pedido pago na Nuvemshop",
    como: "Webhook recebe e cria transação",
    resultado: "Venda online aparece no financeiro"
  },
  {
    id: "sync_fornecedor",
    nome: "Sincronização de Fornecedor",
    icone: RefreshCcw,
    quando: "Ao clicar 'Sincronizar' em Sob Encomenda",
    como: "Baixa planilha Duotone e atualiza catálogo",
    resultado: "Produtos disponíveis para venda sob encomenda"
  },
  {
    id: "margem_automatica",
    nome: "Margem Automática",
    icone: Percent,
    quando: "Ao importar produto do fornecedor",
    como: "Aplica margem configurável (padrão 40%)",
    resultado: "Preço de venda sugerido calculado"
  },
  {
    id: "deteccao_divergencia",
    nome: "Detecção de Divergência",
    icone: AlertTriangle,
    quando: "Durante contagem física",
    como: "Compara quantidade escaneada vs sistema",
    resultado: "Alerta visual e opção de ajuste automático"
  },
  {
    id: "buffer_seguranca",
    nome: "Buffer de Segurança (Regra de Ouro)",
    icone: Shield,
    quando: "Ao sincronizar estoque com Nuvemshop",
    como: "Se fornecedor tem 1 unidade → buffer = 0. Se tem mais → buffer = quantidade - 1",
    resultado: "Site nunca vende última peça do fornecedor"
  },
  {
    id: "alerta_compra",
    nome: "Alerta de Compra ao Fornecedor",
    icone: ShoppingBag,
    quando: "Pedido Nuvemshop contém item do catálogo virtual",
    como: "Sistema detecta produto vinculado a supplier_catalog",
    resultado: "Alerta criado em Estoque → Alertas de Compra"
  },
  {
    id: "sync_estoque",
    nome: "Sincronização Automática de Estoque",
    icone: RefreshCcw,
    quando: "Entrada, saída ou ajuste de estoque",
    como: "Calcula Estoque Site = Físico + Virtual Seguro",
    resultado: "Nuvemshop atualizada em tempo real"
  }
];

// ============ INTEGRAÇÕES ============
export const integrations: Integration[] = [
  {
    id: "whatsapp",
    nome: "WhatsApp (Evolution API)",
    icone: MessageCircle,
    funcao: "Receber e enviar mensagens",
    configuracao: "/configuracoes → WhatsApp",
    funcionalidades: [
      "Sincronizar conversas",
      "Enviar confirmações automáticas",
      "Publicar trade-ins no Status",
      "Analisar leads com IA"
    ],
    status: "configurar"
  },
  {
    id: "nuvemshop",
    nome: "Nuvemshop",
    icone: Store,
    funcao: "Integrar loja online com estoque unificado",
    configuracao: "/configuracoes → Integrações",
    funcionalidades: [
      "Sincronizar pedidos automaticamente",
      "Atualizar estoque com buffer de segurança",
      "Criar transações automáticas",
      "Calcular lucro líquido por pedido",
      "Alertas de compra ao fornecedor",
      "Webhook protegido com secret"
    ],
    status: "opcional"
  },
  {
    id: "ia",
    nome: "IA de Análise",
    icone: Brain,
    funcao: "Inteligência artificial",
    configuracao: "Automático",
    funcionalidades: [
      "Analisar fotos de equipamentos",
      "Classificar leads por urgência",
      "Extrair dados de notas fiscais",
      "Processar comandos de voz"
    ],
    status: "ativo"
  },
  {
    id: "duotone",
    nome: "Duotone (Fornecedor Virtual)",
    icone: CloudCog,
    funcao: "Sincronizar catálogo de fornecedor",
    configuracao: "/estoque/sob-encomenda → Sincronizar",
    funcionalidades: [
      "Importar catálogo via Google Sheets",
      "Calcular margem de 40% automaticamente",
      "Estoque virtual sem investimento",
      "Trazer produtos para loja física",
      "Venda sob encomenda com prazo"
    ],
    status: "ativo"
  }
];

// ============ MAPA DO SISTEMA ============
export const systemAreas: SystemArea[] = [
  {
    pagina: "/",
    nome: "Dashboard",
    icone: LayoutDashboard,
    oqueVoceVe: ["Aulas pendentes", "Aluguéis vencendo", "Faturamento rápido"],
    acaoRapida: "Ver tudo que precisa de atenção hoje"
  },
  {
    pagina: "/vendas",
    nome: "Vendas (ERP)",
    icone: TrendingUp,
    oqueVoceVe: ["Todas as receitas", "KPIs de vendas", "Histórico"],
    acaoRapida: "Registrar qualquer venda: aula, produto, aluguel"
  },
  {
    pagina: "/financeiro",
    nome: "Financeiro",
    icone: DollarSign,
    oqueVoceVe: ["Receita vs Despesa", "Margem real", "Taxas pagas"],
    acaoRapida: "Ver saúde financeira e DRE"
  },
  {
    pagina: "/clientes",
    nome: "Clientes",
    icone: Users,
    oqueVoceVe: ["Cadastro", "Store credit", "Histórico"],
    acaoRapida: "Gerenciar clientes e leads"
  },
  {
    pagina: "/estoque/loja",
    nome: "Minha Loja",
    icone: Store,
    oqueVoceVe: ["Produtos físicos", "Pronta entrega", "Estoque Nuvemshop sincronizado", "Status de sincronização"],
    acaoRapida: "Gerenciar estoque próprio e sincronizar com site"
  },
  {
    pagina: "/estoque/sob-encomenda",
    nome: "Sob Encomenda",
    icone: Cloud,
    oqueVoceVe: ["Catálogo Duotone", "Prazo de entrega", "Margem automática"],
    acaoRapida: "Vender produtos do fornecedor sem ter em estoque"
  },
  {
    pagina: "/estoque/usados",
    nome: "Usados (Trade-ins)",
    icone: Recycle,
    oqueVoceVe: ["Equipamentos usados", "Alertas de bomba", "Store credit"],
    acaoRapida: "Gerenciar equipamentos usados para revenda"
  },
  {
    pagina: "/conversas",
    nome: "WhatsApp",
    icone: MessageCircle,
    oqueVoceVe: ["Mensagens", "Leads quentes", "Análise IA"],
    acaoRapida: "Responder e qualificar leads"
  },
  {
    pagina: "/estoque/inventario",
    nome: "Inventário",
    icone: ClipboardCheck,
    oqueVoceVe: ["Contagem física", "Divergências", "Cobertura EAN"],
    acaoRapida: "Conferir estoque real vs sistema"
  }
];

// ============ FAQ ============
export const faqItems: FAQItem[] = [
  {
    id: "faq-1",
    pergunta: "Preciso registrar taxas de cartão manualmente?",
    resposta: "Não! O sistema calcula automaticamente baseado na forma de pagamento escolhida. Configure as taxas em Financeiro → Configurações.",
    categoria: "financeiro"
  },
  {
    id: "faq-2",
    pergunta: "Como funciona o Store Credit?",
    resposta: "Quando você registra um trade-in vinculado a um cliente, o valor vira crédito. Na próxima venda, o sistema mostra o saldo e você pode descontar automaticamente.",
    categoria: "vendas"
  },
  {
    id: "faq-3",
    pergunta: "As vendas da Nuvemshop entram automaticamente?",
    resposta: "Sim! Configure o webhook em Configurações → Integrações. Pedidos pagos criam transações automaticamente.",
    categoria: "integracoes"
  },
  {
    id: "faq-4",
    pergunta: "O que acontece quando confirmo uma aula?",
    resposta: "1) Transação de receita criada, 2) Cliente atualizado para 'aluno', 3) WhatsApp de confirmação enviado (se configurado), 4) Taxas e impostos calculados.",
    categoria: "aulas"
  },
  {
    id: "faq-5",
    pergunta: "Como vejo meu lucro real?",
    resposta: "Vá em Financeiro → DRE. Lá você vê receita - custos - taxas - impostos = lucro líquido real.",
    categoria: "financeiro"
  },
  {
    id: "faq-6",
    pergunta: "Como conectar meu WhatsApp?",
    resposta: "Vá em Configurações → WhatsApp, insira sua URL e chave da Evolution API, depois escaneie o QR Code que aparece.",
    categoria: "integracoes"
  },
  {
    id: "faq-7",
    pergunta: "Posso usar o sistema offline?",
    resposta: "Parcialmente. O sistema salva dados localmente quando offline e sincroniza quando a conexão voltar. Funcionalidades que dependem de API externa (WhatsApp, IA) precisam de internet.",
    categoria: "geral"
  },
  {
    id: "faq-8",
    pergunta: "Como a IA analisa os leads?",
    resposta: "O sistema analisa o histórico de conversas para identificar: interesse (alto/médio/baixo), objeções, gatilhos de compra e sugere a próxima ação.",
    categoria: "vendas"
  },
  {
    id: "faq-9",
    pergunta: "Qual a diferença entre Minha Loja e Sob Encomenda?",
    resposta: "Minha Loja são produtos que você tem fisicamente na loja (pronta entrega). Sob Encomenda são produtos do catálogo Duotone que você pode vender mesmo sem ter em estoque - o fornecedor entrega em 3-7 dias.",
    categoria: "estoque"
  },
  {
    id: "faq-10",
    pergunta: "O que significa 'Trazer para Loja'?",
    resposta: "Quando você faz um pedido ao fornecedor Duotone e o produto chega, use 'Trazer para Loja' para movê-lo de Sob Encomenda para Minha Loja. Assim ele fica disponível para venda imediata ou aluguel.",
    categoria: "estoque"
  },
  {
    id: "faq-11",
    pergunta: "O que é um trade-in 'bomba'?",
    resposta: "Um trade-in é considerado 'bomba' quando está parado há mais de 60 dias. O sistema alerta para você considerar baixar o preço ou fazer promoção para girar o estoque.",
    categoria: "estoque"
  },
  {
    id: "faq-12",
    pergunta: "Como fazer inventário físico?",
    resposta: "Vá em Estoque → Inventário e clique 'Iniciar Contagem'. Use a câmera do celular para escanear os códigos de barras. O sistema compara automaticamente com o estoque registrado e mostra divergências.",
    categoria: "estoque"
  },
  {
    id: "faq-13",
    pergunta: "O que é cobertura EAN?",
    resposta: "É a porcentagem de produtos que têm código de barras cadastrado. Quanto maior, mais fácil é a contagem física por scanner. Ideal: 100%.",
    categoria: "estoque"
  },
  {
    id: "faq-14",
    pergunta: "O que fazer quando encontro divergência no inventário?",
    resposta: "Após a contagem, o sistema mostra as diferenças. Você pode aplicar o ajuste (atualiza o sistema) ou investigar a causa (pode ser furto, erro de registro, etc).",
    categoria: "estoque"
  },
  {
    id: "faq-15",
    pergunta: "Importei produto errado do fornecedor, como desfazer?",
    resposta: "Vá em Estoque → Sob Encomenda → Meus Virtuais e clique no botão 'Excluir' ao lado do produto. Ele reaparecerá em 'Novidades' na próxima sincronização.",
    categoria: "estoque"
  },
  {
    id: "faq-16",
    pergunta: "O que é o buffer de segurança do estoque?",
    resposta: "É uma proteção automática. Se o fornecedor tem apenas 1 unidade, o site mostra 0 (só seu estoque físico). Se tem mais, reservamos 1 unidade como segurança. Assim, o site nunca vende a última peça do fornecedor.",
    categoria: "estoque"
  },
  {
    id: "faq-17",
    pergunta: "Como funciona a sincronização de estoque com Nuvemshop?",
    resposta: "O Lovable é a fonte da verdade. A cada entrada ou saída de estoque, calculamos: Estoque Site = Físico + Virtual Seguro (com buffer). Esse valor é enviado automaticamente para a Nuvemshop.",
    categoria: "integracoes"
  },
  {
    id: "faq-18",
    pergunta: "O que significa 'Estoque Nuvemshop' no card do produto?",
    resposta: "Mostra a quantidade disponível no seu site. É composto por: estoque físico (na sua loja) + estoque virtual seguro (do fornecedor com buffer). Também mostra quando foi a última sincronização.",
    categoria: "estoque"
  },
  {
    id: "faq-19",
    pergunta: "Como sincronizar manualmente o estoque com Nuvemshop?",
    resposta: "Em Minha Loja, cada produto vinculado tem um botão 'Sync'. Para sincronizar todos de uma vez, clique no botão 'Sincronizar Nuvemshop' no topo da página.",
    categoria: "integracoes"
  },
  {
    id: "faq-20",
    pergunta: "Por que o prazo de entrega muda entre 3 e 8 dias?",
    resposta: "Se você tem o produto em estoque físico, o prazo é 3 dias. Se o estoque é apenas virtual (do fornecedor), o prazo é 8 dias (3 + 5 do fornecedor).",
    categoria: "estoque"
  }
];

// Função de busca
export function searchHelpContent(query: string): {
  flows: CommercialFlow[];
  automations: Automation[];
  integrations: Integration[];
  areas: SystemArea[];
  faq: FAQItem[];
} {
  const q = query.toLowerCase();
  
  return {
    flows: commercialFlows.filter(f => 
      f.nome.toLowerCase().includes(q) || 
      f.descricao.toLowerCase().includes(q) ||
      f.passos.some(p => p.text.toLowerCase().includes(q))
    ),
    automations: automations.filter(a => 
      a.nome.toLowerCase().includes(q) || 
      a.quando.toLowerCase().includes(q) ||
      a.resultado.toLowerCase().includes(q)
    ),
    integrations: integrations.filter(i => 
      i.nome.toLowerCase().includes(q) || 
      i.funcao.toLowerCase().includes(q) ||
      i.funcionalidades.some(f => f.toLowerCase().includes(q))
    ),
    areas: systemAreas.filter(a => 
      a.nome.toLowerCase().includes(q) || 
      a.oqueVoceVe.some(v => v.toLowerCase().includes(q))
    ),
    faq: faqItems.filter(f => 
      f.pergunta.toLowerCase().includes(q) || 
      f.resposta.toLowerCase().includes(q)
    )
  };
}
