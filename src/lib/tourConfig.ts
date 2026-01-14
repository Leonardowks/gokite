import { Step } from "react-joyride";

export interface TourConfig {
  id: string;
  title: string;
  steps: Step[];
}

export const toursByRoute: Record<string, TourConfig> = {
  "/": {
    id: "dashboard",
    title: "Tour do Dashboard",
    steps: [
      {
        target: ".metric-card-pendentes",
        content: "🔴 Aqui você vê as aulas que precisam de confirmação urgente! Clique para ver detalhes.",
        disableBeacon: true,
      },
      {
        target: ".daily-routine-widget",
        content: "🌅 Este é o seu guia diário! Veja exatamente o que fazer para não perder nenhuma oportunidade.",
      },
      {
        target: ".quick-actions-panel",
        content: "⚡ Use estas ações rápidas para resolver tarefas importantes com apenas 1 clique!",
      },
      {
        target: ".notification-center",
        content: "🔔 Suas notificações aparecem aqui. Nunca perca um aluguel vencendo ou um lead quente!",
      },
    ],
  },
  "/financeiro": {
    id: "financeiro",
    title: "Tour Financeiro",
    steps: [
      {
        target: "#kpi-receita",
        content: "💰 Receita total do período selecionado. Clique para ver detalhes.",
        disableBeacon: true,
      },
      {
        target: "#kpi-liquido",
        content: "📊 Margem Real: o dinheiro que sobra de verdade, após descontar taxas e impostos.",
      },
      {
        target: "#kpi-taxas",
        content: "💳 Total de taxas de cartão pagas no período. Importante para seu fluxo de caixa.",
      },
      {
        target: "#quick-entry",
        content: "🎤 Adicione transações rapidamente com IA - digite ou fale! Ex: 'Recebi 500 pix da aula'",
      },
    ],
  },
  "/estoque/trade-ins": {
    id: "tradeins",
    title: "Tour de Trade-ins",
    steps: [
      {
        target: "#btn-novo-tradein",
        content: "1️⃣ Comece registrando um novo equipamento usado que o cliente trouxe.",
        disableBeacon: true,
      },
      {
        target: "#filtros-tradein",
        content: "2️⃣ Filtre por categoria, condição ou status para encontrar itens rapidamente.",
      },
      {
        target: "#insights-tradein",
        content: "3️⃣ Veja insights de liquidez e alertas de itens parados há muito tempo.",
      },
    ],
  },
  "/clientes": {
    id: "clientes",
    title: "Tour de Clientes",
    steps: [
      {
        target: "#btn-novo-cliente",
        content: "➕ Cadastre novos clientes ou leads aqui. O formulário é rápido!",
        disableBeacon: true,
      },
      {
        target: "#busca-clientes",
        content: "🔍 Busque por nome, email ou telefone. A busca é instantânea!",
      },
      {
        target: "#tabs-clientes",
        content: "📋 Alterne entre Clientes cadastrados e Prospectos (leads do WhatsApp).",
      },
    ],
  },
  "/aulas": {
    id: "aulas",
    title: "Tour de Aulas",
    steps: [
      {
        target: "#btn-nova-aula",
        content: "📅 Agende uma nova aula aqui. Escolha cliente, data, horário e instrutor.",
        disableBeacon: true,
      },
      {
        target: "#kpis-aulas",
        content: "📊 Acompanhe suas métricas: aulas hoje, pendentes, receita prevista.",
      },
      {
        target: "#filtro-status-aulas",
        content: "🎯 Filtre por status: pendente, confirmada, realizada ou cancelada.",
      },
    ],
  },
  "/vendas": {
    id: "vendas",
    title: "Tour de Vendas",
    steps: [
      {
        target: "#btn-nova-venda",
        content: "💵 Registre uma nova venda: aulas, produtos, aluguéis ou trade-ins.",
        disableBeacon: true,
      },
      {
        target: "#kpis-vendas",
        content: "📈 Acompanhe receita, lucro líquido e margem média do período.",
      },
      {
        target: "#filtros-vendas",
        content: "🔍 Filtre por origem (aula, produto, aluguel) ou forma de pagamento.",
      },
    ],
  },
  "/estoque": {
    id: "estoque",
    title: "Tour do Estoque",
    steps: [
      {
        target: "#btn-add-equipamento",
        content: "➕ Adicione novos equipamentos ao seu inventário.",
        disableBeacon: true,
      },
      {
        target: "#submenu-estoque",
        content: "📦 Acesse Trade-ins, Inventário, Recebimento e sincronização com e-commerce.",
      },
      {
        target: "#kpis-estoque",
        content: "📊 Veja o status geral: total, disponíveis, alugados e em manutenção.",
      },
    ],
  },
};

// Rotas que têm tour configurado
export const getAvailableTourRoutes = (): string[] => {
  return Object.keys(toursByRoute);
};

// Verifica se existe tour para uma rota
export const hasTourForRoute = (route: string): boolean => {
  // Normaliza a rota removendo trailing slash
  const normalizedRoute = route === "/" ? "/" : route.replace(/\/$/, "");
  return normalizedRoute in toursByRoute;
};

// Retorna o tour para uma rota
export const getTourForRoute = (route: string): TourConfig | null => {
  const normalizedRoute = route === "/" ? "/" : route.replace(/\/$/, "");
  return toursByRoute[normalizedRoute] || null;
};
