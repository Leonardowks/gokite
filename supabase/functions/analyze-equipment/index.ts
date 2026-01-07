import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EquipmentAnalysis {
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  tamanho: string | null;
  ano: number | null;
  condicao: string;
  scoreCondicao: number;
  descricaoComercial: string;
  detalhesVisuais: string;
  problemasIdentificados: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const body = await req.json();
    
    // Extensões de vídeo que devem ser filtradas (não suportadas pela IA Vision)
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v', '.3gp'];
    const isVideoUrl = (url: string): boolean => {
      const lowerUrl = url.toLowerCase();
      return videoExtensions.some(ext => lowerUrl.includes(ext));
    };
    
    // Suporte para array de imagens (novo) ou imagem única (retrocompatível)
    let imageUrls: string[] = [];
    
    if (body.imageUrls && Array.isArray(body.imageUrls)) {
      // Filtrar URLs vazias E arquivos de vídeo
      imageUrls = body.imageUrls.filter((url: string) => 
        url && url.trim() !== "" && !isVideoUrl(url)
      );
    } else if (body.imageUrl && !isVideoUrl(body.imageUrl)) {
      imageUrls = [body.imageUrl];
    } else if (body.imageBase64) {
      imageUrls = [body.imageBase64];
    }

    if (imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma imagem válida encontrada. Formatos suportados: PNG, JPEG, WebP, GIF. Vídeos não são suportados." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numFotos = imageUrls.length;
    console.log(`Analisando ${numFotos} foto(s) do equipamento com IA Vision...`);

    // Montar array de conteúdo de imagens para enviar ao modelo
    const imageContents = imageUrls.map((url, index) => ({
      type: "image_url" as const,
      image_url: { url }
    }));

    const systemPrompt = `Você é um especialista em equipamentos de kitesurf, wing foil e esportes aquáticos. 
${numFotos > 1 ? `Você receberá ${numFotos} fotos do MESMO equipamento de diferentes ângulos.` : 'Analise a foto do equipamento.'}

${numFotos > 1 ? `
INSTRUÇÕES PARA MÚLTIPLAS FOTOS:
- Analise CADA foto cuidadosamente para extrair informações complementares
- Foto 1 pode mostrar: logo, visual geral, cor
- Foto 2 pode mostrar: etiqueta com marca/modelo/ano/tamanho
- Fotos adicionais: detalhes de desgaste, costuras, válvulas, reparos
- COMBINE todas as informações em UMA análise consolidada
- O score de condição deve considerar TODAS as fotos (ex: se uma foto mostra desgaste, considere isso)
- Liste TODOS os problemas vistos em QUALQUER uma das fotos
` : ''}

CATEGORIAS VÁLIDAS:
- kite: Kites de todas as marcas e modelos
- prancha: Twin-tips, wave boards, foilboards
- wing: Wings para wing foil
- barra: Barras e linhas de kite
- trapezio: Trapézios (seat ou waist harness)
- wetsuit: Roupas de neoprene
- acessorio: Bombas, leash, capacetes, coletes, etc.

MARCAS CONHECIDAS:
Duotone, Core, Ozone, North, Cabrinha, Slingshot, F-One, Naish, Liquid Force, RRD, Airush, Eleveight, Ocean Rodeo, Crazyfly, Gong, Armstrong, Axis, Mystic, ION, O'Neill, Rip Curl

CONDIÇÕES (escolha uma):
- novo: Equipamento nunca usado, com tags/embalagem original
- seminovo: Pouquíssimo uso, excelente estado, quase imperceptível
- usado_bom: Uso normal, bom estado geral, pequenos sinais de uso
- usado_regular: Sinais visíveis de desgaste, mas funcional
- desgastado: Muito usado, desgaste significativo, preço baixo

SCORE DE CONDIÇÃO: De 1 a 10 (10 = perfeito, 1 = muito desgastado)
${numFotos > 1 ? '- Baseie o score na PIOR condição vista entre TODAS as fotos' : ''}

Responda SEMPRE neste formato JSON exato:
{
  "categoria": "kite",
  "marca": "Duotone",
  "modelo": "Rebel",
  "tamanho": "12m",
  "ano": 2023,
  "condicao": "usado_bom",
  "scoreCondicao": 7,
  "descricaoComercial": "Uma descrição atrativa de 2-3 linhas para venda",
  "detalhesVisuais": "Descrição técnica consolidada de TODAS as fotos analisadas",
  "problemasIdentificados": ["lista", "de", "problemas", "vistos em qualquer foto"]
}

Se não conseguir identificar algum campo, use null. Nunca invente informações - se não tiver certeza, deixe null.`;

    const userPrompt = numFotos > 1 
      ? `Analise estas ${numFotos} fotos do MESMO equipamento de kitesurf/wing. Combine as informações de todos os ângulos para uma análise completa. Responda apenas com o JSON.`
      : "Analise este equipamento de kitesurf/wing e extraia todas as informações possíveis. Responda apenas com o JSON.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...imageContents
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API Lovable AI:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    console.log("Resposta da IA:", content);

    // Extrair JSON da resposta (pode vir com markdown)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Tentar parsear o JSON
    let analysis: EquipmentAnalysis;
    try {
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", parseError, "Conteúdo:", jsonStr);
      // Retornar análise parcial
      analysis = {
        categoria: null,
        marca: null,
        modelo: null,
        tamanho: null,
        ano: null,
        condicao: "usado_bom",
        scoreCondicao: 5,
        descricaoComercial: "Equipamento de kitesurf/wing em bom estado. Consulte para mais detalhes.",
        detalhesVisuais: content,
        problemasIdentificados: []
      };
    }

    // Validar e normalizar campos
    const categoriasValidas = ["kite", "prancha", "wing", "barra", "trapezio", "wetsuit", "acessorio"];
    const condicoesValidas = ["novo", "seminovo", "usado_bom", "usado_regular", "desgastado"];

    if (analysis.categoria && !categoriasValidas.includes(analysis.categoria)) {
      analysis.categoria = null;
    }
    if (!condicoesValidas.includes(analysis.condicao)) {
      analysis.condicao = "usado_bom";
    }
    if (typeof analysis.scoreCondicao !== "number" || analysis.scoreCondicao < 1 || analysis.scoreCondicao > 10) {
      analysis.scoreCondicao = 5;
    }

    console.log(`Análise de ${numFotos} foto(s) finalizada:`, analysis);

    return new Response(
      JSON.stringify({ success: true, analysis, fotosAnalisadas: numFotos }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro ao analisar equipamento:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
