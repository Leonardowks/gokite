import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== UTILITÁRIOS BLINDADOS ==========

/**
 * Valida se é um JID de contato WhatsApp válido (ignora grupos, broadcasts e IDs especiais)
 */
function isValidWhatsAppJid(jid: string | null | undefined): boolean {
  if (!jid || typeof jid !== 'string') return false;

  // Aceitar contatos individuais (inclui "@lid" que a Evolution pode enviar)
  const isIndividual = jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
  if (!isIndividual) return false;

  // Bloquear grupos, broadcast e destinos especiais
  if (jid.includes("@g.us") || jid.includes("@broadcast")) return false;

  return true;
}

/**
 * Normaliza telefone para formato consistente - remove sufixos do JID
 */
function normalizePhone(jid: string | null | undefined): string {
  if (!jid || typeof jid !== 'string') return "";

  // Extrair apenas a parte numérica antes do sufixo
  const phone = jid
    .replace("@s.whatsapp.net", "")
    .replace("@lid", "")
    .replace(/\D/g, "");

  // Validar que tem pelo menos 8 dígitos
  return phone.length >= 8 ? phone : "";
}

/**
 * Formata telefone para exibição amigável
 */
function formatPhoneForDisplay(phone: string): string {
  if (!phone) return "Contato";
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 10) {
    const ddd = clean.slice(-10, -8);
    const parte1 = clean.slice(-8, -4);
    const parte2 = clean.slice(-4);
    return `(${ddd}) ${parte1}-${parte2}`;
  }
  return phone.slice(-8);
}

/**
 * Verifica se string parece um número de telefone (não um nome válido)
 */
function isPhoneNumber(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') return true;
  const cleaned = str.replace(/\D/g, '');
  // Se mais de 70% são dígitos e tem pelo menos 8, é telefone
  return cleaned.length >= 8 && cleaned.length / str.length > 0.7;
}

/**
 * EXTRAÇÃO BLINDADA DE NOME - tenta múltiplos caminhos
 */
function extractPushName(payload: any, msgData: any, phone: string): string {
  // Lista de caminhos possíveis para o pushName
  const possiblePaths = [
    msgData?.pushName,
    payload?.data?.pushName,
    payload?.pushName,
    msgData?.key?.pushName,
    payload?.data?.key?.pushName,
    payload?.sender?.pushName,
    payload?.data?.sender?.pushName,
  ];

  for (const candidate of possiblePaths) {
    if (candidate && typeof candidate === 'string' && candidate.trim().length > 1) {
      // Verificar se não é apenas números (telefone disfarçado)
      if (!isPhoneNumber(candidate)) {
        return candidate.trim();
      }
    }
  }

  // Fallback: telefone formatado
  return formatPhoneForDisplay(phone);
}

/**
 * EXTRAÇÃO BLINDADA DE CONTEÚDO - varre múltiplos caminhos do payload
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

  // 1. Texto simples (conversation)
  if (message.conversation && typeof message.conversation === 'string') {
    return { content: message.conversation, tipoMidia: "texto" };
  }

  // 2. Texto estendido
  if (message.extendedTextMessage?.text) {
    return { content: message.extendedTextMessage.text, tipoMidia: "texto" };
  }

  // 3. Imagem com caption
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
    const fileName = message.documentMessage.fileName || "Documento";
    return {
      content: `📄 ${fileName}`,
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

  // 9. Contato compartilhado
  if (message.contactMessage) {
    const displayName = message.contactMessage.displayName || "Contato";
    return { content: `👤 ${displayName}`, tipoMidia: "contato" };
  }

  // 10. Lista de contatos
  if (message.contactsArrayMessage) {
    return { content: "👥 Contatos compartilhados", tipoMidia: "contatos" };
  }

  // 11. Mensagem de botão/lista
  if (message.buttonsResponseMessage) {
    return { content: message.buttonsResponseMessage.selectedDisplayText || "Resposta de botão", tipoMidia: "botao" };
  }

  if (message.listResponseMessage) {
    return { content: message.listResponseMessage.title || "Resposta de lista", tipoMidia: "lista" };
  }

  // 12. Reação
  if (message.reactionMessage) {
    return { content: `${message.reactionMessage.text || '👍'} Reação`, tipoMidia: "reacao" };
  }

  // 13. Mensagem com view once
  if (message.viewOnceMessage || message.viewOnceMessageV2) {
    return { content: "🔒 Mídia temporária", tipoMidia: "viewonce" };
  }

  // Fallback final - tentar pegar qualquer texto que exista
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

  // Último fallback
  return { content: "📩 Mensagem recebida", tipoMidia: "outro" };
}

/**
 * Mapear status da Evolution para status interno
 */
