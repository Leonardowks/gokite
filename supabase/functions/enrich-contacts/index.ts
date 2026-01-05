import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichResult {
  success: boolean;
  enriched: number;
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
    const batchSize = body.batchSize || 50; // Processar em lotes menores
    const forceUpdate = body.forceUpdate || false; // Se true, atualiza mesmo com nome existente

    console.log(`[enrich] Iniciando enriquecimento. Batch: ${batchSize}, Force: ${forceUpdate}`);

    // Buscar configuração da Evolution API
    const { data: evolutionConfig, error: configError } = await supabase
      .from('evolution_config')
      .select('api_url, api_key, instance_name, status')
      .eq('status', 'conectado')
      .single();

    if (configError || !evolutionConfig) {
      console.error('[enrich] Evolution API não configurada ou não conectada');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Evolution API não está conectada. Configure primeiro em Inteligência > Conectar WhatsApp.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar contatos que precisam de enriquecimento
    // Prioridade: contatos sem nome do WhatsApp ou com nome genérico "Contato XXXX"
    let query = supabase
      .from('contatos_inteligencia')
      .select('id, telefone, nome, whatsapp_profile_name, whatsapp_profile_picture, remote_jid')
      .not('telefone', 'is', null);

    if (!forceUpdate) {
      // Buscar apenas contatos sem nome do WhatsApp OU com nome genérico
      query = query.or('whatsapp_profile_name.is.null,whatsapp_profile_name.like.Contato %');
    }

    const { data: contatos, error: contatosError } = await query.limit(batchSize);

    if (contatosError) {
      throw contatosError;
    }

    if (!contatos || contatos.length === 0) {
      console.log('[enrich] Nenhum contato para enriquecer');
      return new Response(
        JSON.stringify({
          success: true,
          enriched: 0,
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
          // Limpar telefone e formatar como JID
          const cleanPhone = contato.telefone.replace(/\D/g, '');
          remoteJid = `${cleanPhone}@s.whatsapp.net`;
        }

        if (!remoteJid) {
          console.log(`[enrich] Contato ${contato.id} sem telefone válido`);
          result.failed++;
          continue;
        }

        console.log(`[enrich] Buscando dados para: ${remoteJid}`);

        // Buscar perfil e foto em paralelo
        const [profileData, pictureUrl] = await Promise.all([
          fetchContactProfile(evolutionConfig, remoteJid),
          fetchProfilePicture(evolutionConfig, remoteJid),
        ]);

        // Montar updates
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        // Atualizar remote_jid se não existia
        if (!contato.remote_jid && remoteJid) {
          updates.remote_jid = remoteJid;
        }

        // Atualizar nome do WhatsApp
        if (profileData?.pushName) {
          updates.whatsapp_profile_name = profileData.pushName;
          
          // Se nome atual é genérico ou vazio, atualizar também
          if (!contato.nome || contato.nome.startsWith('Contato ')) {
            updates.nome = profileData.pushName;
          }
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
            console.log(`[enrich] Enriquecido: ${contato.telefone} -> ${profileData?.pushName || 'sem nome'}`);
            result.enriched++;
          }
        } else {
          console.log(`[enrich] Sem dados novos para ${contato.telefone}`);
          result.failed++;
        }

        // Pequena pausa para não sobrecarregar a API
        await sleep(200);
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

    console.log(`[enrich] Concluído. Enriquecidos: ${result.enriched}, Falhas: ${result.failed}, Restantes: ${remaining}`);

    return new Response(
      JSON.stringify({
        ...result,
        remaining: remaining || 0,
        message: `${result.enriched} contatos enriquecidos com dados do WhatsApp`,
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
