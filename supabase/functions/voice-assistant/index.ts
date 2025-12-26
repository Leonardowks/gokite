import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "registrar_despesa",
      description: "Registra uma nova despesa/gasto no sistema",
      parameters: {
        type: "object",
        properties: {
          valor: { type: "number", description: "Valor da despesa em reais" },
          categoria: { 
            type: "string", 
            enum: ["combustivel", "manutencao", "equipamentos", "funcionarios", "alimentacao", "transporte", "outros"],
            description: "Categoria da despesa"
          },
          descricao: { type: "string", description: "Descrição da despesa" },
          centro_de_custo: {
            type: "string",
            enum: ["Escola", "Loja", "Administrativo", "Pousada"],
            description: "Centro de custo da despesa"
          }
        },
        required: ["valor"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "registrar_venda",
      description: "Registra uma venda de equipamento ou serviço com cálculo automático de taxas e impostos",
      parameters: {
        type: "object",
        properties: {
          produto: { type: "string", description: "Nome do produto ou equipamento vendido" },
          valor_bruto: { type: "number", description: "Valor da venda em reais" },
          forma_pagamento: { 
            type: "string", 
            enum: ["pix", "cartao_credito", "cartao_debito", "dinheiro", "trade_in"],
            description: "Forma de pagamento"
          },
          parcelas: { type: "number", description: "Número de parcelas (se cartão)" },
          centro_de_custo: {
            type: "string",
            enum: ["Escola", "Loja", "Administrativo", "Pousada"],
            description: "Centro de custo da venda"
          },
          custo_produto: { type: "number", description: "Custo do produto (opcional, para cálculo de margem)" }
        },
        required: ["valor_bruto"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultar_faturamento",
      description: "Consulta o faturamento (receitas de aulas e aluguéis) de um período",
      parameters: {
        type: "object",
        properties: {
          periodo: { 
            type: "string", 
            enum: ["hoje", "semana", "mes"],
            description: "Período para consultar"
          }
        },
        required: ["periodo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "cadastrar_cliente",
      description: "Cadastra um novo cliente no sistema",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do cliente" },
          telefone: { type: "string", description: "Telefone do cliente" },
          email: { type: "string", description: "Email do cliente" }
        },
        required: ["nome"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "agendar_aula",
      description: "Agenda uma nova aula de kitesurf para um cliente",
      parameters: {
        type: "object",
        properties: {
          cliente_nome: { type: "string", description: "Nome do cliente" },
          data: { type: "string", description: "Data da aula (hoje, amanhã, ou data específica)" },
          hora: { type: "string", description: "Horário da aula (ex: 10:00)" }
        },
        required: ["cliente_nome"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navegar",
      description: "Navega para uma página específica do sistema",
      parameters: {
        type: "object",
        properties: {
          pagina: { 
            type: "string", 
            enum: ["dashboard", "clientes", "aulas", "financeiro", "estoque", "vendas", "ecommerce", "relatorios", "configuracoes", "assistente"],
            description: "Nome da página para navegar"
          }
        },
        required: ["pagina"]
      }
    }
  }
];

const pageRoutes: Record<string, string> = {
  dashboard: "/",
  home: "/",
  inicio: "/",
  clientes: "/clientes",
  aulas: "/aulas",
  financeiro: "/financeiro",
  estoque: "/estoque",
  vendas: "/vendas",
  ecommerce: "/ecommerce",
  relatorios: "/relatorios",
  configuracoes: "/configuracoes",
  assistente: "/assistente"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, conversationHistory = [] } = await req.json();
    
    if (!transcript || typeof transcript !== "string") {
      throw new Error("Transcrição não fornecida");
    }

    console.log("Processando:", transcript);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Build conversation messages
    const messages = [
      {
        role: "system",
        content: `Você é Jarvis, o assistente inteligente e amigável da GoKite, uma escola de kitesurf.

Seu papel é ajudar o empresário a gerenciar o negócio de forma natural e conversacional.
Você pode executar ações no sistema quando necessário, mas sempre confirme o que foi feito.

Diretrizes:
- Seja conciso, amigável e natural nas respostas
- Quando executar uma ação, confirme brevemente o que foi feito
- Se não entender algo, peça esclarecimentos de forma educada
- Use emojis ocasionalmente para ser mais expressivo
- Quando perguntarem sobre navegação, use a ferramenta navegar
- Responda sempre em português brasileiro

Contexto atual:
- Data: ${new Date().toLocaleDateString('pt-BR')}
- Hora: ${new Date().toLocaleTimeString('pt-BR')}`
      },
      ...conversationHistory.slice(-8),
      { role: "user", content: transcript }
    ];

    // Call AI with tools
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        tool_choice: "auto"
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erro na API:", errorText);
      throw new Error("Falha ao processar com IA");
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    const responseMessage = choice?.message;

    console.log("Resposta da IA:", JSON.stringify(responseMessage));

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if there are tool calls
    if (responseMessage?.tool_calls?.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      let args: Record<string, any> = {};
      
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      console.log(`Executando: ${functionName}`, args);

      let result: { success: boolean; message: string; data?: any; navigation?: any; actionExecuted?: boolean; pendingCusto?: boolean; transacaoId?: string };

      switch (functionName) {
        case "registrar_despesa":
          result = await registrarDespesa(supabase, args);
          break;
        case "registrar_venda":
          result = await registrarVenda(supabase, args);
          break;
        case "consultar_faturamento":
          result = await consultarFaturamento(supabase, args);
          break;
        case "cadastrar_cliente":
          result = await cadastrarCliente(supabase, args);
          break;
        case "agendar_aula":
          result = await agendarAula(supabase, args);
          break;
        case "navegar":
          const route = pageRoutes[args.pagina?.toLowerCase()] || "/";
          result = {
            success: true,
            message: `Indo para ${args.pagina}! 🚀`,
            navigation: { route, pagina: args.pagina }
          };
          break;
        default:
          result = { success: false, message: "Ação não reconhecida" };
      }

      return new Response(
        JSON.stringify({
          ...result,
          actionExecuted: result.success
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No tool calls - just a conversational response
    const textResponse = responseMessage?.content || "Desculpe, não consegui processar isso.";
    
    return new Response(
      JSON.stringify({
        success: true,
        message: textResponse,
        actionExecuted: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Action handlers
async function registrarDespesa(supabase: any, data: any) {
  const { valor, categoria = "outros", descricao } = data;
  
  if (!valor || isNaN(Number(valor))) {
    return { success: false, message: "Não consegui identificar o valor da despesa 🤔" };
  }

  const { error } = await supabase.from("despesas").insert({
    valor: Number(valor),
    categoria: categoria.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    descricao: descricao || null,
    data: new Date().toISOString().split("T")[0],
  });

  if (error) {
    console.error("Erro ao inserir despesa:", error);
    return { success: false, message: "Ops, erro ao registrar a despesa" };
  }

  return {
    success: true,
    message: `✅ Pronto! Registrei R$${valor} em ${categoria}${descricao ? ` (${descricao})` : ''}`,
  };
}

async function registrarVenda(supabase: any, data: any) {
  const { 
    produto, 
    valor_bruto, 
    forma_pagamento = "dinheiro", 
    parcelas = 1, 
    centro_de_custo = "Loja",
    custo_produto 
  } = data;
  
  if (!valor_bruto || isNaN(Number(valor_bruto))) {
    return { success: false, message: "Não consegui identificar o valor da venda 🤔" };
  }

  // Fetch config for rates
  const { data: config } = await supabase
    .from("config_financeiro")
    .select("*")
    .limit(1)
    .single();

  const taxaCartao = config ? (
    forma_pagamento === 'cartao_credito' ? config.taxa_cartao_credito :
    forma_pagamento === 'cartao_debito' ? config.taxa_cartao_debito :
    forma_pagamento === 'pix' ? config.taxa_pix : 0
  ) : 4;

  const taxaImposto = config?.taxa_imposto_padrao || 6;

  // Calculate values
  const valorBrutoNum = Number(valor_bruto);
  const taxaCartaoEstimada = (valorBrutoNum * taxaCartao) / 100;
  const impostoProvisionado = (valorBrutoNum * taxaImposto) / 100;
  
  // Try to find equipment in stock if product name provided
  let custoReal = custo_produto ? Number(custo_produto) : 0;
  let equipamentoId = null;
  let needsCusto = false;

  if (produto) {
    const { data: equipamentos } = await supabase
      .from("equipamentos")
      .select("id, nome, preco_aluguel_dia")
      .ilike("nome", `%${produto}%`)
      .limit(1);

    if (equipamentos?.length) {
      equipamentoId = equipamentos[0].id;
      // Use rental price as a proxy for cost if not provided
      if (!custo_produto) {
        needsCusto = true;
      }
    }
  }

  if (!custo_produto && !needsCusto) {
    needsCusto = true;
  }

  const lucroLiquido = valorBrutoNum - custoReal - taxaCartaoEstimada - impostoProvisionado;

  // Insert transacao
  const { data: transacao, error } = await supabase.from("transacoes").insert({
    tipo: "receita",
    origem: "venda_equipamento",
    descricao: produto || "Venda",
    valor_bruto: valorBrutoNum,
    custo_produto: custoReal,
    taxa_cartao_estimada: taxaCartaoEstimada,
    imposto_provisionado: impostoProvisionado,
    lucro_liquido: lucroLiquido,
    centro_de_custo: centro_de_custo,
    forma_pagamento: forma_pagamento,
    parcelas: parcelas || 1,
    equipamento_id: equipamentoId,
    data_transacao: new Date().toISOString().split("T")[0],
  }).select().single();

  if (error) {
    console.error("Erro ao registrar venda:", error);
    return { success: false, message: "Ops, erro ao registrar a venda" };
  }

  const formaPagamentoLabel: Record<string, string> = {
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    dinheiro: 'Dinheiro',
    trade_in: 'Trade-in',
  };

  let msg = `✅ Venda registrada!\n\n💰 Valor: R$${valorBrutoNum.toLocaleString('pt-BR')}\n💳 ${formaPagamentoLabel[forma_pagamento] || forma_pagamento}`;
  
  if (parcelas > 1) {
    msg += ` em ${parcelas}x`;
  }

  if (taxaCartaoEstimada > 0) {
    msg += `\n📉 Taxa cartão: -R$${taxaCartaoEstimada.toFixed(2)}`;
  }
  msg += `\n📊 Imposto provisionado: -R$${impostoProvisionado.toFixed(2)}`;

  if (needsCusto && !custo_produto) {
    msg += `\n\n❓ Qual foi o custo desse equipamento?`;
    return { 
      success: true, 
      message: msg, 
      pendingCusto: true,
      transacaoId: transacao?.id,
      data: { transacao }
    };
  } else {
    const margem = valorBrutoNum > 0 ? (lucroLiquido / valorBrutoNum) * 100 : 0;
    msg += `\n\n✨ Lucro líquido: R$${lucroLiquido.toFixed(2)} (${margem.toFixed(0)}% margem)`;
    return { 
      success: true, 
      message: msg,
      data: { transacao }
    };
  }
}

async function consultarFaturamento(supabase: any, data: any) {
  const { periodo = "hoje" } = data;
  
  let startDate: string;
  const today = new Date();
  
  switch (periodo.toLowerCase()) {
    case "semana":
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      startDate = weekStart.toISOString().split("T")[0];
      break;
    case "mes":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      break;
    default:
      startDate = today.toISOString().split("T")[0];
  }

  const endDate = today.toISOString().split("T")[0];

  const { data: aulas } = await supabase
    .from("aulas")
    .select("preco")
    .gte("data", startDate)
    .lte("data", endDate)
    .eq("status", "concluida");

  const { data: alugueis } = await supabase
    .from("aluguel")
    .select("valor")
    .gte("data_inicio", startDate)
    .lte("data_inicio", endDate);

  const totalAulas = aulas?.reduce((acc: number, a: any) => acc + Number(a.preco), 0) || 0;
  const totalAlugueis = alugueis?.reduce((acc: number, a: any) => acc + Number(a.valor), 0) || 0;
  const total = totalAulas + totalAlugueis;

  const periodoText = periodo === "hoje" ? "hoje" : periodo === "semana" ? "essa semana" : "esse mês";

  return {
    success: true,
    message: `💰 Faturamento ${periodoText}: R$${total.toFixed(2)}\n\n📚 Aulas: R$${totalAulas.toFixed(2)}\n🏄 Aluguéis: R$${totalAlugueis.toFixed(2)}`,
    data: { total, aulas: totalAulas, alugueis: totalAlugueis },
  };
}

async function cadastrarCliente(supabase: any, data: any) {
  const { nome, telefone, email } = data;
  
  if (!nome) {
    return { success: false, message: "Preciso do nome do cliente para cadastrar 😅" };
  }

  const { error } = await supabase.from("clientes").insert({
    nome,
    telefone: telefone || null,
    email: email || `${nome.toLowerCase().replace(/\s+/g, ".")}@gokite.temp`,
    status: "ativo",
  });

  if (error) {
    console.error("Erro ao cadastrar cliente:", error);
    return { success: false, message: "Erro ao cadastrar cliente" };
  }

  let msg = `✅ ${nome} cadastrado com sucesso!`;
  if (telefone) msg += ` (Tel: ${telefone})`;

  return { success: true, message: msg };
}

async function agendarAula(supabase: any, data: any) {
  const { cliente_nome, data: dataAula, hora = "10:00" } = data;
  
  if (!cliente_nome) {
    return { success: false, message: "Com qual cliente devo agendar a aula?" };
  }

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome")
    .ilike("nome", `%${cliente_nome}%`)
    .limit(1);

  if (!clientes?.length) {
    return { success: false, message: `Não encontrei cliente "${cliente_nome}". Quer que eu cadastre?` };
  }

  let aulaDate: string;
  const today = new Date();
  
  if (dataAula?.toLowerCase().includes("amanha") || dataAula?.toLowerCase().includes("amanhã")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    aulaDate = tomorrow.toISOString().split("T")[0];
  } else {
    aulaDate = today.toISOString().split("T")[0];
  }

  const horaFormatted = hora.includes(":") ? hora : `${hora}:00`;

  const { error } = await supabase.from("aulas").insert({
    cliente_id: clientes[0].id,
    data: aulaDate,
    hora: horaFormatted,
    tipo: "kitesurf",
    instrutor: "A definir",
    local: "Praia Principal",
    preco: 250,
    status: "agendada",
  });

  if (error) {
    console.error("Erro ao agendar aula:", error);
    return { success: false, message: "Erro ao agendar aula" };
  }

  const dataFormatted = new Date(aulaDate).toLocaleDateString('pt-BR');
  return {
    success: true,
    message: `📅 Aula agendada!\n\n👤 ${clientes[0].nome}\n🗓️ ${dataFormatted} às ${horaFormatted}\n📍 Praia Principal`,
  };
}