function mapMessageStatus(evolutionStatus: number | string | undefined | null): string {
  if (!evolutionStatus) return "PENDING";
  
  const statusMap: Record<string, string> = {
    "0": "PENDING",
    "1": "SERVER_ACK",
    "2": "DELIVERY_ACK",
    "3": "READ",
    "4": "PLAYED",
    "PENDING": "PENDING",
    "SERVER_ACK": "SERVER_ACK",
    "DELIVERY_ACK": "DELIVERY_ACK",
    "READ": "READ",
    "PLAYED": "PLAYED",
  };
  return statusMap[String(evolutionStatus)] || "PENDING";
}

/**
 * Normalizar nome do evento para formato consistente
 */
function normalizeEventName(event: string | null | undefined): string {
  if (!event || typeof event !== 'string') return "";
  return event.toUpperCase().replace(/\./g, "_").replace(/-/g, "_");
}

/**
 * Extrai timestamp da mensagem
 */
function extractTimestamp(msgData: any, fallback: Date = new Date()): Date {
  const ts = msgData?.messageTimestamp;
  
  if (!ts) return fallback;
  
  // Suporta objeto {low, high} ou número direto
  let tsNum: number;
  if (typeof ts === 'object' && ts.low !== undefined) {
    tsNum = ts.low;
  } else if (typeof ts === 'string') {
    tsNum = parseInt(ts, 10);
  } else if (typeof ts === 'number') {
    tsNum = ts;
  } else {
    return fallback;
  }
  
  // Validar se é um timestamp razoável (entre 2020 e 2030)
  if (tsNum > 1577836800 && tsNum < 1893456000) {
    return new Date(tsNum * 1000);
  }
  
  return fallback;
}

// ========== HANDLER PRINCIPAL ==========

