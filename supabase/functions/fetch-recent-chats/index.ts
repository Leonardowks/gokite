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
    console.log('[fetch-recent-chats] Iniciando busca de chats recentes...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração da Evolution API
    const { data: config, error: configError } = await supabase
      .from('evolution_config')
      .select('*')
      .single();

    if (configError || !config) {
      console.error('[fetch-recent-chats] Configuração não encontrada:', configError);
      return new Response(JSON.stringify({ error: 'Evolution API não configurada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { api_url, api_key, instance_name } = config;
    console.log(`[fetch-recent-chats] Usando instância: ${instance_name}`);

    // Chamar /chat/findChats na Evolution API
    const evolutionUrl = `${api_url}/chat/findChats/${instance_name}`;
    console.log(`[fetch-recent-chats] Chamando: ${evolutionUrl}`);

    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': api_key,
      },
      body: JSON.stringify({
        where: {
          // Buscar apenas chats individuais (não grupos)
          id: { contains: '@s.whatsapp.net' }
        }
      }),
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error('[fetch-recent-chats] Erro Evolution API:', errorText);
      return new Response(JSON.stringify({ error: 'Erro ao buscar chats', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chats = await evolutionResponse.json();
    console.log(`[fetch-recent-chats] ${chats.length} chats encontrados`);

    // Processar e fazer UPSERT dos contatos
    let contatosCriados = 0;
    let contatosAtualizados = 0;
    const errors: string[] = [];

    // Pegar apenas os 50 mais recentes para performance
    const recentChats = Array.isArray(chats) ? chats.slice(0, 50) : [];

    for (const chat of recentChats) {
      try {
        const remoteJid = chat.id || chat.remoteJid;
        if (!remoteJid || !remoteJid.includes('@s.whatsapp.net')) continue;

        // Extrair telefone do JID
        const telefone = remoteJid.replace('@s.whatsapp.net', '');
        
        // Dados do contato
        const pushName = chat.pushName || chat.name || null;
        const profilePicture = chat.profilePictureUrl || chat.profilePicUrl || null;
        const lastMessageTimestamp = chat.lastMessageTimestamp || chat.updatedAt;
        
        // Dados para UPSERT
        const contatoData: Record<string, unknown> = {
          telefone,
          remote_jid: remoteJid,
          updated_at: new Date().toISOString(),
        };

        // Só atualizar nome/foto se tiver dados novos
        if (pushName) {
          contatoData.whatsapp_profile_name = pushName;
          // Se não tem nome definido, usar o pushName
          contatoData.nome = pushName;
        }
        if (profilePicture) {
          contatoData.whatsapp_profile_picture = profilePicture;
        }
        // IMPORTANTE: Usar timestamp real da mensagem do WhatsApp para ordenação
        if (lastMessageTimestamp) {
          const realDate = new Date(lastMessageTimestamp * 1000).toISOString();
          contatoData.ultimo_contato = realDate;
          contatoData.ultima_mensagem = realDate; // Atualiza também para ordenação na lista
        }

        // UPSERT no contatos_inteligencia
        const { data: existingContato } = await supabase
          .from('contatos_inteligencia')
          .select('id, nome')
          .eq('telefone', telefone)
          .maybeSingle();

        if (existingContato) {
          // Update - não sobrescrever nome se já tiver
          const updateData: Record<string, unknown> = { ...contatoData };
          if (existingContato.nome) {
            delete updateData.nome;
          }
          
          await supabase
            .from('contatos_inteligencia')
            .update(updateData)
            .eq('id', existingContato.id);
          
          contatosAtualizados++;
        } else {
          // Insert novo contato
          contatoData.origem = 'whatsapp';
          contatoData.status = 'nao_classificado';
          
          await supabase
            .from('contatos_inteligencia')
            .insert(contatoData);
          
          contatosCriados++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        errors.push(errorMsg);
        console.error('[fetch-recent-chats] Erro ao processar chat:', err);
      }
    }

    // Atualizar timestamp de sincronização
    await supabase
      .from('evolution_config')
      .update({
        ultima_sincronizacao: new Date().toISOString(),
        total_contatos_sync: (config.total_contatos_sync || 0) + contatosCriados,
      })
      .eq('id', config.id);

    console.log(`[fetch-recent-chats] Finalizado - Criados: ${contatosCriados}, Atualizados: ${contatosAtualizados}`);

    return new Response(JSON.stringify({
      success: true,
      total_chats: recentChats.length,
      contatos_criados: contatosCriados,
      contatos_atualizados: contatosAtualizados,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[fetch-recent-chats] Erro geral:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
