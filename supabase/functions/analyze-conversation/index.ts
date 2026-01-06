import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { contato_id } = body;

    if (!contato_id) {
      return new Response(JSON.stringify({ error: 'contato_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[analyze-conversation] Analisando contato: ${contato_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar contato
    const { data: contato, error: contatoError } = await supabase
      .from('contatos_inteligencia')
      .select('*')
      .eq('id', contato_id)
      .single();

    if (contatoError || !contato) {
      console.error('[analyze-conversation] Contato não encontrado:', contatoError);
      return new Response(JSON.stringify({ error: 'Contato não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar mensagens do contato
    const { data: mensagens, error: mensagensError } = await supabase
      .from('conversas_whatsapp')
      .select('*')
      .eq('contato_id', contato_id)
      .order('data_mensagem', { ascending: true })
      .limit(100);

    if (mensagensError) {
      console.error('[analyze-conversation] Erro ao buscar mensagens:', mensagensError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar mensagens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!mensagens || mensagens.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Sem mensagens para analisar' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[analyze-conversation] ${mensagens.length} mensagens para análise`);

    // Formatar histórico para a IA
    const conversaFormatada = mensagens.map(msg => {
      const remetente = msg.is_from_me ? 'EMPRESA' : 'CLIENTE';
      const data = new Date(msg.data_mensagem).toLocaleString('pt-BR');
      return `[${data}] ${remetente}: ${msg.conteudo}`;
    }).join('\n');

    // Prompt para análise
    const prompt = `Você é um especialista em vendas e CRM para uma escola de kitesurf chamada GoKite.
Analise a seguinte conversa do WhatsApp e extraia insights comerciais.

CONTEXTO DO CONTATO:
- Nome: ${contato.nome || contato.whatsapp_profile_name || 'Desconhecido'}
- Telefone: ${contato.telefone}
- Status atual: ${contato.status || 'não classificado'}

CONVERSA:
${conversaFormatada}

RESPONDA EM JSON VÁLIDO com os seguintes campos:
{
  "resumo_ia": "resumo executivo da conversa em 2-3 frases",
  "sentimento_geral": "positivo|negativo|neutro",
  "probabilidade_conversao": número de 0 a 100,
  "score_engajamento": número de 0 a 100,
  "principais_interesses": ["interesse1", "interesse2"],
  "objecoes_identificadas": ["objecao1", "objecao2"],
  "gatilhos_compra": ["gatilho1", "gatilho2"],
  "proxima_acao_sugerida": "recomendação de próximo passo",
  "horario_preferido": "manhã|tarde|noite ou null",
  "dia_preferido": "nome do dia ou null",
  "status_sugerido": "lead_quente|lead_morno|lead_frio|cliente_potencial|nao_interessado"
}

Seja específico para o contexto de kitesurf. Considere:
- Interesse em aulas, aluguel de equipamentos, compra de produtos
- Nível de experiência (iniciante, intermediário, avançado)
- Urgência (quer agendar logo, está pesquisando, etc)
- Objeções comuns: preço, horário, condições climáticas, medo`;

    // Chamar OpenAI
    if (!openaiKey) {
      console.error('[analyze-conversation] OPENAI_API_KEY não configurada');
      return new Response(JSON.stringify({ error: 'API Key de IA não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um assistente de vendas especializado em análise de conversas. Responda apenas em JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[analyze-conversation] Erro OpenAI:', errorText);
      return new Response(JSON.stringify({ error: 'Erro ao analisar com IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiData = await openaiResponse.json();
    const analysisText = openaiData.choices?.[0]?.message?.content || '';
    
    console.log('[analyze-conversation] Resposta da IA:', analysisText);

    // Parse do JSON da resposta
    let analysis;
    try {
      // Limpar possíveis marcadores de código
      const cleanJson = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('[analyze-conversation] Erro ao parsear JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Erro ao processar resposta da IA',
        raw_response: analysisText 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atualizar contatos_inteligencia
    const { error: updateContatoError } = await supabase
      .from('contatos_inteligencia')
      .update({
        resumo_ia: analysis.resumo_ia,
        sentimento_predominante: analysis.sentimento_geral,
        score_interesse: analysis.probabilidade_conversao,
        engajamento_score: analysis.score_engajamento,
        interesse_principal: analysis.principais_interesses?.[0] || null,
        dores_identificadas: analysis.objecoes_identificadas || [],
        objecoes: analysis.objecoes_identificadas || [],
        gatilhos: analysis.gatilhos_compra || [],
        prioridade: analysis.probabilidade_conversao >= 70 ? 'alta' : 
                    analysis.probabilidade_conversao >= 40 ? 'media' : 'baixa',
        status: analysis.status_sugerido || contato.status,
        classificado_em: new Date().toISOString(),
        conversas_analisadas: (contato.conversas_analisadas || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contato_id);

    if (updateContatoError) {
      console.error('[analyze-conversation] Erro ao atualizar contato:', updateContatoError);
    }

    // Salvar/atualizar insights_conversas
    const insightsData = {
      contato_id: contato_id,
      resumo_ia: analysis.resumo_ia,
      sentimento_geral: analysis.sentimento_geral,
      probabilidade_conversao: analysis.probabilidade_conversao,
      score_engajamento: analysis.score_engajamento,
      principais_interesses: analysis.principais_interesses || [],
      objecoes_identificadas: analysis.objecoes_identificadas || [],
      gatilhos_compra: analysis.gatilhos_compra || [],
      proxima_acao_sugerida: analysis.proxima_acao_sugerida,
      horario_preferido: analysis.horario_preferido,
      dia_preferido: analysis.dia_preferido,
      total_mensagens: mensagens.length,
      mensagens_enviadas: mensagens.filter(m => m.is_from_me).length,
      mensagens_recebidas: mensagens.filter(m => !m.is_from_me).length,
      primeira_interacao: mensagens[0]?.data_mensagem,
      ultima_interacao: mensagens[mensagens.length - 1]?.data_mensagem,
      ultima_analise: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // UPSERT insights
    const { error: insightsError } = await supabase
      .from('insights_conversas')
      .upsert(insightsData, {
        onConflict: 'contato_id',
      });

    if (insightsError) {
      console.error('[analyze-conversation] Erro ao salvar insights:', insightsError);
    }

    console.log('[analyze-conversation] Análise concluída com sucesso');

    return new Response(JSON.stringify({
      success: true,
      contato_id,
      analysis,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-conversation] Erro geral:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
