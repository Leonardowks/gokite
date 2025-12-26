import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoiceCommand {
  intent: string;
  data: Record<string, any>;
  confidence: number;
}

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    
    if (!transcript || typeof transcript !== "string") {
      throw new Error("Transcrição não fornecida");
    }

    console.log("Processando comando de voz:", transcript);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Process with Lovable AI to extract intent and data
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente de voz para uma escola de kitesurf chamada GoKite. 
Sua função é interpretar comandos de voz e extrair a intenção e os dados estruturados.

Categorias de despesas válidas: combustivel, manutencao, equipamentos, funcionarios, alimentacao, transporte, outros

Intents disponíveis:
- registrar_despesa: quando o usuário quer registrar um gasto/despesa
- consultar_faturamento: quando quer saber quanto faturou (hoje, semana, mês)
- cadastrar_cliente: quando quer adicionar um novo cliente
- agendar_aula: quando quer marcar uma aula
- criar_aluguel: quando quer registrar um aluguel de equipamento
- consulta_geral: quando quer informações gerais

Responda APENAS com JSON válido no formato:
{
  "intent": "nome_do_intent",
  "data": { dados extraídos },
  "confidence": 0.0 a 1.0
}

Exemplos:
- "gastei 200 de gasolina pro bote" -> {"intent": "registrar_despesa", "data": {"valor": 200, "categoria": "combustivel", "descricao": "gasolina pro bote"}, "confidence": 0.95}
- "cadastra cliente Pedro telefone 11999999999" -> {"intent": "cadastrar_cliente", "data": {"nome": "Pedro", "telefone": "11999999999"}, "confidence": 0.9}
- "agenda aula com Maria amanhã às 10" -> {"intent": "agendar_aula", "data": {"cliente_nome": "Maria", "data": "amanhã", "hora": "10:00"}, "confidence": 0.85}
- "quanto faturei hoje" -> {"intent": "consultar_faturamento", "data": {"periodo": "hoje"}, "confidence": 0.95}`
          },
          {
            role: "user",
            content: transcript
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erro na API Lovable AI:", errorText);
      throw new Error("Falha ao processar comando com IA");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    console.log("Resposta da IA:", aiContent);

    let command: VoiceCommand;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("JSON não encontrado na resposta");
      }
      command = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Erro ao parsear resposta da IA:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Não entendi o comando. Pode repetir?",
          transcript,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Execute the appropriate action based on intent
    let result: CommandResult;

    switch (command.intent) {
      case "registrar_despesa":
        result = await registrarDespesa(supabase, command.data);
        break;
      case "consultar_faturamento":
        result = await consultarFaturamento(supabase, command.data);
        break;
      case "cadastrar_cliente":
        result = await cadastrarCliente(supabase, command.data);
        break;
      case "agendar_aula":
        result = await agendarAula(supabase, command.data);
        break;
      case "criar_aluguel":
        result = await criarAluguel(supabase, command.data);
        break;
      default:
        result = {
          success: false,
          message: `Não sei como executar: ${command.intent}. Tente novamente com outro comando.`,
        };
    }

    console.log("Resultado da ação:", result);

    return new Response(
      JSON.stringify({
        ...result,
        intent: command.intent,
        confidence: command.confidence,
        transcript,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro no voice-assistant:", error);
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
async function registrarDespesa(supabase: any, data: any): Promise<CommandResult> {
  const { valor, categoria = "outros", descricao } = data;
  
  if (!valor || isNaN(Number(valor))) {
    return { success: false, message: "Valor da despesa não identificado" };
  }

  const { error } = await supabase.from("despesas").insert({
    valor: Number(valor),
    categoria: categoria.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    descricao: descricao || null,
    data: new Date().toISOString().split("T")[0],
  });

  if (error) {
    console.error("Erro ao inserir despesa:", error);
    return { success: false, message: "Erro ao registrar despesa" };
  }

  return {
    success: true,
    message: `Despesa de R$${valor} em ${categoria} registrada com sucesso!`,
  };
}

async function consultarFaturamento(supabase: any, data: any): Promise<CommandResult> {
  const { periodo = "hoje" } = data;
  
  let startDate: string;
  const today = new Date();
  
  switch (periodo.toLowerCase()) {
    case "semana":
    case "esta semana":
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      startDate = weekStart.toISOString().split("T")[0];
      break;
    case "mes":
    case "este mes":
    case "mês":
    case "este mês":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      break;
    default: // hoje
      startDate = today.toISOString().split("T")[0];
  }

  const endDate = today.toISOString().split("T")[0];

  // Get aulas revenue
  const { data: aulas, error: aulasError } = await supabase
    .from("aulas")
    .select("preco")
    .gte("data", startDate)
    .lte("data", endDate)
    .eq("status", "concluida");

  // Get aluguel revenue
  const { data: alugueis, error: alugueisError } = await supabase
    .from("aluguel")
    .select("valor")
    .gte("data_inicio", startDate)
    .lte("data_inicio", endDate);

  if (aulasError || alugueisError) {
    return { success: false, message: "Erro ao consultar faturamento" };
  }

  const totalAulas = aulas?.reduce((acc: number, a: any) => acc + Number(a.preco), 0) || 0;
  const totalAlugueis = alugueis?.reduce((acc: number, a: any) => acc + Number(a.valor), 0) || 0;
  const total = totalAulas + totalAlugueis;

  const periodoText = periodo === "hoje" ? "hoje" : `nesta ${periodo}`;

  return {
    success: true,
    message: `Faturamento ${periodoText}: R$${total.toFixed(2)}. Aulas: R$${totalAulas.toFixed(2)}, Aluguéis: R$${totalAlugueis.toFixed(2)}.`,
    data: { total, aulas: totalAulas, alugueis: totalAlugueis },
  };
}

async function cadastrarCliente(supabase: any, data: any): Promise<CommandResult> {
  const { nome, telefone, email } = data;
  
  if (!nome) {
    return { success: false, message: "Nome do cliente não identificado" };
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

  return {
    success: true,
    message: `Cliente ${nome} cadastrado com sucesso!`,
  };
}

async function agendarAula(supabase: any, data: any): Promise<CommandResult> {
  const { cliente_nome, data: dataAula, hora = "10:00" } = data;
  
  if (!cliente_nome) {
    return { success: false, message: "Nome do cliente não identificado" };
  }

  // Find client
  const { data: clientes, error: clienteError } = await supabase
    .from("clientes")
    .select("id, nome")
    .ilike("nome", `%${cliente_nome}%`)
    .limit(1);

  if (clienteError || !clientes?.length) {
    return { success: false, message: `Cliente "${cliente_nome}" não encontrado` };
  }

  // Parse date
  let aulaDate: string;
  const today = new Date();
  
  if (dataAula?.toLowerCase().includes("amanha") || dataAula?.toLowerCase().includes("amanhã")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    aulaDate = tomorrow.toISOString().split("T")[0];
  } else if (dataAula?.toLowerCase().includes("hoje")) {
    aulaDate = today.toISOString().split("T")[0];
  } else {
    aulaDate = today.toISOString().split("T")[0]; // default to today
  }

  // Format hora
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

  return {
    success: true,
    message: `Aula agendada para ${clientes[0].nome} em ${aulaDate} às ${horaFormatted}!`,
  };
}

async function criarAluguel(supabase: any, data: any): Promise<CommandResult> {
  const { cliente_nome, equipamento, dias = 1 } = data;
  
  if (!cliente_nome) {
    return { success: false, message: "Nome do cliente não identificado" };
  }

  // Find client
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id")
    .ilike("nome", `%${cliente_nome}%`)
    .limit(1);

  if (!clientes?.length) {
    return { success: false, message: `Cliente "${cliente_nome}" não encontrado` };
  }

  // Find available equipment
  const { data: equipamentos } = await supabase
    .from("equipamentos")
    .select("id, nome, preco_aluguel_dia")
    .eq("status", "disponivel")
    .limit(1);

  if (!equipamentos?.length) {
    return { success: false, message: "Nenhum equipamento disponível" };
  }

  const eq = equipamentos[0];
  const dataInicio = new Date();
  const dataFim = new Date();
  dataFim.setDate(dataFim.getDate() + Number(dias));

  const { error } = await supabase.from("aluguel").insert({
    cliente_id: clientes[0].id,
    equipamento_id: eq.id,
    data_inicio: dataInicio.toISOString(),
    data_fim: dataFim.toISOString(),
    valor: eq.preco_aluguel_dia * Number(dias),
    status: "ativo",
  });

  if (error) {
    console.error("Erro ao criar aluguel:", error);
    return { success: false, message: "Erro ao criar aluguel" };
  }

  // Update equipment status
  await supabase
    .from("equipamentos")
    .update({ status: "alugado" })
    .eq("id", eq.id);

  return {
    success: true,
    message: `Aluguel de ${eq.nome} por ${dias} dia(s) criado com sucesso!`,
  };
}
