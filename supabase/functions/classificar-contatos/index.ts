import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Processar até 500 contatos por request, em sub-lotes de 50 para a IA
const TOTAL_BATCH_SIZE = 500;
const AI_BATCH_SIZE = 50;
const PARALLEL_AI_CALLS = 5; // 5 chamadas paralelas de 50 = 250 contatos simultâneos

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

    const { contatoIds, batchSize } = await req.json();
    const effectiveBatchSize = Math.min(batchSize || TOTAL_BATCH_SIZE, 1000);

    // Buscar contatos não classificados ou específicos
    let query = supabase
      .from('contatos_inteligencia')
      .select('*');

    if (contatoIds && contatoIds.length > 0) {
      query = query.in('id', contatoIds);
    } else {
      query = query.eq('status', 'nao_classificado').limit(effectiveBatchSize);
    }

    const { data: contatos, error: contatosError } = await query;

    if (contatosError) {
      throw new Error(`Erro ao buscar contatos: ${contatosError.message}`);
    }

    if (!contatos || contatos.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum contato para classificar", processed: 0, remaining: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando ${contatos.length} contatos em lotes de ${AI_BATCH_SIZE}...`);

    // Buscar todos os clientes de uma vez para evitar N+1 queries
    const telefones = contatos.map(c => c.telefone);
    const emails = contatos.filter(c => c.email).map(c => c.email);
    
    const { data: clientesExistentes } = await supabase
      .from('clientes')
      .select('id, nome, email, telefone, tags')
      .or(`telefone.in.(${telefones.join(',')}),email.in.(${emails.join(',')})`);

    const clientesPorTelefone = new Map(
      (clientesExistentes || []).map(c => [c.telefone, c])
    );
    const clientesPorEmail = new Map(
      (clientesExistentes || []).filter(c => c.email).map(c => [c.email, c])
    );

    // Buscar aulas e transações em batch se houver clientes
    const clienteIds = (clientesExistentes || []).map(c => c.id);
    
    let aulasPorCliente = new Map<string, any[]>();
    let transacoesPorCliente = new Map<string, any[]>();

    if (clienteIds.length > 0) {
      const { data: todasAulas } = await supabase
        .from('aulas')
        .select('id, data, tipo, status, cliente_id')
        .in('cliente_id', clienteIds)
        .order('data', { ascending: false });

      const { data: todasTransacoes } = await supabase
        .from('transacoes')
        .select('valor_bruto, origem, cliente_id')
        .in('cliente_id', clienteIds);

      // Agrupar por cliente
      (todasAulas || []).forEach(aula => {
        if (!aulasPorCliente.has(aula.cliente_id)) {
          aulasPorCliente.set(aula.cliente_id, []);
        }
        aulasPorCliente.get(aula.cliente_id)!.push(aula);
      });

      (todasTransacoes || []).forEach(t => {
        if (!transacoesPorCliente.has(t.cliente_id)) {
          transacoesPorCliente.set(t.cliente_id, []);
        }
        transacoesPorCliente.get(t.cliente_id)!.push(t);
      });
    }

    // Enriquecer contatos (sem queries individuais agora)
    const contatosEnriquecidos = contatos.map((contato) => {
      const cliente = clientesPorTelefone.get(contato.telefone) || 
                     (contato.email ? clientesPorEmail.get(contato.email) : null);
      
      let dadosCRM = {
        total_aulas: 0,
        ultima_aula: null as string | null,
        total_gasto: 0,
        total_transacoes: 0,
        interesses: [] as string[],
      };

      if (cliente) {
        const aulas = aulasPorCliente.get(cliente.id) || [];
        const transacoes = transacoesPorCliente.get(cliente.id) || [];

        if (aulas.length > 0) {
          dadosCRM.total_aulas = aulas.length;
          dadosCRM.ultima_aula = aulas[0].data;
          dadosCRM.interesses = [...new Set(aulas.map(a => a.tipo))];
        }

        if (transacoes.length > 0) {
          dadosCRM.total_transacoes = transacoes.length;
          dadosCRM.total_gasto = transacoes.reduce((sum, t) => sum + Number(t.valor_bruto), 0);
        }
      }

      return { contato, dadosCRM, clienteExiste: !!cliente, clienteId: cliente?.id };
    });

    // Dividir em sub-lotes para IA
    const subLotes: typeof contatosEnriquecidos[] = [];
    for (let i = 0; i < contatosEnriquecidos.length; i += AI_BATCH_SIZE) {
      subLotes.push(contatosEnriquecidos.slice(i, i + AI_BATCH_SIZE));
    }

    console.log(`Dividido em ${subLotes.length} sub-lotes para classificação IA`);

    // Função para classificar um lote
    async function classificarLote(lote: typeof contatosEnriquecidos): Promise<any[]> {
      const promptContatos = lote.map((item, index) => {
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
- id: o ID do contato (COPIE EXATAMENTE o ID fornecido)
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
          throw new Error("RATE_LIMIT");
        }
        if (response.status === 402) {
          throw new Error("PAYMENT_REQUIRED");
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content;

      if (!content) {
        console.error("Resposta vazia da IA para lote");
        return [];
      }

      try {
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanContent);
      } catch (parseError) {
        console.error("Erro ao parsear resposta da IA:", content.substring(0, 500));
        return [];
      }
    }

    // Processar sub-lotes em paralelo (com limite de concorrência)
    let todasClassificacoes: any[] = [];
    let rateLimited = false;
    let paymentRequired = false;

    for (let i = 0; i < subLotes.length; i += PARALLEL_AI_CALLS) {
      if (rateLimited || paymentRequired) break;

      const lotesParalelos = subLotes.slice(i, i + PARALLEL_AI_CALLS);
      console.log(`Processando lotes ${i + 1} a ${Math.min(i + PARALLEL_AI_CALLS, subLotes.length)} de ${subLotes.length}...`);

      try {
        const resultados = await Promise.all(
          lotesParalelos.map(lote => classificarLote(lote).catch(err => {
            if (err.message === "RATE_LIMIT") rateLimited = true;
            if (err.message === "PAYMENT_REQUIRED") paymentRequired = true;
            return [];
          }))
        );

        todasClassificacoes = todasClassificacoes.concat(resultados.flat());
      } catch (error) {
        console.error("Erro ao processar lotes paralelos:", error);
      }

      // Pequena pausa entre grupos de chamadas paralelas para evitar rate limit
      if (i + PARALLEL_AI_CALLS < subLotes.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (rateLimited) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. Alguns contatos foram processados.",
          processed: todasClassificacoes.length,
          total: contatos.length
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (paymentRequired) {
      return new Response(
        JSON.stringify({ 
          error: "Créditos insuficientes. Alguns contatos foram processados.",
          processed: todasClassificacoes.length,
          total: contatos.length
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vincular clientes e atualizar contatos em batch
    const updates = todasClassificacoes.map(classificacao => ({
      id: classificacao.id,
      status: classificacao.status,
      score_interesse: classificacao.score_interesse,
      dores_identificadas: classificacao.dores_identificadas,
      interesse_principal: classificacao.interesse_principal,
      campanha_sugerida: classificacao.campanha_sugerida,
      mensagem_personalizada: classificacao.mensagem_personalizada,
      prioridade: classificacao.prioridade,
      resumo_ia: classificacao.resumo,
      classificado_em: new Date().toISOString(),
    }));

    // Atualizar em batches de 100 para evitar timeout
    let updated = 0;
    for (let i = 0; i < updates.length; i += 100) {
      const batch = updates.slice(i, i + 100);
      
      const updatePromises = batch.map(update => 
        supabase
          .from('contatos_inteligencia')
          .update(update)
          .eq('id', update.id)
      );

      const results = await Promise.all(updatePromises);
      updated += results.filter(r => !r.error).length;
    }

    // Vincular clientes que foram encontrados
    const vinculacoes = contatosEnriquecidos
      .filter(c => c.clienteId && !c.contato.cliente_id)
      .map(c => ({ id: c.contato.id, cliente_id: c.clienteId }));

    if (vinculacoes.length > 0) {
      await Promise.all(
        vinculacoes.map(v =>
          supabase
            .from('contatos_inteligencia')
            .update({ cliente_id: v.cliente_id })
            .eq('id', v.id)
        )
      );
      console.log(`${vinculacoes.length} contatos vinculados a clientes existentes`);
    }

    // Verificar quantos ainda faltam
    const { count: remaining } = await supabase
      .from('contatos_inteligencia')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'nao_classificado');

    console.log(`${updated} contatos classificados com sucesso. Restam ${remaining || 0} não classificados.`);

    return new Response(
      JSON.stringify({ 
        message: `${updated} contatos classificados com sucesso`,
        processed: updated,
        total: contatos.length,
        remaining: remaining || 0
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
