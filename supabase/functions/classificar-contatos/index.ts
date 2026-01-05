import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 20;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { contatoIds } = await req.json();

    // Buscar contatos não classificados ou específicos
    let query = supabase
      .from('contatos_inteligencia')
      .select('*');

    if (contatoIds && contatoIds.length > 0) {
      query = query.in('id', contatoIds);
    } else {
      query = query.eq('status', 'nao_classificado').limit(BATCH_SIZE);
    }

    const { data: contatos, error: contatosError } = await query;

    if (contatosError) {
      throw new Error(`Erro ao buscar contatos: ${contatosError.message}`);
    }

    if (!contatos || contatos.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum contato para classificar", processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando ${contatos.length} contatos...`);

    // Para cada contato, buscar dados do CRM
    const contatosEnriquecidos = await Promise.all(
      contatos.map(async (contato) => {
        let dadosCRM = {
          total_aulas: 0,
          ultima_aula: null as string | null,
          total_gasto: 0,
          total_transacoes: 0,
          interesses: [] as string[],
        };

        // Buscar cliente vinculado ou por telefone/email
        const { data: cliente } = await supabase
          .from('clientes')
          .select('id, nome, email, telefone, tags')
          .or(`telefone.eq.${contato.telefone},email.eq.${contato.email}`)
          .maybeSingle();

        if (cliente) {
          // Vincular cliente se ainda não vinculado
          if (!contato.cliente_id) {
            await supabase
              .from('contatos_inteligencia')
              .update({ cliente_id: cliente.id })
              .eq('id', contato.id);
          }

          // Buscar aulas
          const { data: aulas } = await supabase
            .from('aulas')
            .select('id, data, tipo, status')
            .eq('cliente_id', cliente.id)
            .order('data', { ascending: false });

          if (aulas && aulas.length > 0) {
            dadosCRM.total_aulas = aulas.length;
            dadosCRM.ultima_aula = aulas[0].data;
            dadosCRM.interesses = [...new Set(aulas.map(a => a.tipo))];
          }

          // Buscar transações
          const { data: transacoes } = await supabase
            .from('transacoes')
            .select('valor_bruto, origem')
            .eq('cliente_id', cliente.id);

          if (transacoes && transacoes.length > 0) {
            dadosCRM.total_transacoes = transacoes.length;
            dadosCRM.total_gasto = transacoes.reduce((sum, t) => sum + Number(t.valor_bruto), 0);
          }
        }

        return { contato, dadosCRM, clienteExiste: !!cliente };
      })
    );

    // Classificar com IA em um único request
    const promptContatos = contatosEnriquecidos.map((item, index) => {
      return `
Contato ${index + 1}:
- ID: ${item.contato.id}
- Nome: ${item.contato.nome || 'Não informado'}
- Telefone: ${item.contato.telefone}
- Email: ${item.contato.email || 'Não informado'}
- Já é cliente no CRM: ${item.clienteExiste ? 'Sim' : 'Não'}
- Total de aulas: ${item.dadosCRM.total_aulas}
- Última aula: ${item.dadosCRM.ultima_aula || 'Nunca'}
- Total gasto: R$ ${item.dadosCRM.total_gasto.toFixed(2)}
- Interesses detectados: ${item.dadosCRM.interesses.join(', ') || 'Nenhum'}
`;
    }).join('\n---\n');

    const systemPrompt = `Você é um especialista em CRM e remarketing para uma escola de kitesurf (GoKite).
Analise os contatos abaixo e classifique cada um.

Para cada contato, retorne um objeto JSON com:
- id: o ID do contato
- status: "cliente_ativo" (aula nos últimos 6 meses), "cliente_inativo" (aula há mais de 6 meses), "lead" (nunca fez aula mas parece interessado), "invalido" (telefone incorreto ou sem potencial)
- score_interesse: 0-100 (baseado em histórico e potencial)
- dores_identificadas: array com possíveis dores entre ["preco", "distancia", "horario", "equipamento", "medo", "clima"]
- interesse_principal: "kite", "wing", "foil", "aluguel" ou "equipamento_usado"
- campanha_sugerida: "reativacao", "upsell", "trade_in", "indicacao" ou "boas_vindas"
- mensagem_personalizada: mensagem curta de WhatsApp (máx 200 chars) personalizada para esse contato
- prioridade: "baixa", "media", "alta" ou "urgente"
- resumo: análise em 1-2 frases

Retorne APENAS um array JSON válido com os objetos, sem texto adicional.`;

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
          { role: "user", content: promptContatos }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Parse JSON da resposta
    let classificacoes;
    try {
      // Limpar possíveis markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      classificacoes = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Erro ao parsear resposta da IA:", content);
      throw new Error("Resposta da IA não é JSON válido");
    }

    // Atualizar contatos no banco
    let updated = 0;
    for (const classificacao of classificacoes) {
      const { error: updateError } = await supabase
        .from('contatos_inteligencia')
        .update({
          status: classificacao.status,
          score_interesse: classificacao.score_interesse,
          dores_identificadas: classificacao.dores_identificadas,
          interesse_principal: classificacao.interesse_principal,
          campanha_sugerida: classificacao.campanha_sugerida,
          mensagem_personalizada: classificacao.mensagem_personalizada,
          prioridade: classificacao.prioridade,
          resumo_ia: classificacao.resumo,
          classificado_em: new Date().toISOString(),
        })
        .eq('id', classificacao.id);

      if (!updateError) {
        updated++;
      } else {
        console.error(`Erro ao atualizar contato ${classificacao.id}:`, updateError);
      }
    }

    console.log(`${updated} contatos classificados com sucesso`);

    return new Response(
      JSON.stringify({ 
        message: `${updated} contatos classificados com sucesso`,
        processed: updated,
        total: contatos.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Erro na classificação:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
