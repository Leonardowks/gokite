import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== UTILITÁRIOS BLINDADOS ==========

/**
 * Valida se é um JID de contato WhatsApp válido
 */
function isValidWhatsAppJid(jid: string | null | undefined): boolean {
  if (!jid || typeof jid !== 'string') return false;
  const isIndividual = jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
  if (!isIndividual) return false;
  if (jid.includes("@g.us") || jid.includes("@broadcast")) return false;
  return true;
}

/**
 * Extrai telefone do JID - remove TUDO que não é número
 */
function extractPhone(jid: string | null | undefined): string {
  if (!jid || typeof jid !== 'string') return "";
  // Remove sufixos e qualquer caractere não numérico
  const phone = jid.replace(/\D/g, "");
  return phone.length >= 8 ? phone : "";
}

/**
 * Formata telefone para exibição
 */
function formatPhoneDisplay(phone: string): string {
  if (!phone) return "Contato";
  if (phone.length >= 10) {
    const ddd = phone.slice(-10, -8);
    const p1 = phone.slice(-8, -4);
    const p2 = phone.slice(-4);
    return `(${ddd}) ${p1}-${p2}`;
  }
  return phone.slice(-8);
}

/**
 * Verifica se string parece telefone (não nome válido)
 */
function looksLikePhone(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') return true;
  const digits = str.replace(/\D/g, '');
  return digits.length >= 8 && digits.length / str.length > 0.7;
}

/**
 * EXTRAÇÃO BLINDADA DE NOME - múltiplos caminhos do payload Evolution v2
 */
function extractName(payload: any, msgData: any, phone: string): string {
  // Caminhos possíveis para pushName na Evolution v2
  const paths = [
    msgData?.pushName,
    payload?.data?.pushName,
    payload?.pushName,
    payload?.data?.data?.pushName,
    msgData?.key?.pushName,
    payload?.sender?.pushName,
    payload?.data?.sender?.pushName,
    payload?.data?.data?.sender?.pushName,
  ];

  for (const name of paths) {
    if (name && typeof name === 'string' && name.trim().length > 1) {
      if (!looksLikePhone(name)) {
        return name.trim();
      }
    }
  }

  return formatPhoneDisplay(phone);
}

/**
 * EXTRAÇÃO BLINDADA DE remoteJid - múltiplos caminhos
 */
function extractRemoteJid(payload: any, msgData: any): string | null {
  // Caminhos possíveis na Evolution v2
  const paths = [
    msgData?.key?.remoteJid,
    payload?.data?.key?.remoteJid,
    payload?.data?.data?.key?.remoteJid,
    payload?.key?.remoteJid,
    msgData?.remoteJid,
    payload?.remoteJid,
    payload?.data?.remoteJid,
  ];

  for (const jid of paths) {
    if (jid && typeof jid === 'string' && jid.length > 5) {
      return jid;
    }
  }
  return null;
}

/**
 * EXTRAÇÃO BLINDADA DE messageId
 */
