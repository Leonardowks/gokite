import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contatoId } = await req.json();

    if (!contatoId) {
      return new Response(
        JSON.stringify({ error: "contatoId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar conversas do contato
    const { data: conversas, error: conversasError } = await supabase
      .from("conversas_whatsapp")
      .select("*")
      .eq("contato_id", contatoId)
      .order("data_mensagem", { ascending: true });

    if (conversasError) {
      console.error("Erro ao buscar conversas:", conversasError);
      throw conversasError;
    }

    if (!conversas || conversas.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma conversa encontrada para este contato" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados do contato
    const { data: contato } = await supabase
      .from("contatos_inteligencia")
      .select("*")
      .eq("id", contatoId)
      .single();

    // Preparar texto das conversas para análise
    const conversasTexto = conversas
      .map((c: any) => `[${c.data_mensagem}] ${c.remetente}: ${c.conteudo}`)
      .join("\n");

    // Limitar tamanho para não exceder contexto
    const textoLimitado = conversasTexto.substring(0, 15000);

    console.log(`Analisando ${conversas.length} mensagens do contato ${contatoId}`);

    // Chamar Lovable AI para análise
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um analista de CRM especializado em escolas de kitesurf e esportes aquáticos.
Analise a conversa de WhatsApp abaixo e extraia insights comerciais detalhados.

RESPONDA APENAS EM JSON VÁLIDO com a seguinte estrutura:
{
  "intencao_compra": "alta" | "media" | "baixa" | "nenhuma",
  "interesse_principal": "kite" | "wing" | "foil" | "sup" | "aluguel" | "outro",
  "sentimento_geral": "positivo" | "neutro" | "negativo",
  "objecoes": ["lista de objeções mencionadas"],
  "gatilhos_compra": ["o que motivaria a compra"],
  "horario_preferido": "manha" | "tarde" | "noite",
  "dia_preferido": "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado" | "domingo",
  "experiencia_nivel": "iniciante" | "intermediario" | "avancado",
  "score_engajamento": 0-100,
  "probabilidade_conversao": 0-100,
  "proxima_acao_sugerida": "sugestão de próxima ação comercial",
  "resumo_comercial": "resumo em 2-3 frases do potencial comercial",
  "palavras_chave": ["termos relevantes mencionados"],
  "dados_extraidos": {
    "datas_mencionadas": [],
    "valores_mencionados": [],
    "pessoas_mencionadas": [],
    "locais_mencionados": []
  }
}`,
          },
          {
            role: "user",
            content: `Analise esta conversa de WhatsApp de uma escola de kitesurf:

Nome do contato: ${contato?.nome || "Desconhecido"}
Telefone: ${contato?.telefone || ""}
Status atual: ${contato?.status || "não classificado"}

CONVERSAS:
${textoLimitado}

Retorne APENAS o JSON com a análise, sem explicações adicionais.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("Erro da IA:", aiResponse.status, errorText);
      throw new Error(`Erro da IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const conteudoResposta = aiData.choices?.[0]?.message?.content;

    if (!conteudoResposta) {
      throw new Error("Resposta vazia da IA");
    }

    // Extrair JSON da resposta
    let analise;
    try {
      // Tentar extrair JSON do texto
      const jsonMatch = conteudoResposta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analise = JSON.parse(jsonMatch[0]);
      } else {
        analise = JSON.parse(conteudoResposta);
      }
    } catch (parseError) {
      console.error("Erro ao parsear resposta da IA:", parseError);
      console.log("Resposta recebida:", conteudoResposta);
      throw new Error("Resposta da IA não é um JSON válido");
    }

    console.log("Análise extraída:", analise);

    // Calcular estatísticas das conversas
    const mensagensCliente = conversas.filter((c: any) => c.remetente === "cliente").length;
    const mensagensEmpresa = conversas.filter((c: any) => c.remetente === "empresa").length;
    const primeiraInteracao = conversas[0]?.data_mensagem;
    const ultimaInteracao = conversas[conversas.length - 1]?.data_mensagem;

    // Calcular tempo médio de resposta (simplificado)
    let tempoMedioResposta = null;
    const temposResposta: number[] = [];
    for (let i = 1; i < conversas.length; i++) {
      if (conversas[i].remetente !== conversas[i - 1].remetente) {
        const tempo = new Date(conversas[i].data_mensagem).getTime() - 
                      new Date(conversas[i - 1].data_mensagem).getTime();
        temposResposta.push(tempo / 60000); // em minutos
      }
    }
    if (temposResposta.length > 0) {
      tempoMedioResposta = temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length;
    }

    // Salvar ou atualizar insights
    const insightsData = {
      contato_id: contatoId,
      total_mensagens: conversas.length,
      mensagens_enviadas: mensagensEmpresa,
      mensagens_recebidas: mensagensCliente,
      primeira_interacao: primeiraInteracao,
      ultima_interacao: ultimaInteracao,
      tempo_medio_resposta_minutos: tempoMedioResposta,
      horario_preferido: analise.horario_preferido,
      dia_preferido: analise.dia_preferido,
      sentimento_geral: analise.sentimento_geral,
      principais_interesses: analise.interesse_principal ? [analise.interesse_principal] : [],
      objecoes_identificadas: analise.objecoes || [],
      gatilhos_compra: analise.gatilhos_compra || [],
      score_engajamento: analise.score_engajamento || 0,
      probabilidade_conversao: analise.probabilidade_conversao || 0,
      proxima_acao_sugerida: analise.proxima_acao_sugerida,
      resumo_ia: analise.resumo_comercial,
      ultima_analise: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("insights_conversas")
      .upsert(insightsData, { onConflict: "contato_id" });

    if (upsertError) {
      console.error("Erro ao salvar insights:", upsertError);
      throw upsertError;
    }

    // Atualizar contato com insights resumidos
    const { error: updateContatoError } = await supabase
      .from("contatos_inteligencia")
      .update({
        interesse_principal: analise.interesse_principal,
        sentimento_predominante: analise.sentimento_geral,
        engajamento_score: analise.score_engajamento || 0,
        objecoes: analise.objecoes || [],
        gatilhos: analise.gatilhos_compra || [],
        resumo_ia: analise.resumo_comercial,
        score_interesse: analise.probabilidade_conversao || 0,
        prioridade: analise.probabilidade_conversao > 70 ? "alta" : 
                    analise.probabilidade_conversao > 40 ? "media" : "baixa",
        classificado_em: new Date().toISOString(),
      })
      .eq("id", contatoId);

    if (updateContatoError) {
      console.error("Erro ao atualizar contato:", updateContatoError);
    }

    // Atualizar sentimento e intenção nas mensagens individuais
    for (const conversa of conversas.slice(-50)) { // Atualizar últimas 50 mensagens
      await supabase
        .from("conversas_whatsapp")
        .update({
          sentimento: analise.sentimento_geral,
          palavras_chave: analise.palavras_chave || [],
          dados_extraidos: analise.dados_extraidos || {},
        })
        .eq("id", conversa.id);
    }

    console.log(`Análise concluída para contato ${contatoId}`);

    return new Response(
      JSON.stringify({
        success: true,
        insights: insightsData,
        analise,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função analisar-conversas:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
