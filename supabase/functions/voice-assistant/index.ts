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
      name: "atualizar_custo_venda",
      description: "Atualiza o custo de uma venda recente que estava pendente e recalcula o lucro líquido",
      parameters: {
        type: "object",
        properties: {
          custo_produto: { type: "number", description: "Custo do produto em reais" }
        },
        required: ["custo_produto"]
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
      name: "registrar_trade_in",
      description: "Registra a entrada de um equipamento usado recebido em troca (trade-in)",
      parameters: {
        type: "object",
        properties: {
          equipamento_recebido: { type: "string", description: "Nome/modelo do equipamento usado recebido" },
          valor_entrada: { type: "number", description: "Valor dado como entrada/abatimento" },
          descricao: { type: "string", description: "Descrição do estado do equipamento" }
        },
        required: ["equipamento_recebido", "valor_entrada"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "vender_trade_in",
      description: "Registra a venda de um equipamento usado que estava em estoque (do trade-in)",
      parameters: {
        type: "object",
        properties: {
          equipamento: { type: "string", description: "Nome do equipamento usado vendido" },
          valor_venda: { type: "number", description: "Valor pelo qual foi vendido" }
        },
        required: ["equipamento", "valor_venda"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "registrar_conta_a_pagar",
      description: "Registra uma nova conta a pagar (despesa futura)",
      parameters: {
        type: "object",
        properties: {
          descricao: { type: "string", description: "Descrição da conta" },
          valor: { type: "number", description: "Valor da conta" },
          data_vencimento: { type: "string", description: "Data de vencimento (formato: YYYY-MM-DD ou 'amanha', 'proxima semana', 'dia X')" },
          categoria: { 
            type: "string", 
            enum: ["aluguel", "funcionarios", "impostos", "fornecedores", "manutencao", "marketing", "servicos", "outros"],
            description: "Categoria da conta"
          },
          fornecedor: { type: "string", description: "Nome do fornecedor" }
        },
        required: ["descricao", "valor", "data_vencimento"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultar_contas_a_pagar",
      description: "Consulta as contas a pagar pendentes",
      parameters: {
        type: "object",
        properties: {},
        required: []
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
            enum: ["dashboard", "clientes", "aulas", "financeiro", "estoque", "vendas", "ecommerce", "relatorios", "configuracoes", "assistente", "dre", "contas"],
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
  assistente: "/assistente",
  dre: "/financeiro/dre",
  contas: "/financeiro/contas"
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

IMPORTANTE - Captura de Custo:
- Se a última mensagem do assistente perguntou "Qual foi o custo?" e o usuário responder com um número (ex: "3200", "foi 3200", "custou 3200 reais"), use a ferramenta atualizar_custo_venda
- Interprete valores numéricos como resposta à pergunta de custo quando o contexto indicar isso

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
        case "atualizar_custo_venda":
          result = await atualizarCustoVenda(supabase, args);
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
        case "registrar_trade_in":
          result = await registrarTradeIn(supabase, args);
          break;
        case "vender_trade_in":
          result = await venderTradeIn(supabase, args);
          break;
        case "registrar_conta_a_pagar":
          result = await registrarContaAPagar(supabase, args);
          break;
        case "consultar_contas_a_pagar":
          result = await consultarContasAPagar(supabase);
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

async function atualizarCustoVenda(supabase: any, data: any) {
  const { custo_produto } = data;
  
  if (!custo_produto || isNaN(Number(custo_produto))) {
    return { success: false, message: "Não consegui identificar o valor do custo 🤔" };
  }

  // Find the most recent transaction without cost from today
  const hoje = new Date().toISOString().split("T")[0];
  const { data: transacoes, error: fetchError } = await supabase
    .from("transacoes")
    .select("*")
    .eq("tipo", "receita")
    .eq("data_transacao", hoje)
    .eq("custo_produto", 0)
    .order("created_at", { ascending: false })
    .limit(1);

  if (fetchError || !transacoes?.length) {
    return { success: false, message: "Não encontrei uma venda recente para atualizar o custo." };
  }

  const transacao = transacoes[0];
  const custoNum = Number(custo_produto);
  const lucroLiquido = transacao.valor_bruto - custoNum - (transacao.taxa_cartao_estimada || 0) - (transacao.imposto_provisionado || 0);

  const { error: updateError } = await supabase
    .from("transacoes")
    .update({
      custo_produto: custoNum,
      lucro_liquido: lucroLiquido,
    })
    .eq("id", transacao.id);

  if (updateError) {
    console.error("Erro ao atualizar custo:", updateError);
    return { success: false, message: "Erro ao atualizar o custo" };
  }

  const margem = transacao.valor_bruto > 0 ? (lucroLiquido / transacao.valor_bruto) * 100 : 0;

  return {
    success: true,
    message: `✅ Custo atualizado!\n\n💰 Venda: R$${transacao.valor_bruto.toLocaleString('pt-BR')}\n📦 Custo: R$${custoNum.toLocaleString('pt-BR')}\n✨ Lucro líquido: R$${lucroLiquido.toFixed(2)} (${margem.toFixed(0)}% margem)`,
  };
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

async function registrarTradeIn(supabase: any, data: any) {
  const { equipamento_recebido, valor_entrada, descricao } = data;
  
  if (!equipamento_recebido || !valor_entrada) {
    return { success: false, message: "Preciso do nome do equipamento e valor da entrada 🤔" };
  }

  const { error } = await supabase.from("trade_ins").insert({
    equipamento_recebido,
    valor_entrada: Number(valor_entrada),
    descricao: descricao || null,
    data_entrada: new Date().toISOString().split("T")[0],
    status: "em_estoque",
  });

  if (error) {
    console.error("Erro ao registrar trade-in:", error);
    return { success: false, message: "Erro ao registrar o trade-in" };
  }

  return {
    success: true,
    message: `✅ Trade-in registrado!\n\n📦 ${equipamento_recebido}\n💰 Valor entrada: R$${Number(valor_entrada).toLocaleString('pt-BR')}\n📊 Status: Em estoque`,
  };
}

async function venderTradeIn(supabase: any, data: any) {
  const { equipamento, valor_venda } = data;
  
  if (!equipamento || !valor_venda) {
    return { success: false, message: "Preciso do nome do equipamento e valor da venda 🤔" };
  }

  // Find the trade-in
  const { data: tradeIns } = await supabase
    .from("trade_ins")
    .select("*")
    .ilike("equipamento_recebido", `%${equipamento}%`)
    .eq("status", "em_estoque")
    .limit(1);

  if (!tradeIns?.length) {
    return { success: false, message: `Não encontrei "${equipamento}" em estoque.` };
  }

  const tradeIn = tradeIns[0];
  const valorVendaNum = Number(valor_venda);
  const lucro = valorVendaNum - tradeIn.valor_entrada;

  const { error } = await supabase
    .from("trade_ins")
    .update({
      valor_saida: valorVendaNum,
      data_saida: new Date().toISOString().split("T")[0],
      status: "vendido",
    })
    .eq("id", tradeIn.id);

  if (error) {
    console.error("Erro ao vender trade-in:", error);
    return { success: false, message: "Erro ao registrar venda do usado" };
  }

  const lucroPct = tradeIn.valor_entrada > 0 ? (lucro / tradeIn.valor_entrada) * 100 : 0;

  return {
    success: true,
    message: `✅ Usado vendido!\n\n📦 ${tradeIn.equipamento_recebido}\n💵 Entrada: R$${tradeIn.valor_entrada.toLocaleString('pt-BR')}\n💰 Venda: R$${valorVendaNum.toLocaleString('pt-BR')}\n${lucro >= 0 ? '📈' : '📉'} Lucro: R$${lucro.toFixed(2)} (${lucroPct.toFixed(0)}%)`,
  };
}

async function registrarContaAPagar(supabase: any, data: any) {
  const { descricao, valor, data_vencimento, categoria = "outros", fornecedor } = data;
  
  if (!descricao || !valor) {
    return { success: false, message: "Preciso da descrição e valor da conta 🤔" };
  }

  // Parse date
  let vencimento: string;
  const today = new Date();
  
  if (data_vencimento.toLowerCase().includes("amanha") || data_vencimento.toLowerCase().includes("amanhã")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    vencimento = tomorrow.toISOString().split("T")[0];
  } else if (data_vencimento.toLowerCase().includes("semana")) {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    vencimento = nextWeek.toISOString().split("T")[0];
  } else if (data_vencimento.match(/^\d{4}-\d{2}-\d{2}$/)) {
    vencimento = data_vencimento;
  } else if (data_vencimento.match(/dia\s*(\d+)/i)) {
    const match = data_vencimento.match(/dia\s*(\d+)/i);
    const dia = parseInt(match![1]);
    const novaData = new Date(today.getFullYear(), today.getMonth(), dia);
    if (novaData < today) {
      novaData.setMonth(novaData.getMonth() + 1);
    }
    vencimento = novaData.toISOString().split("T")[0];
  } else {
    vencimento = today.toISOString().split("T")[0];
  }

  const { error } = await supabase.from("contas_a_pagar").insert({
    descricao,
    valor: Number(valor),
    data_vencimento: vencimento,
    categoria,
    fornecedor: fornecedor || null,
    status: "pendente",
  });

  if (error) {
    console.error("Erro ao registrar conta:", error);
    return { success: false, message: "Erro ao registrar conta a pagar" };
  }

  return {
    success: true,
    message: `✅ Conta registrada!\n\n📝 ${descricao}\n💰 R$${Number(valor).toLocaleString('pt-BR')}\n📅 Vencimento: ${new Date(vencimento).toLocaleDateString('pt-BR')}`,
  };
}

async function consultarContasAPagar(supabase: any) {
  const hoje = new Date().toISOString().split("T")[0];

  const { data: contas, error } = await supabase
    .from("contas_a_pagar")
    .select("*")
    .eq("status", "pendente")
    .order("data_vencimento", { ascending: true })
    .limit(5);

  if (error) {
    console.error("Erro ao consultar contas:", error);
    return { success: false, message: "Erro ao consultar contas" };
  }

  if (!contas?.length) {
    return { success: true, message: "🎉 Nenhuma conta a pagar pendente!" };
  }

  const total = contas.reduce((sum: number, c: any) => sum + Number(c.valor), 0);
  const vencidas = contas.filter((c: any) => c.data_vencimento < hoje);

  let msg = `📋 Próximas contas a pagar:\n\n`;
  
  contas.forEach((c: any) => {
    const vencida = c.data_vencimento < hoje;
    const dataFormatada = new Date(c.data_vencimento).toLocaleDateString('pt-BR');
    msg += `${vencida ? '🔴' : '🟡'} ${c.descricao}: R$${Number(c.valor).toLocaleString('pt-BR')} (${dataFormatada})\n`;
  });

  msg += `\n💰 Total pendente: R$${total.toLocaleString('pt-BR')}`;
  if (vencidas.length > 0) {
    msg += `\n⚠️ ${vencidas.length} conta(s) vencida(s)!`;
  }

  return { success: true, message: msg };
}