function extractMessageId(payload: any, msgData: any): string {
  const paths = [
    msgData?.key?.id,
    payload?.data?.key?.id,
    payload?.data?.data?.key?.id,
    payload?.key?.id,
    msgData?.id,
  ];

  for (const id of paths) {
    if (id && typeof id === 'string') {
      return id;
    }
  }
  return `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * EXTRAÇÃO BLINDADA DE fromMe
 */
function extractFromMe(payload: any, msgData: any): boolean {
  const paths = [
    msgData?.key?.fromMe,
    payload?.data?.key?.fromMe,
    payload?.data?.data?.key?.fromMe,
    payload?.key?.fromMe,
  ];

  for (const val of paths) {
    if (typeof val === 'boolean') {
      return val;
    }
  }
  return false;
}

/**
 * EXTRAÇÃO BLINDADA DE message object
 */
function extractMessageObject(payload: any, msgData: any): any {
  const paths = [
    msgData?.message,
    payload?.data?.message,
    payload?.data?.data?.message,
    payload?.message,
  ];

  for (const msg of paths) {
    if (msg && typeof msg === 'object') {
      return msg;
    }
  }
  return {};
}

/**
 * EXTRAÇÃO BLINDADA DE CONTEÚDO da mensagem
 */
function extractMessageContent(message: any): { 
  content: string; 
  tipoMidia: string; 
  mediaUrl?: string; 
  mediaMimetype?: string 
} {
  if (!message || typeof message !== 'object') {
    return { content: "📩 Nova mensagem", tipoMidia: "texto" };
  }

  // 1. Texto simples
  if (message.conversation && typeof message.conversation === 'string') {
    return { content: message.conversation, tipoMidia: "texto" };
  }

  // 2. Texto estendido
  if (message.extendedTextMessage?.text) {
    return { content: message.extendedTextMessage.text, tipoMidia: "texto" };
  }

  // 3. Imagem
  if (message.imageMessage) {
    const caption = message.imageMessage.caption;
    return {
      content: caption && caption.trim() ? caption : "📷 Imagem",
      tipoMidia: "imagem",
      mediaUrl: message.imageMessage.url,
      mediaMimetype: message.imageMessage.mimetype,
    };
  }

  // 4. Áudio
  if (message.audioMessage) {
    const seconds = message.audioMessage.seconds || 0;
    return {
      content: `🎤 Áudio (${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')})`,
      tipoMidia: "audio",
      mediaUrl: message.audioMessage.url,
      mediaMimetype: message.audioMessage.mimetype,
    };
  }

  // 5. Vídeo
  if (message.videoMessage) {
    const caption = message.videoMessage.caption;
    return {
      content: caption && caption.trim() ? caption : "🎬 Vídeo",
      tipoMidia: "video",
      mediaUrl: message.videoMessage.url,
      mediaMimetype: message.videoMessage.mimetype,
    };
  }

  // 6. Documento
  if (message.documentMessage) {
    return {
      content: `📄 ${message.documentMessage.fileName || "Documento"}`,
      tipoMidia: "documento",
      mediaUrl: message.documentMessage.url,
      mediaMimetype: message.documentMessage.mimetype,
    };
  }

  // 7. Sticker
  if (message.stickerMessage) {
    return { content: "🎭 Sticker", tipoMidia: "sticker" };
  }

  // 8. Localização
  if (message.locationMessage) {
    return { content: "📍 Localização", tipoMidia: "localizacao" };
  }

  // 9. Contato
  if (message.contactMessage) {
    return { content: `👤 ${message.contactMessage.displayName || "Contato"}`, tipoMidia: "contato" };
  }

  // 10. Reação
  if (message.reactionMessage) {
    return { content: `${message.reactionMessage.text || '👍'} Reação`, tipoMidia: "reacao" };
  }

  // 11. View once
  if (message.viewOnceMessage || message.viewOnceMessageV2) {
    return { content: "🔒 Mídia temporária", tipoMidia: "viewonce" };
  }

  // Fallback - procurar qualquer texto
  for (const key of Object.keys(message)) {
    const val = message[key];
    if (val && typeof val === 'object') {
      if (val.text && typeof val.text === 'string') {
        return { content: val.text, tipoMidia: "texto" };
      }
      if (val.caption && typeof val.caption === 'string') {
        return { content: val.caption, tipoMidia: "midia" };
      }
    }
  }

  return { content: "📩 Mensagem recebida", tipoMidia: "outro" };
}

/**
 * Extrai timestamp
 */
function extractTimestamp(msgData: any): Date {
  const ts = msgData?.messageTimestamp;
  if (!ts) return new Date();
  
  let tsNum: number;
  if (typeof ts === 'object' && ts.low !== undefined) {
    tsNum = ts.low;
  } else if (typeof ts === 'string') {
    tsNum = parseInt(ts, 10);
  } else if (typeof ts === 'number') {
    tsNum = ts;
  } else {
    return new Date();
  }
  
  if (tsNum > 1577836800 && tsNum < 1893456000) {
    return new Date(tsNum * 1000);
  }
  return new Date();
}

/**
 * Mapear status
 */
function mapStatus(status: any): string {
  const map: Record<string, string> = {
    "0": "PENDING", "1": "SERVER_ACK", "2": "DELIVERY_ACK", "3": "READ", "4": "PLAYED",
    "PENDING": "PENDING", "SERVER_ACK": "SERVER_ACK", "DELIVERY_ACK": "DELIVERY_ACK", "READ": "READ", "PLAYED": "PLAYED",
  };
  return map[String(status)] || "PENDING";
}

