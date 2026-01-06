import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Processa análises de IA em background
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar próximos itens da fila (ordenados por prioridade e data)
    const { data: queueItems, error: queueError } = await supabase
      .from("analise_queue")
      .select("*")
      .eq("status", "pendente")
      .order("prioridade", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(5);

    if (queueError) {
      console.error("Erro ao buscar fila:", queueError);
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("[Processar Queue] Nenhum item na fila");
      return new Response(
        JSON.stringify({ success: true, message: "Fila vazia", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Processar Queue] Processando ${queueItems.length} itens`);

    let processed = 0;
    let errors = 0;

    for (const item of queueItems) {
      try {
        // Marcar como processando
        await supabase
          .from("analise_queue")
          .update({ 
            status: "processando",
            tentativas: (item.tentativas || 0) + 1,
          })
          .eq("id", item.id);

        // Buscar conversas do contato
        const { data: conversas, error: conversasError } = await supabase
          .from("conversas_whatsapp")
          .select("*")
          .eq("contato_id", item.contato_id)
          .order("data_mensagem", { ascending: true });

        if (conversasError || !conversas || conversas.length === 0) {
          console.log(`[Processar Queue] Sem conversas para ${item.contato_id}`);
          await supabase
            .from("analise_queue")
            .update({ status: "erro", erro: "Sem conversas" })
            .eq("id", item.id);
          errors++;
          continue;
        }

        // Buscar dados do contato
        const { data: contato } = await supabase
          .from("contatos_inteligencia")
          .select("*")
          .eq("id", item.contato_id)
          .single();

        // Preparar texto das conversas para análise (últimas mensagens)
        const ultimasConversas = conversas.slice(-30);
        const conversasTexto = ultimasConversas
          .map((c: any) => `[${c.data_mensagem}] ${c.remetente}: ${c.conteudo}`)
          .join("\n");

        const textoLimitado = conversasTexto.substring(0, 8000);

        console.log(`[Processar Queue] Analisando ${ultimasConversas.length} mensagens de ${item.contato_id}`);

        // Chamar Lovable AI para análise rápida
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite", // Modelo mais rápido para análise em background
            messages: [
              {
                role: "system",
                content: `Você é um analista de CRM de uma escola de kitesurf. Analise a conversa e extraia insights comerciais rapidamente.

RESPONDA APENAS EM JSON VÁLIDO:
{
  "intencao_compra": "alta" | "media" | "baixa" | "nenhuma",
  "sentimento": "positivo" | "neutro" | "negativo",
  "urgencia": "imediata" | "proximos_dias" | "futuro" | "sem_urgencia",
  "score_interesse": 0-100,
  "proxima_acao": "string curta com próxima ação sugerida",
  "tags": ["palavras-chave relevantes"],
  "resumo": "1 frase resumindo o interesse do cliente"
}`,
              },
              {
                role: "user",
                content: `Contato: ${contato?.nome || "Desconhecido"}
Status: ${contato?.status || "não classificado"}

ÚLTIMAS MENSAGENS:
${textoLimitado}

Retorne APENAS o JSON.`,
              },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const status = aiResponse.status;
          if (status === 429) {
            // Rate limit - reagendar com delay
            console.log(`[Processar Queue] Rate limit para ${item.contato_id}`);
            await supabase
              .from("analise_queue")
              .update({ 
                status: "pendente",
                erro: "Rate limit - reagendado",
              })
              .eq("id", item.id);
            errors++;
            continue;
          }
          throw new Error(`IA error: ${status}`);
        }

        const aiData = await aiResponse.json();
        const conteudoResposta = aiData.choices?.[0]?.message?.content;

        if (!conteudoResposta) {
          throw new Error("Resposta vazia da IA");
        }

        // Extrair JSON
        let analise;
        try {
          const jsonMatch = conteudoResposta.match(/\{[\s\S]*\}/);
          analise = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(conteudoResposta);
        } catch (parseError) {
          console.error(`[Processar Queue] Erro ao parsear resposta:`, conteudoResposta);
          throw new Error("JSON inválido da IA");
        }

        // Calcular estatísticas básicas
        const mensagensCliente = conversas.filter((c: any) => c.remetente === "cliente").length;
        const mensagensEmpresa = conversas.filter((c: any) => c.remetente === "empresa").length;

        // Definir prioridade baseada na análise
        const novaPrioridade = 
          analise.intencao_compra === "alta" || analise.urgencia === "imediata" ? "alta" :
          analise.intencao_compra === "media" || analise.urgencia === "proximos_dias" ? "media" : "baixa";

        // Atualizar insights_conversas
        await supabase
          .from("insights_conversas")
          .upsert({
            contato_id: item.contato_id,
            total_mensagens: conversas.length,
            mensagens_enviadas: mensagensEmpresa,
            mensagens_recebidas: mensagensCliente,
            primeira_interacao: conversas[0]?.data_mensagem,
            ultima_interacao: conversas[conversas.length - 1]?.data_mensagem,
            sentimento_geral: analise.sentimento,
            score_engajamento: analise.score_interesse || 0,
            probabilidade_conversao: analise.score_interesse || 0,
            proxima_acao_sugerida: analise.proxima_acao,
            resumo_ia: analise.resumo,
            ultima_analise: new Date().toISOString(),
          }, { onConflict: "contato_id" });

        // Atualizar contato
        await supabase
          .from("contatos_inteligencia")
          .update({
            sentimento_predominante: analise.sentimento,
            engajamento_score: analise.score_interesse || 0,
            score_interesse: analise.score_interesse || 0,
            resumo_ia: analise.resumo,
            prioridade: novaPrioridade,
            status: analise.intencao_compra === "alta" ? "lead_quente" : 
                   analise.intencao_compra === "media" ? "lead" : contato?.status,
            classificado_em: new Date().toISOString(),
          })
          .eq("id", item.contato_id);

        // Marcar como concluído e remover da fila
        await supabase
          .from("analise_queue")
          .update({ 
            status: "concluido",
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        console.log(`[Processar Queue] Contato ${item.contato_id} analisado: score=${analise.score_interesse}, prioridade=${novaPrioridade}`);
        processed++;

        // Pequena pausa entre análises para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (itemError) {
        console.error(`[Processar Queue] Erro ao processar ${item.id}:`, itemError);
        
        // Marcar erro ou reagendar baseado em tentativas
        if ((item.tentativas || 0) >= 3) {
          await supabase
            .from("analise_queue")
            .update({ 
              status: "erro",
              erro: itemError instanceof Error ? itemError.message : "Erro desconhecido",
            })
            .eq("id", item.id);
        } else {
          await supabase
            .from("analise_queue")
            .update({ 
              status: "pendente",
              erro: itemError instanceof Error ? itemError.message : "Erro",
            })
            .eq("id", item.id);
        }
        errors++;
      }
    }

    console.log(`[Processar Queue] Finalizado: ${processed} processados, ${errors} erros`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        errors,
        total: queueItems.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Processar Queue] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
