import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichResult {
  success: boolean;
  enriched: number;
  enrichedByAI: number;
  failed: number;
  total: number;
  errors: string[];
}

interface EvolutionConfig {
  api_url: string;
  api_key: string;
  instance_name: string;
}

// Buscar perfil do contato na Evolution API
async function fetchContactProfile(
  config: EvolutionConfig,
  remoteJid: string
): Promise<{ pushName?: string; isBusiness?: boolean; businessName?: string } | null> {
  try {
    const response = await fetch(
      `${config.api_url}/chat/fetchProfile/${config.instance_name}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.api_key,
        },
        body: JSON.stringify({ number: remoteJid }),
      }
    );

    if (!response.ok) {
      console.log(`[enrich] Erro ao buscar perfil para ${remoteJid}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      pushName: data.name || data.pushname || data.pushName || null,
      isBusiness: data.isBusiness || false,
      businessName: data.businessName || null,
    };
  } catch (error) {
    console.error(`[enrich] Erro fetchProfile para ${remoteJid}:`, error);
    return null;
  }
}

// Buscar foto de perfil na Evolution API
async function fetchProfilePicture(
  config: EvolutionConfig,
  remoteJid: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${config.api_url}/chat/fetchProfilePictureUrl/${config.instance_name}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.api_key,
        },
        body: JSON.stringify({ number: remoteJid }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.profilePictureUrl || data.imgUrl || data.picture || null;
  } catch (error) {
    console.error(`[enrich] Erro fetchProfilePicture para ${remoteJid}:`, error);
    return null;
  }
}

interface MensagemConversa {
  conteudo: string;
  remetente: string;
  is_from_me: boolean | null;
  push_name: string | null;
  data_mensagem: string;
}

// Extrair nome das conversas usando IA (Lovable AI)
async function extractNameFromConversationsWithAI(
  supabaseClient: any,
  contatoId: string,
  telefone: string
): Promise<string | null> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.log('[enrich-ai] LOVABLE_API_KEY não configurada');
      return null;
    }

    // Buscar últimas mensagens do contato
    const { data: mensagens, error: msgError } = await supabaseClient
      .from('conversas_whatsapp')
      .select('conteudo, remetente, is_from_me, push_name, data_mensagem')
      .eq('contato_id', contatoId)
      .order('data_mensagem', { ascending: false })
      .limit(30) as { data: MensagemConversa[] | null; error: any };

    if (msgError || !mensagens || mensagens.length === 0) {
      console.log(`[enrich-ai] Sem mensagens para contato ${contatoId}`);
      return null;
    }

    // Verificar se já temos push_name nas mensagens RECEBIDAS (não as nossas)
    const mensagensRecebidas = mensagens.filter((m: MensagemConversa) => !m.is_from_me);
    const pushNameFromMessages = mensagensRecebidas.find(
      (m: MensagemConversa) => m.push_name && 
        !m.push_name.match(/^\d+$/) && 
        m.push_name.toLowerCase() !== 'você'
    )?.push_name;
    
    if (pushNameFromMessages) {
      console.log(`[enrich-ai] Nome encontrado no push_name: ${pushNameFromMessages}`);
      return pushNameFromMessages;
    }

    // Preparar contexto das mensagens (apenas mensagens do contato, não as nossas)
    const mensagensDoContato = mensagens
      .filter((m: MensagemConversa) => !m.is_from_me)
      .map((m: MensagemConversa) => m.conteudo)
      .slice(0, 15)
      .join('\n');

    if (!mensagensDoContato || mensagensDoContato.length < 10) {
      console.log(`[enrich-ai] Poucas mensagens do contato ${contatoId}`);
      return null;
    }

    const prompt = `Analise as seguintes mensagens de WhatsApp e extraia APENAS o nome da pessoa que está enviando.

REGRAS:
- Se a pessoa se apresentou ("Oi, sou o João", "Aqui é a Maria", "Meu nome é Pedro"), extraia o nome.
- Se a pessoa assinou a mensagem ("Abraços, Carlos", "Att, Ana"), extraia o nome.
- Se mencionar "me chamo", "sou o/a", "aqui é", extraia o nome.
- Retorne APENAS o primeiro nome ou nome completo.
- Se não conseguir identificar um nome com certeza, retorne "null".
- NÃO invente nomes. Se não tiver certeza, retorne "null".
- Ignore números de telefone, emojis e saudações genéricas.

MENSAGENS:
${mensagensDoContato}

RESPONDA APENAS COM O NOME OU "null":`;

    console.log(`[enrich-ai] Chamando IA para extrair nome do contato ${contatoId}`);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 50,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[enrich-ai] Erro na API Lovable AI: ${aiResponse.status} - ${errorText}`);
      return null;
    }

    const aiData = await aiResponse.json();
    const extractedName = aiData.choices?.[0]?.message?.content?.trim();

    console.log(`[enrich-ai] Resposta IA: "${extractedName}"`);

    // Validar resposta
    if (!extractedName || 
        extractedName.toLowerCase() === 'null' || 
        extractedName.length < 2 || 
        extractedName.length > 50 ||
        extractedName.match(/^\d+$/) ||
        extractedName.toLowerCase().includes('não') ||
        extractedName.toLowerCase().includes('impossível')) {
      return null;
    }

    // Limpar nome (remover aspas, pontuação extra)
    const cleanName = extractedName
      .replace(/["'`]/g, '')
      .replace(/^(nome:|name:)/i, '')
      .trim();

    if (cleanName.length >= 2 && cleanName.length <= 50) {
      console.log(`[enrich-ai] Nome extraído com IA: ${cleanName}`);
      return cleanName;
    }

    return null;
  } catch (error) {
    console.error(`[enrich-ai] Erro ao extrair nome com IA:`, error);
    return null;
  }
}

