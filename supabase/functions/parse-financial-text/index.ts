import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Você é um assistente especializado em extrair dados financeiros de textos em linguagem natural para uma escola de kitesurf.

REGRAS DE EXTRAÇÃO:
1. Analise o texto e extraia os seguintes campos:
   - tipo: 'receita' (vendas, aulas, aluguéis) ou 'despesa' (compras, gastos, pagamentos)
   - valor_bruto: número decimal (valor principal da transação)
   - custo_produto: número decimal (custo de aquisição, se mencionado. Senão, 0)
   - descricao: texto descritivo claro do item/serviço
   - forma_pagamento: 'pix', 'dinheiro', 'cartao_credito' ou 'cartao_debito'
   - parcelas: número inteiro (default 1)
   - centro_de_custo: 'Loja' (equipamentos, produtos), 'Escola' (aulas, pacotes) ou 'Administrativo' (outros)
   - origem: 'venda_produto', 'aula', 'aluguel', 'pacote', 'trade_in' ou 'manual'

2. MAPEAMENTO DE FORMAS DE PAGAMENTO:
   - "pix", "PIX" → 'pix'
   - "dinheiro", "cash", "espécie" → 'dinheiro'  
   - "cartão", "crédito", "visa", "master", "elo", "parcelado", "Xx" (onde X é número) → 'cartao_credito'
   - "débito", "debito" → 'cartao_debito'
   - Se não especificado, use 'pix' como default

3. DETECÇÃO DE PARCELAS:
   - "10x", "em 10 vezes", "parcelado em 10" → parcelas: 10
   - "à vista", "1x", "avista" → parcelas: 1
   - Se crédito sem especificar parcelas → parcelas: 1

4. INFERÊNCIA DE CENTRO DE CUSTO:
   - Kites, pranchas, barras, trapézios, wetsuits, equipamentos → 'Loja'
   - Aulas, cursos, pacotes de horas, instrutores → 'Escola'
   - Combustível, manutenção, aluguel de espaço → 'Administrativo'

5. INFERÊNCIA DE ORIGEM:
   - Venda de equipamento/produto → 'venda_produto'
   - Aula ministrada → 'aula'
   - Aluguel de equipamento → 'aluguel'
   - Pacote de aulas/horas → 'pacote'
   - Trade-in/troca → 'trade_in'
   - Outros → 'manual'

EXEMPLOS:
- "Vendi um Kite Rebel usado por 4500 no pix, custo foi 2800"
  → tipo: 'receita', valor_bruto: 4500, custo_produto: 2800, descricao: 'Kite Rebel usado', forma_pagamento: 'pix', parcelas: 1, centro_de_custo: 'Loja', origem: 'venda_produto'

- "Aula de kite iniciante 350 reais cartão 3x"
  → tipo: 'receita', valor_bruto: 350, custo_produto: 0, descricao: 'Aula de kitesurf iniciante', forma_pagamento: 'cartao_credito', parcelas: 3, centro_de_custo: 'Escola', origem: 'aula'

- "Comprei gasolina pro barco 250 dinheiro"
  → tipo: 'despesa', valor_bruto: 250, custo_produto: 0, descricao: 'Combustível para barco', forma_pagamento: 'dinheiro', parcelas: 1, centro_de_custo: 'Administrativo', origem: 'manual'

RETORNE APENAS O JSON, sem explicações.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Texto muito curto ou inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    console.log("[parse-financial-text] Processando:", text);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_transaction",
              description: "Extrai dados estruturados de uma transação financeira",
              parameters: {
                type: "object",
                properties: {
                  tipo: {
                    type: "string",
                    enum: ["receita", "despesa"],
                    description: "Tipo da transação",
                  },
                  valor_bruto: {
                    type: "number",
                    description: "Valor principal da transação em reais",
                  },
                  custo_produto: {
                    type: "number",
                    description: "Custo de aquisição do produto (0 se não mencionado)",
                  },
                  descricao: {
                    type: "string",
                    description: "Descrição clara do item ou serviço",
                  },
                  forma_pagamento: {
                    type: "string",
                    enum: ["pix", "dinheiro", "cartao_credito", "cartao_debito"],
                    description: "Forma de pagamento utilizada",
                  },
                  parcelas: {
                    type: "integer",
                    description: "Número de parcelas (1 para à vista)",
                    minimum: 1,
                    maximum: 24,
                  },
                  centro_de_custo: {
                    type: "string",
                    enum: ["Loja", "Escola", "Administrativo"],
                    description: "Centro de custo da transação",
                  },
                  origem: {
                    type: "string",
                    enum: ["venda_produto", "aula", "aluguel", "pacote", "trade_in", "manual"],
                    description: "Origem/tipo específico da transação",
                  },
                },
                required: ["tipo", "valor_bruto", "descricao", "forma_pagamento", "parcelas", "centro_de_custo", "origem"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_transaction" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[parse-financial-text] OpenAI error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[parse-financial-text] OpenAI response:", JSON.stringify(data));

    // Extrair resultado do tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_transaction") {
      throw new Error("Resposta inesperada da IA");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Garantir defaults
    const result = {
      tipo: extracted.tipo || "receita",
      valor_bruto: Number(extracted.valor_bruto) || 0,
      custo_produto: Number(extracted.custo_produto) || 0,
      descricao: extracted.descricao || "",
      forma_pagamento: extracted.forma_pagamento || "pix",
      parcelas: Number(extracted.parcelas) || 1,
      centro_de_custo: extracted.centro_de_custo || "Loja",
      origem: extracted.origem || "manual",
    };

    console.log("[parse-financial-text] Resultado:", result);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[parse-financial-text] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
