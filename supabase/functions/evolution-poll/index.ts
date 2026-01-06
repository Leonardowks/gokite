import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valida se é um JID de contato WhatsApp válido (ignora grupos, broadcasts e IDs especiais)
function isValidWhatsAppJid(jid: string): boolean {
  if (!jid) return false;
  // Apenas JIDs individuais no formato NÚMERO@s.whatsapp.net são válidos
  return jid.endsWith('@s.whatsapp.net') && 
         !jid.includes('@g.us') && 
         !jid.includes('@broadcast') &&
         !jid.includes('@lid');
}

// Normaliza telefone para formato consistente - apenas de JIDs válidos
function normalizePhone(jid: string): string {
  if (!isValidWhatsAppJid(jid)) return "";
  // Extrair apenas a parte numérica antes do @s.whatsapp.net
  const phone = jid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  // Validar que tem pelo menos 10 dígitos (DDD + número)
  return phone.length >= 10 ? phone : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contatoId, limit = 50 } = await req.json();

    console.log(`[Evolution Poll] Iniciando poll${contatoId ? ` para contato ${contatoId}` : ' geral'}`);

    // Buscar configuração da Evolution
    const { data: config, error: configError } = await supabase
      .from("evolution_config")
      .select("*")
      .eq("status", "conectado")
      .maybeSingle();

    if (!config || configError) {
      return new Response(
        JSON.stringify({ error: "Evolution API não conectada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let mensagensNovas = 0;
    let mensagensAtualizadas = 0;

    if (contatoId) {
      // Poll específico para um contato
      const { data: contato } = await supabase
        .from("contatos_inteligencia")
        .select("remote_jid, telefone")
        .eq("id", contatoId)
        .single();

      if (!contato?.remote_jid) {
        return new Response(
          JSON.stringify({ error: "Contato não tem remote_jid" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar mensagens mais recentes na Evolution
      const response = await fetch(
        `${config.api_url}/chat/findMessages/${config.instance_name}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": config.api_key,
          },
          body: JSON.stringify({
            where: {
              key: { remoteJid: contato.remote_jid },
            },
            limit,
          }),
        }
      );

      if (!response.ok) {
        console.error("[Evolution Poll] Erro na API:", await response.text());
        return new Response(
          JSON.stringify({ error: "Erro ao buscar mensagens" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const responseData = await response.json();
      
      // A API pode retornar um array ou um objeto com array dentro
      let messages: any[] = [];
      if (Array.isArray(responseData)) {
        messages = responseData;
      } else if (responseData?.messages && Array.isArray(responseData.messages)) {
        messages = responseData.messages;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        messages = responseData.data;
      }
      
      console.log(`[Evolution Poll] ${messages.length} mensagens encontradas`);

      // Processar mensagens
      for (const msg of messages) {
        const messageId = msg.key?.id;
        if (!messageId) continue;

        // Verificar se já existe
        const { data: existing } = await supabase
          .from("conversas_whatsapp")
          .select("id, message_status")
          .eq("message_id", messageId)
          .maybeSingle();

        if (existing) {
          // Atualizar status se mudou
          const newStatus = msg.status;
          if (newStatus && newStatus !== existing.message_status) {
            await supabase
              .from("conversas_whatsapp")
              .update({ message_status: String(newStatus) })
              .eq("id", existing.id);
            mensagensAtualizadas++;
          }
        } else {
          // Inserir nova mensagem
          const timestamp = msg.messageTimestamp
            ? new Date(typeof msg.messageTimestamp === 'string' 
                ? parseInt(msg.messageTimestamp) * 1000 
                : msg.messageTimestamp * 1000)
            : new Date();

          let content = "";
          let tipoMidia = "texto";
          
          if (msg.message?.conversation) {
            content = msg.message.conversation;
          } else if (msg.message?.extendedTextMessage?.text) {
            content = msg.message.extendedTextMessage.text;
          } else if (msg.message?.imageMessage) {
            content = msg.message.imageMessage.caption || "[Imagem]";
            tipoMidia = "imagem";
          } else if (msg.message?.audioMessage) {
            content = "[Áudio]";
            tipoMidia = "audio";
          } else if (msg.message?.videoMessage) {
            content = msg.message.videoMessage.caption || "[Vídeo]";
            tipoMidia = "video";
          } else if (msg.message?.documentMessage) {
            content = msg.message.documentMessage.fileName || "[Documento]";
            tipoMidia = "documento";
          }

          if (!content) continue;

          await supabase
            .from("conversas_whatsapp")
            .insert({
              contato_id: contatoId,
              telefone: contato.telefone,
              message_id: messageId,
              instance_name: config.instance_name,
              is_from_me: msg.key?.fromMe || false,
              push_name: msg.pushName,
              data_mensagem: timestamp.toISOString(),
              remetente: msg.key?.fromMe ? "empresa" : "cliente",
              conteudo: content,
              tipo_midia: tipoMidia,
              lida: msg.key?.fromMe,
              message_status: msg.status ? String(msg.status) : null,
            });

          mensagensNovas++;
        }
      }
    } else {
      // Poll geral - buscar chats recentes e suas mensagens
      const response = await fetch(
        `${config.api_url}/chat/findChats/${config.instance_name}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": config.api_key,
          },
          body: JSON.stringify({ limit: 20 }),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        let chats: any[] = [];
        if (Array.isArray(responseData)) {
          chats = responseData;
        } else if (responseData?.chats && Array.isArray(responseData.chats)) {
          chats = responseData.chats;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          chats = responseData.data;
        }
        console.log(`[Evolution Poll] ${chats.length} chats encontrados`);
        
        // Processar cada chat para buscar mensagens novas
        for (const chat of chats.slice(0, 10)) { // Limitar a 10 chats mais recentes
          const remoteJid = chat.id || chat.remoteJid || chat.jid;
          
          // Validar que é um JID individual válido do WhatsApp
          if (!isValidWhatsAppJid(remoteJid)) {
            console.log(`[Evolution Poll] Ignorando JID inválido/grupo: ${remoteJid}`);
            continue;
          }

          const telefone = normalizePhone(remoteJid);
          if (!telefone) {
            console.log(`[Evolution Poll] Telefone inválido extraído de: ${remoteJid}`);
            continue;
          }
          
          // Buscar ou criar contato
          let { data: contato } = await supabase
            .from("contatos_inteligencia")
            .select("id, remote_jid")
            .eq("remote_jid", remoteJid)
            .maybeSingle();

          if (!contato) {
            // Criar contato SEM ultima_mensagem (será definido após processar mensagens reais)
            const { data: novoContato } = await supabase
              .from("contatos_inteligencia")
              .insert({
                telefone,
                remote_jid: remoteJid,
                nome: chat.pushName || chat.name || null,
                whatsapp_profile_name: chat.pushName || chat.name || null,
                status: 'lead',
                // NÃO setar ultima_mensagem aqui - será definido pelo timestamp real das mensagens
              })
              .select("id, remote_jid")
              .single();
            
            contato = novoContato;
          }

          if (!contato) continue;

          // Buscar mensagens deste chat
          try {
            const msgResponse = await fetch(
              `${config.api_url}/chat/findMessages/${config.instance_name}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": config.api_key,
                },
                body: JSON.stringify({
                  where: { key: { remoteJid } },
                  limit: 20,
                }),
              }
            );

            if (!msgResponse.ok) continue;

            const msgData = await msgResponse.json();
            let messages: any[] = [];
            if (Array.isArray(msgData)) {
              messages = msgData;
            } else if (msgData?.messages && Array.isArray(msgData.messages)) {
              messages = msgData.messages;
            } else if (msgData?.data && Array.isArray(msgData.data)) {
              messages = msgData.data;
            }

            // Rastrear o timestamp mais recente das mensagens deste chat
            let maxTimestamp: Date | null = null;

            // Processar mensagens
            for (const msg of messages) {
              const messageId = msg.key?.id;
              if (!messageId) continue;

              // Extrair timestamp da mensagem
              const timestamp = msg.messageTimestamp
                ? new Date(typeof msg.messageTimestamp === 'string' 
                    ? parseInt(msg.messageTimestamp) * 1000 
                    : (typeof msg.messageTimestamp === 'object' && msg.messageTimestamp.low
                        ? msg.messageTimestamp.low * 1000
                        : msg.messageTimestamp * 1000))
                : new Date();

              // Atualizar maxTimestamp se esta mensagem for mais recente
              if (!maxTimestamp || timestamp > maxTimestamp) {
                maxTimestamp = timestamp;
              }

              // Verificar se já existe
              const { data: existing } = await supabase
                .from("conversas_whatsapp")
                .select("id")
                .eq("message_id", messageId)
                .maybeSingle();

              if (existing) continue; // Já existe

              let content = "";
              let tipoMidia = "texto";
              
              if (msg.message?.conversation) {
                content = msg.message.conversation;
              } else if (msg.message?.extendedTextMessage?.text) {
                content = msg.message.extendedTextMessage.text;
              } else if (msg.message?.imageMessage) {
                content = msg.message.imageMessage.caption || "[Imagem]";
                tipoMidia = "imagem";
              } else if (msg.message?.audioMessage) {
                content = "[Áudio]";
                tipoMidia = "audio";
              } else if (msg.message?.videoMessage) {
                content = msg.message.videoMessage.caption || "[Vídeo]";
                tipoMidia = "video";
              } else if (msg.message?.documentMessage) {
                content = msg.message.documentMessage.fileName || "[Documento]";
                tipoMidia = "documento";
              } else if (msg.message?.stickerMessage) {
                content = "[Figurinha]";
                tipoMidia = "sticker";
              }

              if (!content) continue;

              // Inserir mensagem
              const { error: insertError } = await supabase
                .from("conversas_whatsapp")
                .insert({
                  contato_id: contato.id,
                  telefone,
                  message_id: messageId,
                  instance_name: config.instance_name,
                  is_from_me: msg.key?.fromMe || false,
                  push_name: msg.pushName,
                  data_mensagem: timestamp.toISOString(),
                  remetente: msg.key?.fromMe ? "empresa" : "cliente",
                  conteudo: content,
                  tipo_midia: tipoMidia,
                  lida: msg.key?.fromMe,
                  message_status: msg.status ? String(msg.status) : null,
                });

              if (!insertError) {
                mensagensNovas++;
              }
            }

            // Após processar todas as mensagens, atualizar contato com o timestamp real mais recente
            if (maxTimestamp) {
              await supabase
                .from("contatos_inteligencia")
                .update({ 
                  ultima_mensagem: maxTimestamp.toISOString(),
                  ultimo_contato: maxTimestamp.toISOString(),
                })
                .eq("id", contato.id);
            }
          } catch (chatError) {
            console.error(`[Evolution Poll] Erro ao processar chat ${remoteJid}:`, chatError);
          }
        }
        
        // Atualizar última sincronização
        await supabase
          .from("evolution_config")
          .update({ ultima_sincronizacao: new Date().toISOString() })
          .eq("instance_name", config.instance_name);
      }
    }

    console.log(`[Evolution Poll] Concluído: ${mensagensNovas} novas, ${mensagensAtualizadas} atualizadas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        novas: mensagensNovas,
        atualizadas: mensagensAtualizadas,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Evolution Poll] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