// Pequena pausa entre requisições para não sobrecarregar a API
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Opções do request
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 50;
    const forceUpdate = body.forceUpdate || false;
    const useAIFallback = body.useAIFallback !== false; // Habilitado por padrão

    console.log(`[enrich] Iniciando enriquecimento. Batch: ${batchSize}, Force: ${forceUpdate}, AI Fallback: ${useAIFallback}`);

    // Buscar configuração da Evolution API (opcional agora com fallback IA)
    const { data: evolutionConfig, error: configError } = await supabase
      .from('evolution_config')
      .select('api_url, api_key, instance_name, status')
      .eq('status', 'conectado')
      .single();

    const hasEvolutionAPI = !configError && evolutionConfig;
    
    if (!hasEvolutionAPI && !useAIFallback) {
      console.error('[enrich] Evolution API não configurada e fallback IA desabilitado');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Evolution API não está conectada e fallback IA está desabilitado.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar contatos que precisam de enriquecimento, priorizando os que têm conversas
    let contatos: any[] | null = null;
    
    // Primeiro: buscar IDs de contatos que têm mensagens E precisam de enriquecimento
    const { data: contatosPrioritarios } = await supabase
      .from('conversas_whatsapp')
      .select('contato_id')
      .not('contato_id', 'is', null);

    const idsComMensagens = [...new Set((contatosPrioritarios || []).map((c: any) => c.contato_id))];
    console.log(`[enrich] ${idsComMensagens.length} contatos únicos têm mensagens no banco`);

    // Se temos contatos com mensagens, buscar eles primeiro
    if (idsComMensagens.length > 0) {
      const { data: contatosComMsg, error: errComMsg } = await supabase
        .from('contatos_inteligencia')
        .select('id, telefone, nome, whatsapp_profile_name, whatsapp_profile_picture, remote_jid')
        .in('id', idsComMensagens)
        .or('whatsapp_profile_name.is.null,whatsapp_profile_name.like.Contato %')
        .limit(batchSize);

      if (!errComMsg && contatosComMsg && contatosComMsg.length > 0) {
        contatos = contatosComMsg;
        console.log(`[enrich] Encontrados ${contatos.length} contatos COM mensagens que precisam enriquecimento`);
      }
    }

    // Fallback: buscar outros contatos se necessário
    if (!contatos || contatos.length < batchSize) {
      const jaProcessados = contatos ? contatos.map((c: any) => c.id) : [];
      let query = supabase
        .from('contatos_inteligencia')
        .select('id, telefone, nome, whatsapp_profile_name, whatsapp_profile_picture, remote_jid')
        .not('telefone', 'is', null);

      if (!forceUpdate) {
        query = query.or('whatsapp_profile_name.is.null,whatsapp_profile_name.like.Contato %');
      }

      if (jaProcessados.length > 0) {
        query = query.not('id', 'in', `(${jaProcessados.join(',')})`);
      }

      const faltam = batchSize - (contatos?.length || 0);
      const { data: outrosContatos, error: outrosError } = await query.limit(faltam);
      
      if (!outrosError && outrosContatos) {
        contatos = [...(contatos || []), ...outrosContatos];
      }
    }

    if (!contatos || contatos.length === 0) {
      console.log('[enrich] Nenhum contato para enriquecer');
      return new Response(
        JSON.stringify({
          success: true,
          enriched: 0,
          enrichedByAI: 0,
          failed: 0,
          total: 0,
          message: 'Todos os contatos já estão enriquecidos!',
          errors: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[enrich] ${contatos.length} contatos para enriquecer`);

    const result: EnrichResult = {
      success: true,
      enriched: 0,
      enrichedByAI: 0,
      failed: 0,
      total: contatos.length,
      errors: [],
    };

    // Processar cada contato
    for (const contato of contatos) {
      try {
        // Montar o remote_jid se não existir
        let remoteJid = contato.remote_jid;
        if (!remoteJid && contato.telefone) {
          const cleanPhone = contato.telefone.replace(/\D/g, '');
          remoteJid = `${cleanPhone}@s.whatsapp.net`;
        }

        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        // Atualizar remote_jid se não existia
        if (!contato.remote_jid && remoteJid) {
          updates.remote_jid = remoteJid;
        }

        let nameFound = false;
        let pictureUrl: string | null = null;

        // Tentar Evolution API primeiro
        if (hasEvolutionAPI && remoteJid) {
          console.log(`[enrich] Buscando dados Evolution para: ${remoteJid}`);

          const [profileData, picture] = await Promise.all([
            fetchContactProfile(evolutionConfig!, remoteJid),
            fetchProfilePicture(evolutionConfig!, remoteJid),
          ]);

          pictureUrl = picture;

          // Atualizar nome do WhatsApp se encontrado
          if (profileData?.pushName && !profileData.pushName.match(/^\d+$/)) {
            updates.whatsapp_profile_name = profileData.pushName;
            if (!contato.nome || contato.nome.startsWith('Contato ')) {
              updates.nome = profileData.pushName;
            }
            nameFound = true;
          }

          // Atualizar se é conta business
          if (profileData?.isBusiness !== undefined) {
            updates.is_business = profileData.isBusiness;
            if (profileData.businessName) {
              updates.business_name = profileData.businessName;
            }
          }

          // Atualizar foto de perfil
          if (pictureUrl) {
            updates.whatsapp_profile_picture = pictureUrl;
          }
        }

        // Fallback: usar IA para extrair nome das conversas
        if (!nameFound && useAIFallback) {
          console.log(`[enrich] Evolution API sem nome, tentando fallback IA para ${contato.id}`);
          
          const aiExtractedName = await extractNameFromConversationsWithAI(
            supabase,
            contato.id,
            contato.telefone
          );

          if (aiExtractedName) {
            updates.whatsapp_profile_name = aiExtractedName;
            if (!contato.nome || contato.nome.startsWith('Contato ')) {
              updates.nome = aiExtractedName;
            }
            nameFound = true;
            result.enrichedByAI++;
            console.log(`[enrich] Nome extraído via IA: ${aiExtractedName}`);
          }
        }

        // Só atualizar se temos dados novos
        if (Object.keys(updates).length > 1) {
          const { error: updateError } = await supabase
            .from('contatos_inteligencia')
            .update(updates)
            .eq('id', contato.id);

          if (updateError) {
            console.error(`[enrich] Erro ao atualizar ${contato.id}:`, updateError);
            result.errors.push(`Erro ao atualizar ${contato.telefone}: ${updateError.message}`);
            result.failed++;
          } else {
            if (nameFound) {
              result.enriched++;
            }
            console.log(`[enrich] Atualizado: ${contato.telefone} -> ${updates.whatsapp_profile_name || 'sem nome'}`);
          }
        } else {
          console.log(`[enrich] Sem dados novos para ${contato.telefone}`);
          result.failed++;
        }

        // Pequena pausa para não sobrecarregar APIs
        await sleep(250);
      } catch (error) {
        console.error(`[enrich] Erro ao processar ${contato.id}:`, error);
        result.errors.push(`Erro ao processar ${contato.telefone}: ${error}`);
        result.failed++;
      }
    }

    // Contar quantos contatos ainda precisam de enriquecimento
    const { count: remaining } = await supabase
      .from('contatos_inteligencia')
      .select('id', { count: 'exact', head: true })
      .or('whatsapp_profile_name.is.null,whatsapp_profile_name.like.Contato %');

    console.log(`[enrich] Concluído. Enriquecidos: ${result.enriched} (${result.enrichedByAI} via IA), Falhas: ${result.failed}, Restantes: ${remaining}`);

    return new Response(
      JSON.stringify({
        ...result,
        remaining: remaining || 0,
        message: `${result.enriched} contatos enriquecidos (${result.enrichedByAI} via IA)`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[enrich] Erro geral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
