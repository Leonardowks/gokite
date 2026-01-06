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
    const { phone, contato_id, limit = 50 } = body;

    if (!phone && !contato_id) {
      return new Response(JSON.stringify({ error: 'phone ou contato_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[fetch-messages-history] Buscando histórico para: ${phone || contato_id}, limit: ${limit}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar contato no banco para pegar o remote_jid REAL
    let telefone = phone;
    let contatoId = contato_id;
    let remoteJidFromDb: string | null = null;
    
    if (contatoId) {
      // Buscar contato pelo ID - pegar telefone E remote_jid real
      const { data: contato } = await supabase
        .from('contatos_inteligencia')
        .select('telefone, remote_jid')
        .eq('id', contatoId)
        .single();
      
      if (!contato) {
        return new Response(JSON.stringify({ error: 'Contato não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      telefone = contato.telefone;
      remoteJidFromDb = contato.remote_jid;
    } else if (telefone) {
      // Buscar pelo telefone para ver se tem remote_jid salvo
      const cleanPhoneSearch = telefone.replace(/\D/g, '');
      const { data: contatoByPhone } = await supabase
        .from('contatos_inteligencia')
        .select('id, remote_jid')
        .eq('telefone', cleanPhoneSearch)
        .maybeSingle();
      
      if (contatoByPhone) {
        contatoId = contatoByPhone.id;
        remoteJidFromDb = contatoByPhone.remote_jid;
      }
    }

    // Buscar configuração da Evolution API
    const { data: config, error: configError } = await supabase
      .from('evolution_config')
      .select('*')
      .single();

    if (configError || !config) {
      console.error('[fetch-messages-history] Configuração não encontrada:', configError);
      return new Response(JSON.stringify({ error: 'Evolution API não configurada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { api_url, api_key, instance_name } = config;
    
    // PRIORIZAR remote_jid do banco, fallback para construído
    const cleanPhone = telefone.replace(/\D/g, '');
    const remoteJid = remoteJidFromDb || `${cleanPhone}@s.whatsapp.net`;
    
    console.log(`[fetch-messages-history] Usando JID: ${remoteJid} (do banco: ${!!remoteJidFromDb})`);
    
    console.log(`[fetch-messages-history] Buscando mensagens para JID: ${remoteJid}`);

    // Chamar /chat/findMessages na Evolution API
    const evolutionUrl = `${api_url}/chat/findMessages/${instance_name}`;
    
    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': api_key,
      },
      body: JSON.stringify({
        where: {
          key: {
            remoteJid: remoteJid
          }
        },
        limit: limit,
      }),
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error('[fetch-messages-history] Erro Evolution API:', errorText);
      return new Response(JSON.stringify({ error: 'Erro ao buscar mensagens', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseData = await evolutionResponse.json();
    const messages = responseData.messages?.records || responseData.messages || responseData || [];
    
    console.log(`[fetch-messages-history] ${messages.length} mensagens encontradas`);

    // Buscar ou criar contato
    let contatoRecord;
    if (contatoId) {
      const { data } = await supabase
        .from('contatos_inteligencia')
        .select('id')
        .eq('id', contatoId)
        .single();
      contatoRecord = data;
    } else {
      // Buscar pelo telefone
      const { data: existingContato } = await supabase
        .from('contatos_inteligencia')
        .select('id')
        .eq('telefone', cleanPhone)
        .maybeSingle();

      if (existingContato) {
        contatoRecord = existingContato;
      } else {
        // Criar novo contato
        const { data: newContato } = await supabase
          .from('contatos_inteligencia')
          .insert({
            telefone: cleanPhone,
            remote_jid: remoteJid,
            origem: 'whatsapp',
            status: 'nao_classificado',
          })
          .select('id')
          .single();
        contatoRecord = newContato;
      }
    }

    if (!contatoRecord) {
      return new Response(JSON.stringify({ error: 'Erro ao criar/buscar contato' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar e salvar mensagens
    let mensagensSalvas = 0;
    let mensagensPuladas = 0;
    const messagesToInsert: Record<string, unknown>[] = [];

    for (const msg of messages) {
      try {
        const key = msg.key || {};
        const messageId = key.id || msg.id;
        const isFromMe = key.fromMe === true;
        
        // Extrair conteúdo da mensagem
        let conteudo = '';
        let tipoMidia = 'texto';
        let mediaUrl = null;
        let mediaMimetype = null;

        const message = msg.message || {};
        
        if (message.conversation) {
          conteudo = message.conversation;
        } else if (message.extendedTextMessage?.text) {
          conteudo = message.extendedTextMessage.text;
        } else if (message.imageMessage) {
          tipoMidia = 'imagem';
          conteudo = message.imageMessage.caption || '[Imagem]';
          mediaMimetype = message.imageMessage.mimetype;
        } else if (message.videoMessage) {
          tipoMidia = 'video';
          conteudo = message.videoMessage.caption || '[Vídeo]';
          mediaMimetype = message.videoMessage.mimetype;
        } else if (message.audioMessage) {
          tipoMidia = 'audio';
          conteudo = '[Áudio]';
          mediaMimetype = message.audioMessage.mimetype;
        } else if (message.documentMessage) {
          tipoMidia = 'documento';
          conteudo = message.documentMessage.fileName || '[Documento]';
          mediaMimetype = message.documentMessage.mimetype;
        } else if (message.stickerMessage) {
          tipoMidia = 'sticker';
          conteudo = '[Sticker]';
        } else if (message.contactMessage) {
          tipoMidia = 'contato';
          conteudo = `[Contato: ${message.contactMessage.displayName || 'Desconhecido'}]`;
        } else if (message.locationMessage) {
          tipoMidia = 'localizacao';
          conteudo = '[Localização]';
        } else {
          // Mensagem não reconhecida, pular
          mensagensPuladas++;
          continue;
        }

        // Timestamp
        const timestamp = msg.messageTimestamp 
          ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString();

        // Preparar dados para inserção
        messagesToInsert.push({
          message_id: messageId,
          contato_id: contatoRecord.id,
          telefone: cleanPhone,
          conteudo,
          remetente: isFromMe ? 'empresa' : 'cliente',
          is_from_me: isFromMe,
          data_mensagem: timestamp,
          tipo_midia: tipoMidia,
          media_url: mediaUrl,
          media_mimetype: mediaMimetype,
          instance_name: instance_name,
          push_name: msg.pushName || null,
          lida: true,
        });
      } catch (err) {
        console.error('[fetch-messages-history] Erro ao processar mensagem:', err);
        mensagensPuladas++;
      }
    }

    // Inserir mensagens com ON CONFLICT DO NOTHING
    if (messagesToInsert.length > 0) {
      const { error: insertError, count } = await supabase
        .from('conversas_whatsapp')
        .upsert(messagesToInsert, {
          onConflict: 'message_id',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error('[fetch-messages-history] Erro ao inserir mensagens:', insertError);
      } else {
        mensagensSalvas = messagesToInsert.length;
      }
    }

    // Atualizar último contato
    if (messagesToInsert.length > 0) {
      const ultimaMensagem = messagesToInsert.sort((a, b) => 
        new Date(b.data_mensagem as string).getTime() - new Date(a.data_mensagem as string).getTime()
      )[0];

      await supabase
        .from('contatos_inteligencia')
        .update({
          ultimo_contato: ultimaMensagem.data_mensagem,
          ultima_mensagem: ultimaMensagem.data_mensagem,
        })
        .eq('id', contatoRecord.id);
    }

    console.log(`[fetch-messages-history] Finalizado - Salvas: ${mensagensSalvas}, Puladas: ${mensagensPuladas}`);

    return new Response(JSON.stringify({
      success: true,
      contato_id: contatoRecord.id,
      total_mensagens: messages.length,
      mensagens_salvas: mensagensSalvas,
      mensagens_puladas: mensagensPuladas,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[fetch-messages-history] Erro geral:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