serve(async (req) => {
  console.log(`[Evolution Webhook] 🔔 Request at ${new Date().toISOString()}`);
  console.log(`[Evolution Webhook] Method: ${req.method}, URL: ${req.url}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Usando SERVICE_ROLE_KEY para ignorar RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    
    // Log do payload (limitado para não sobrecarregar)
    console.log(`[Evolution Webhook] 📦 Payload:`, JSON.stringify(payload).slice(0, 2000));
    
    // Extrair dados do payload - suporta múltiplos formatos
    const rawEvent = payload.event || payload.type || "";
    const instance = payload.instance || payload.instanceName || "";
    const data = payload.data || payload;
    
    const event = normalizeEventName(rawEvent);
    
    console.log(`[Evolution Webhook] 📍 Evento: ${rawEvent} -> ${event}, Instance: ${instance}`);

    // Processar eventos
    switch (event) {
      // ========== MENSAGENS RECEBIDAS/ENVIADAS ==========
      case "MESSAGES_UPSERT":
      case "MESSAGE_UPSERT":
      case "MESSAGES_CREATE": {
        // Suportar array de mensagens ou mensagem única
        let messages: any[] = [];
        
        if (Array.isArray(data.messages)) {
          messages = data.messages;
        } else if (Array.isArray(data)) {
          messages = data;
        } else if (data.key) {
          messages = [data];
        }
        
        console.log(`[Evolution Webhook] Processando ${messages.length} mensagens`);

        for (const msgData of messages) {
          try {
            const key = msgData.key || {};
            const remoteJid = key.remoteJid;
            
            // Validar JID
            if (!isValidWhatsAppJid(remoteJid)) {
              console.log("[Evolution Webhook] ❌ JID inválido/grupo:", remoteJid);
              continue;
            }

            const phone = normalizePhone(remoteJid);
            if (!phone) {
              console.log("[Evolution Webhook] ❌ Telefone inválido de:", remoteJid);
              continue;
            }

            const messageId = key.id || `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const isFromMe = key.fromMe === true;
            
            // EXTRAÇÃO BLINDADA de nome
            const pushName = extractPushName(payload, msgData, phone);
            
            // EXTRAÇÃO BLINDADA de conteúdo
            const message = msgData.message || {};
            const { content, tipoMidia, mediaUrl, mediaMimetype } = extractMessageContent(message);
            
            // Timestamp
            const timestamp = extractTimestamp(msgData);

            console.log(`[Evolution Webhook] 📨 Msg: "${content.slice(0, 50)}" de ${pushName} (${phone})`);

            // UPSERT do contato - criar ou atualizar
            let { data: contato } = await supabase
              .from("contatos_inteligencia")
              .select("id, whatsapp_profile_name")
              .eq("telefone", phone)
              .maybeSingle();

            if (!contato) {
              // Criar novo contato
              const { data: novoContato, error: createError } = await supabase
                .from("contatos_inteligencia")
                .insert({
                  telefone: phone,
                  nome: pushName,
                  whatsapp_profile_name: !isPhoneNumber(pushName) ? pushName : null,
                  remote_jid: remoteJid,
                  origem: "evolution",
                  status: "nao_classificado",
                  ultima_mensagem: timestamp.toISOString(),
                })
                .select("id, whatsapp_profile_name")
                .single();

              if (createError) {
                console.error("[Evolution Webhook] ❌ Erro criar contato:", createError);
                continue;
              }
              contato = novoContato;
              console.log(`[Evolution Webhook] ✅ Novo contato: ${contato.id} - ${pushName}`);
            } else {
              // Atualizar contato existente
              const updates: Record<string, any> = {
                ultima_mensagem: timestamp.toISOString(),
                remote_jid: remoteJid,
              };
              
              // Atualizar nome se temos um melhor
              if (!isPhoneNumber(pushName) && 
                  (!contato.whatsapp_profile_name || contato.whatsapp_profile_name.startsWith("Contato "))) {
                updates.whatsapp_profile_name = pushName;
                updates.nome = pushName;
              }
              
              await supabase
                .from("contatos_inteligencia")
                .update(updates)
                .eq("id", contato.id);
            }

            // Verificar duplicata de mensagem
            const { data: msgExistente } = await supabase
              .from("conversas_whatsapp")
              .select("id")
              .eq("message_id", messageId)
              .maybeSingle();

            if (msgExistente) {
              console.log(`[Evolution Webhook] ⏭️ Mensagem duplicada: ${messageId}`);
              continue;
            }

            // Inserir mensagem
            const { error: insertError } = await supabase
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

            if (insertError) {
              console.error("[Evolution Webhook] ❌ Erro inserir msg:", insertError);
              continue;
            }

            console.log(`[Evolution Webhook] ✅ Mensagem salva: ${messageId} (${isFromMe ? 'enviada' : 'recebida'})`);

            // Enfileirar análise IA para mensagens de clientes
            if (!isFromMe) {
              const { data: existingQueue } = await supabase
                .from("analise_queue")
                .select("id")
                .eq("contato_id", contato.id)
                .eq("status", "pendente")
                .maybeSingle();

              if (!existingQueue) {
                await supabase.from("analise_queue").insert({
                  contato_id: contato.id,
                  status: "pendente",
                  prioridade: 2,
                });
              }
            }
          } catch (msgError) {
            console.error("[Evolution Webhook] ❌ Erro processando mensagem:", msgError);
          }
        }

        // Atualizar última sincronização
        if (instance) {
          await supabase
            .from("evolution_config")
            .update({ ultima_sincronizacao: new Date().toISOString() })
            .eq("instance_name", instance);
        }
        break;
      }

      // ========== ATUALIZAÇÃO DE STATUS DE MENSAGEM ==========
      case "MESSAGES_UPDATE":
      case "MESSAGE_UPDATE": {
        const updates = Array.isArray(data) ? data : [data];
        
        for (const update of updates) {
          const messageId = update.key?.id || update.keyId || update.messageId;
          const newStatus = update.update?.status || update.status;
          
          if (!messageId) continue;

          const mappedStatus = mapMessageStatus(newStatus);
          
          await supabase
            .from("conversas_whatsapp")
            .update({ message_status: mappedStatus })
            .eq("message_id", messageId);

          console.log(`[Evolution Webhook] ✅ Status ${messageId} -> ${mappedStatus}`);
        }
        break;
      }

      // ========== CONFIRMAÇÃO DE MENSAGEM ENVIADA ==========
      case "SEND_MESSAGE": {
        const key = data.key || {};
        const remoteJid = key.remoteJid;
        const messageId = key.id;
        
        if (!remoteJid || !messageId) break;
        if (!isValidWhatsAppJid(remoteJid)) break;

        const phone = normalizePhone(remoteJid);
        if (!phone) break;

        // Verificar se já existe
        const { data: existingMsg } = await supabase
          .from("conversas_whatsapp")
          .select("id")
          .eq("message_id", messageId)
          .maybeSingle();

        if (existingMsg) {
          await supabase
            .from("conversas_whatsapp")
            .update({ message_status: "SERVER_ACK" })
            .eq("message_id", messageId);
        } else {
          // Buscar contato e inserir
          const { data: contato } = await supabase
            .from("contatos_inteligencia")
            .select("id, telefone")
            .eq("telefone", phone)
            .maybeSingle();

          if (contato) {
            const { content, tipoMidia } = extractMessageContent(data.message);
            
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
            
            console.log(`[Evolution Webhook] ✅ SEND_MESSAGE: ${messageId}`);
          }
        }
        break;
      }

      // ========== CONTATOS ==========
      case "CONTACTS_UPSERT":
      case "CONTACTS_UPDATE": {
        const contacts = data.contacts || (data.contact ? [data.contact] : Array.isArray(data) ? data : []);
        
        for (const contact of contacts) {
          const contactId = contact.id || contact.remoteJid;
          if (!contactId) continue;

          const phone = normalizePhone(contactId);
          if (!phone) continue;
          
          const { data: existingContact } = await supabase
            .from("contatos_inteligencia")
            .select("id")
            .eq("telefone", phone)
            .maybeSingle();

          const contactData = {
            whatsapp_profile_name: contact.pushName || contact.name,
            whatsapp_profile_picture: contact.profilePictureUrl,
            is_business: contact.isBusiness,
            business_name: contact.businessName,
            remote_jid: contactId,
          };

          if (existingContact) {
            await supabase
              .from("contatos_inteligencia")
              .update(contactData)
              .eq("id", existingContact.id);
          } else {
            await supabase
              .from("contatos_inteligencia")
              .insert({
                ...contactData,
                telefone: phone,
                nome: contact.pushName || formatPhoneForDisplay(phone),
                origem: "evolution",
                status: "nao_classificado",
              });
          }
        }
        console.log(`[Evolution Webhook] ✅ ${contacts.length} contatos processados`);
        break;
      }

      // ========== STATUS DE CONEXÃO ==========
      case "CONNECTION_UPDATE": {
        const state = data.state || data.status;
        let status = "desconectado";
        
        if (state === "open" || state === "connected") status = "conectado";
        else if (state === "connecting") status = "conectando";
        else if (state === "close" || state === "disconnected") status = "desconectado";

        await supabase
          .from("evolution_config")
          .update({ status })
          .eq("instance_name", instance);

        console.log(`[Evolution Webhook] ✅ Conexão: ${status}`);
        break;
      }

      // ========== QR CODE ==========
      case "QRCODE_UPDATED":
      case "QR_CODE": {
        const qrcode = data.qrcode?.base64 || data.base64 || data.qr;
        
        if (qrcode) {
          await supabase
            .from("evolution_config")
            .update({ qrcode_base64: qrcode, status: "qrcode" })
            .eq("instance_name", instance);
          console.log("[Evolution Webhook] ✅ QR Code atualizado");
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
    console.error("[Evolution Webhook] ❌ Erro crítico:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
