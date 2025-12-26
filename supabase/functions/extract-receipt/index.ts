import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();

    if (!image_base64) {
      throw new Error("Imagem não fornecida");
    }

    console.log("Processando imagem de recibo/nota fiscal...");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Use vision model to extract data from receipt
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Você é um assistente especializado em extrair informações de notas fiscais e recibos.
            
Analise a imagem e extraia as seguintes informações:
- valor: O valor total em reais (número)
- descricao: Descrição do produto/serviço
- categoria: Uma das seguintes: combustivel, manutencao, equipamentos, funcionarios, alimentacao, transporte, outros
- data: Data da nota fiscal no formato YYYY-MM-DD (se visível)
- fornecedor: Nome do estabelecimento ou fornecedor

Responda APENAS com um objeto JSON válido, sem texto adicional.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia as informações desta nota fiscal/recibo:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt_data",
              description: "Extrai dados estruturados de uma nota fiscal ou recibo",
              parameters: {
                type: "object",
                properties: {
                  valor: { type: "number", description: "Valor total em reais" },
                  descricao: { type: "string", description: "Descrição do produto/serviço" },
                  categoria: { 
                    type: "string", 
                    enum: ["combustivel", "manutencao", "equipamentos", "funcionarios", "alimentacao", "transporte", "outros"],
                    description: "Categoria da despesa" 
                  },
                  data: { type: "string", description: "Data no formato YYYY-MM-DD" },
                  fornecedor: { type: "string", description: "Nome do fornecedor" },
                  confianca: { 
                    type: "number", 
                    description: "Nível de confiança da extração de 0 a 100" 
                  }
                },
                required: ["valor", "categoria", "confianca"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt_data" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API:", errorText);
      throw new Error("Falha ao processar imagem com IA");
    }

    const aiData = await response.json();
    console.log("Resposta da IA:", JSON.stringify(aiData));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("IA não conseguiu extrair dados da imagem");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        message: `Dados extraídos com ${extractedData.confianca}% de confiança`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