/**
 * Normalizar evento
 */
function normalizeEvent(event: string | null | undefined): string {
  if (!event || typeof event !== 'string') return "";
  return event.toUpperCase().replace(/\./g, "_").replace(/-/g, "_");
}

// ========== HANDLER PRINCIPAL ==========

serve(async (req) => {
  // Log inicial
  console.log(`[Evolution Webhook] 🔔 Request at ${new Date().toISOString()}`);
  console.log(`[Evolution Webhook] Method: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ler payload
    const reqBody = await req.json();
    
    // LOG CRÍTICO: Payload completo para debug
    console.log(`[Evolution Webhook] 📦 PAYLOAD RECEBIDO:`, JSON.stringify(reqBody).slice(0, 3000));
    
    // EXTRAÇÃO ROBUSTA - Evolution v2 pode envolver em data ou data.data
    const rawEvent = reqBody.event || reqBody.type || "";
    const instance = reqBody.instance || reqBody.instanceName || "";
    
    // Tentar múltiplos níveis de data
    let data = reqBody.data || reqBody;
    
    // Se data.data existe (Evolution v2), usar esse nível
    if (data.data && typeof data.data === 'object') {
      console.log(`[Evolution Webhook] 🔍 Detectado formato Evolution v2 (data.data)`);
      data = data.data;
    }
    
    const event = normalizeEvent(rawEvent);
    console.log(`[Evolution Webhook] 📍 Evento: ${rawEvent} -> ${event}, Instance: ${instance}`);

    switch (event) {
      case "MESSAGES_UPSERT":
      case "MESSAGE_UPSERT":
      case "MESSAGES_CREATE": {
        // Construir array de mensagens - múltiplos formatos
        let messages: any[] = [];
        
        if (Array.isArray(data.messages)) {
          messages = data.messages;
        } else if (Array.isArray(data)) {
          messages = data;
        } else if (data.key || data.message) {
          messages = [data];
        } else if (reqBody.data?.key || reqBody.data?.message) {
          messages = [reqBody.data];
        }
        
        console.log(`[Evolution Webhook] 📨 Processando ${messages.length} mensagem(s)`);

        if (messages.length === 0) {
          console.log(`[Evolution Webhook] ⚠️ Nenhuma mensagem encontrada no payload`);
          console.log(`[Evolution Webhook] 🔍 Estrutura data:`, JSON.stringify(data).slice(0, 500));
        }

        for (const msgData of messages) {
          try {
            // EXTRAÇÃO BLINDADA de remoteJid
            const remoteJid = extractRemoteJid(reqBody, msgData);
            
            if (!remoteJid) {
              console.log("[Evolution Webhook] ❌ remoteJid não encontrado");
              continue;
            }
            
            // Validar JID
            if (!isValidWhatsAppJid(remoteJid)) {
              console.log("[Evolution Webhook] ❌ JID inválido/grupo:", remoteJid);
              continue;
            }

            // EXTRAÇÃO DE TELEFONE - remove TUDO que não é número
            const phone = extractPhone(remoteJid);
            if (!phone) {
              console.log("[Evolution Webhook] ❌ Telefone inválido:", remoteJid);
              continue;
            }

            // EXTRAÇÃO BLINDADA dos demais campos
            const messageId = extractMessageId(reqBody, msgData);
            const isFromMe = extractFromMe(reqBody, msgData);
            const pushName = extractName(reqBody, msgData, phone);
            const messageObj = extractMessageObject(reqBody, msgData);
            const { content, tipoMidia, mediaUrl, mediaMimetype } = extractMessageContent(messageObj);
            const timestamp = extractTimestamp(msgData);

            console.log(`[Evolution Webhook] 📝 Dados extraídos:`);
            console.log(`  - Phone: ${phone}`);
            console.log(`  - Name: ${pushName}`);
            console.log(`  - Content: "${content.slice(0, 50)}"`);
            console.log(`  - FromMe: ${isFromMe}`);
            console.log(`  - MsgID: ${messageId}`);

            // ========== UPSERT em contatos_inteligencia ==========
            let { data: contato, error: selectError } = await supabase
              .from("contatos_inteligencia")
              .select("id, whatsapp_profile_name")
              .eq("telefone", phone)
              .maybeSingle();

            if (selectError) {
              console.error("[Evolution Webhook] ❌ Erro SELECT contato:", selectError);
            }

            if (!contato) {
              // CRIAR novo contato
              const { data: novoContato, error: insertError } = await supabase
                .from("contatos_inteligencia")
                .insert({
                  telefone: phone,
                  nome: pushName,
                  whatsapp_profile_name: !looksLikePhone(pushName) ? pushName : null,
                  remote_jid: remoteJid,
                  origem: "evolution",
                  status: "nao_classificado",
                  ultima_mensagem: timestamp.toISOString(),
                })
                .select("id, whatsapp_profile_name")
                .single();

              if (insertError) {
                console.error("[Evolution Webhook] ❌ Erro INSERT contato:", JSON.stringify(insertError));
                continue;
              }
              contato = novoContato;
              console.log(`[Evolution Webhook] ✅ Contato CRIADO: ${contato.id}`);
            } else {
              // ATUALIZAR contato existente
              const updates: Record<string, any> = {
                ultima_mensagem: timestamp.toISOString(),
                remote_jid: remoteJid,
              };
              
              if (!looksLikePhone(pushName) && 
                  (!contato.whatsapp_profile_name || contato.whatsapp_profile_name.startsWith("Contato "))) {
                updates.whatsapp_profile_name = pushName;
                updates.nome = pushName;
              }
              
              const { error: updateError } = await supabase
                .from("contatos_inteligencia")
                .update(updates)
                .eq("id", contato.id);

              if (updateError) {
                console.error("[Evolution Webhook] ⚠️ Erro UPDATE contato:", updateError);
              }
            }

            // Verificar duplicata
            const { data: msgExistente } = await supabase
              .from("conversas_whatsapp")
              .select("id")
              .eq("message_id", messageId)
              .maybeSingle();

            if (msgExistente) {
              console.log(`[Evolution Webhook] ⏭️ Msg duplicada: ${messageId}`);
              continue;
            }

            // ========== INSERT em conversas_whatsapp ==========
            const { error: msgInsertError } = await supabase
              .from("conversas_whatsapp")
              .insert({
                contato_id: contato.id,
                telefone: phone,
                message_id: messageId,
                instance_name: instance,
                is_from_me: isFromMe,
                push_name: pushName,
                data_mensagem: timestamp.toISOString(),
                remetente: isFromMe ? "empresa" : "cliente",
                conteudo: content,
                tipo_midia: tipoMidia,
                media_url: mediaUrl,
                media_mimetype: mediaMimetype,
                lida: isFromMe,
                message_status: isFromMe ? "SERVER_ACK" : null,
              });

            if (msgInsertError) {
              console.error("[Evolution Webhook] ❌ Erro INSERT mensagem:", JSON.stringify(msgInsertError));
              continue;
            }

            console.log(`[Evolution Webhook] ✅ Mensagem SALVA: ${messageId}`);

            // Enfileirar análise IA
            if (!isFromMe) {
              const { data: inQueue } = await supabase
                .from("analise_queue")
                .select("id")
                .eq("contato_id", contato.id)
                .eq("status", "pendente")
                .maybeSingle();

              if (!inQueue) {
                await supabase.from("analise_queue").insert({
                  contato_id: contato.id,
                  status: "pendente",
                  prioridade: 2,
                });
              }
            }
          } catch (msgError) {
            console.error("[Evolution Webhook] ❌ Erro processando msg:", msgError);
          }
        }

        // Atualizar sync
        if (instance) {
          await supabase
            .from("evolution_config")
            .update({ ultima_sincronizacao: new Date().toISOString() })
            .eq("instance_name", instance);
        }
        break;
      }

      case "MESSAGES_UPDATE":
      case "MESSAGE_UPDATE": {
        const updates = Array.isArray(data) ? data : [data];
        
        for (const update of updates) {
          const messageId = update.key?.id || update.keyId || update.messageId;
          const newStatus = update.update?.status || update.status;
          
          if (!messageId) continue;

          await supabase
            .from("conversas_whatsapp")
            .update({ message_status: mapStatus(newStatus) })
            .eq("message_id", messageId);

          console.log(`[Evolution Webhook] ✅ Status ${messageId} atualizado`);
        }
        break;
      }

      case "SEND_MESSAGE": {
        const remoteJid = extractRemoteJid(reqBody, data);
        const messageId = extractMessageId(reqBody, data);
        
        if (!remoteJid || !messageId) break;
        if (!isValidWhatsAppJid(remoteJid)) break;

        const phone = extractPhone(remoteJid);
        if (!phone) break;

        const { data: existing } = await supabase
          .from("conversas_whatsapp")
          .select("id")
          .eq("message_id", messageId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("conversas_whatsapp")
            .update({ message_status: "SERVER_ACK" })
            .eq("message_id", messageId);
        } else {
          const { data: contato } = await supabase
            .from("contatos_inteligencia")
            .select("id, telefone")
            .eq("telefone", phone)
            .maybeSingle();

          if (contato) {
            const msgObj = extractMessageObject(reqBody, data);
            const { content, tipoMidia } = extractMessageContent(msgObj);
            
            await supabase
              .from("conversas_whatsapp")
              .insert({
                contato_id: contato.id,
                telefone: contato.telefone,
                message_id: messageId,
                instance_name: instance,
                is_from_me: true,
                data_mensagem: new Date().toISOString(),
                remetente: "empresa",
                conteudo: content || "Mensagem enviada",
                tipo_midia: tipoMidia,
                lida: true,
                message_status: "SERVER_ACK",
              });
          }
        }
        break;
      }

      case "CONTACTS_UPSERT":
      case "CONTACTS_UPDATE": {
        const contacts = data.contacts || (data.contact ? [data.contact] : Array.isArray(data) ? data : []);
        
        for (const contact of contacts) {
          const jid = contact.id || contact.remoteJid;
          if (!jid) continue;

          const phone = extractPhone(jid);
          if (!phone) continue;
          
          const { data: existing } = await supabase
            .from("contatos_inteligencia")
            .select("id")
            .eq("telefone", phone)
            .maybeSingle();

          const contactData = {
            whatsapp_profile_name: contact.pushName || contact.name,
            whatsapp_profile_picture: contact.profilePictureUrl,
            is_business: contact.isBusiness,
            business_name: contact.businessName,
            remote_jid: jid,
          };

          if (existing) {
            await supabase
              .from("contatos_inteligencia")
              .update(contactData)
              .eq("id", existing.id);
          } else {
            await supabase
              .from("contatos_inteligencia")
              .insert({
                ...contactData,
                telefone: phone,
                nome: contact.pushName || formatPhoneDisplay(phone),
                origem: "evolution",
                status: "nao_classificado",
              });
          }
        }
        console.log(`[Evolution Webhook] ✅ ${contacts.length} contatos processados`);
        break;
      }

      case "CONNECTION_UPDATE": {
        const state = data.state || data.status;
        let status = "desconectado";
        
        if (state === "open" || state === "connected") status = "conectado";
        else if (state === "connecting") status = "conectando";

        await supabase
          .from("evolution_config")
          .update({ status })
          .eq("instance_name", instance);

        console.log(`[Evolution Webhook] ✅ Conexão: ${status}`);
        break;
      }

      case "QRCODE_UPDATED":
      case "QR_CODE": {
        const qr = data.qrcode?.base64 || data.base64 || data.qr;
        if (qr) {
          await supabase
            .from("evolution_config")
            .update({ qrcode_base64: qr, status: "qrcode" })
            .eq("instance_name", instance);
        }
        break;
      }

      default:
        console.log(`[Evolution Webhook] ⚠️ Evento não tratado: ${rawEvent}`);
    }

    console.log(`[Evolution Webhook] ⏱️ Concluído em ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Evolution Webhook] ❌ ERRO CRÍTICO:", error);
    console.error("[Evolution Webhook] Stack:", error instanceof Error ? error.stack : "N/A");
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
