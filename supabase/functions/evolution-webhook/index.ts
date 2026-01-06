import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvolutionConfig {
  api_url: string;
  api_key: string;
}

// Normaliza telefone para formato consistente
function normalizePhone(phone: string): string {
  if (!phone) return "";
  return phone.replace(/[@s.a-z]/gi, "").replace(/\D/g, "");
}

// Verifica se string parece um número de telefone
function isPhoneNumber(str: string): boolean {
  if (!str) return false;
  const cleaned = str.replace(/\D/g, '');
  return cleaned.length >= 8 && cleaned.length / str.length > 0.7;
}

// Extrai conteúdo da mensagem - suporta múltiplos formatos
function extractMessageContent(message: any): { content: string; tipoMidia: string; mediaUrl?: string; mediaMimetype?: string } {
  if (!message) return { content: "", tipoMidia: "texto" };

  // Texto simples
  if (message.conversation) {
    return { content: message.conversation, tipoMidia: "texto" };
  }

  // Texto estendido
  if (message.extendedTextMessage?.text) {
    return { content: message.extendedTextMessage.text, tipoMidia: "texto" };
  }

  // Imagem
  if (message.imageMessage) {
    return {
      content: message.imageMessage.caption || "[Imagem]",
      tipoMidia: "imagem",
      mediaUrl: message.imageMessage.url,
      mediaMimetype: message.imageMessage.mimetype,
    };
  }

  // Áudio
  if (message.audioMessage) {
    return {
      content: "[Áudio]",
      tipoMidia: "audio",
      mediaUrl: message.audioMessage.url,
      mediaMimetype: message.audioMessage.mimetype,
    };
  }

  // Vídeo
  if (message.videoMessage) {
    return {
      content: message.videoMessage.caption || "[Vídeo]",
      tipoMidia: "video",
      mediaUrl: message.videoMessage.url,
      mediaMimetype: message.videoMessage.mimetype,
    };
  }

  // Documento
  if (message.documentMessage) {
    return {
      content: message.documentMessage.fileName || "[Documento]",
      tipoMidia: "documento",
      mediaUrl: message.documentMessage.url,
      mediaMimetype: message.documentMessage.mimetype,
    };
  }

  // Sticker
  if (message.stickerMessage) {
    return { content: "[Sticker]", tipoMidia: "sticker" };
  }

  // Localização
  if (message.locationMessage) {
    return { content: "[Localização]", tipoMidia: "localizacao" };
  }

  // Contato
  if (message.contactMessage) {
    return { content: `[Contato: ${message.contactMessage.displayName || 'Contato'}]`, tipoMidia: "contato" };
  }

  return { content: "[Mensagem não suportada]", tipoMidia: "outro" };
}

// Mapear status da Evolution para status interno
function mapMessageStatus(evolutionStatus: number | string): string {
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
  return statusMap[String(evolutionStatus)] || String(evolutionStatus);
}

// Normalizar nome do evento para formato consistente
function normalizeEventName(event: string): string {
  if (!event) return "";
  // Converter para uppercase e substituir . por _
  return event.toUpperCase().replace(/\./g, "_").replace(/-/g, "_");
}

// Buscar foto de perfil
async function fetchProfilePicture(config: EvolutionConfig, instanceName: string, remoteJid: string): Promise<string | null> {
  try {
    const response = await fetch(`${config.api_url}/chat/fetchProfilePictureUrl/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": config.api_key },
      body: JSON.stringify({ number: remoteJid }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.profilePictureUrl || null;
  } catch {
    return null;
  }
}

// Enriquece dados do contato
async function enrichContactData(
  supabase: any,
  config: EvolutionConfig,
  instanceName: string,
  contatoId: string,
  remoteJid: string,
  currentPushName?: string
): Promise<void> {
  try {
    const { data: contato } = await supabase
      .from("contatos_inteligencia")
      .select("whatsapp_profile_picture, whatsapp_profile_name")
      .eq("id", contatoId)
      .single();

    if (!contato) return;

    const updates: Record<string, any> = {};

    if (!contato.whatsapp_profile_picture) {
      const profilePicture = await fetchProfilePicture(config, instanceName, remoteJid);
      if (profilePicture) {
        updates.whatsapp_profile_picture = profilePicture;
      }
    }

    if (currentPushName && !isPhoneNumber(currentPushName)) {
      if (!contato.whatsapp_profile_name || contato.whatsapp_profile_name.startsWith("Contato ")) {
        updates.whatsapp_profile_name = currentPushName;
        updates.nome = currentPushName;
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("contatos_inteligencia").update(updates).eq("id", contatoId);
    }
  } catch (error) {
    console.error("[Evolution Webhook] Erro ao enriquecer contato:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    
    // Extrair dados do payload - suporta múltiplos formatos
    const rawEvent = payload.event || payload.type || "";
    const instance = payload.instance || payload.instanceName || "";
    const data = payload.data || payload;
    
    // Normalizar nome do evento
    const event = normalizeEventName(rawEvent);
    
    console.log(`[Evolution Webhook] ${new Date().toISOString()} - Evento: ${rawEvent} -> ${event}, Instance: ${instance}`);
    console.log(`[Evolution Webhook] Payload:`, JSON.stringify(payload).slice(0, 1500));

    // Buscar configuração
    const { data: evolutionConfig } = await supabase
      .from("evolution_config")
      .select("api_url, api_key")
      .eq("instance_name", instance)
      .maybeSingle();

    // Processar eventos
    switch (event) {
      // ========== MENSAGENS RECEBIDAS/ENVIADAS ==========
      case "MESSAGES_UPSERT":
      case "MESSAGE_UPSERT":
      case "MESSAGES_CREATE": {
        // Suportar array de mensagens ou mensagem única
        const messages = Array.isArray(data.messages) ? data.messages : 
                         Array.isArray(data) ? data :
                         data.key ? [data] : [];
        
        if (messages.length === 0 && data.key) {
          messages.push(data);
        }

        for (const msgData of messages) {
          const key = msgData.key || {};
          const remoteJid = key.remoteJid;
          
          if (!remoteJid || remoteJid.includes("@g.us") || remoteJid.includes("@broadcast")) {
            console.log("[Evolution Webhook] Ignorando grupo/broadcast:", remoteJid);
            continue;
          }

          const phone = normalizePhone(remoteJid);
          if (!phone || phone.length < 8) {
            console.log("[Evolution Webhook] Telefone inválido:", phone);
            continue;
          }

          const messageId = key.id;
          const isFromMe = key.fromMe === true;
          const pushName = msgData.pushName || data.pushName;
          
          // Timestamp
          let timestamp: Date;
          const ts = msgData.messageTimestamp || data.messageTimestamp;
          if (ts) {
            const tsNum = typeof ts === 'object' ? (ts.low || 0) : 
                          typeof ts === 'string' ? parseInt(ts) : ts;
            timestamp = new Date(tsNum * 1000);
          } else {
            timestamp = new Date();
          }

          // Extrair conteúdo
          const message = msgData.message || {};
          const { content, tipoMidia, mediaUrl, mediaMimetype } = extractMessageContent(message);

          if (!content || content === "[Mensagem não suportada]") {
            console.log("[Evolution Webhook] Sem conteúdo válido, ignorando");
            continue;
          }

          // Buscar ou criar contato
          let { data: contato } = await supabase
            .from("contatos_inteligencia")
            .select("id")
            .eq("telefone", phone)
            .maybeSingle();

          if (!contato) {
            const validName = pushName && !isPhoneNumber(pushName) ? pushName : null;
            
            const { data: novoContato, error: createError } = await supabase
              .from("contatos_inteligencia")
              .insert({
                telefone: phone,
                nome: validName || `Contato ${phone.slice(-4)}`,
                whatsapp_profile_name: validName,
                remote_jid: remoteJid,
                origem: "evolution",
                status: "nao_classificado",
              })
              .select("id")
              .single();

            if (createError) {
              console.error("[Evolution Webhook] Erro ao criar contato:", createError);
              continue;
            }
            contato = novoContato;
            console.log(`[Evolution Webhook] Novo contato criado: ${contato.id} - ${phone}`);
          }

          // Verificar se mensagem já existe
          if (messageId) {
            const { data: msgExistente } = await supabase
              .from("conversas_whatsapp")
              .select("id")
              .eq("message_id", messageId)
              .maybeSingle();

            if (msgExistente) {
              console.log(`[Evolution Webhook] Mensagem ${messageId} já existe`);
              continue;
            }
          }

          // Inserir mensagem
          const { error: insertError } = await supabase
            .from("conversas_whatsapp")
            .insert({
              contato_id: contato.id,
              telefone: phone,
              message_id: messageId || `gen_${Date.now()}`,
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
            console.error("[Evolution Webhook] Erro ao inserir mensagem:", insertError);
            continue;
          }

          // Atualizar contato
          const contatoUpdates: Record<string, any> = {
            ultima_mensagem: timestamp.toISOString(),
            remote_jid: remoteJid,
          };
          
          if (pushName && !isPhoneNumber(pushName)) {
            contatoUpdates.whatsapp_profile_name = pushName;
          }
          
          await supabase
            .from("contatos_inteligencia")
            .update(contatoUpdates)
            .eq("id", contato.id);

          console.log(`[Evolution Webhook] ✅ Mensagem salva: ${messageId} de ${phone} (${isFromMe ? 'enviada' : 'recebida'})`);

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
              console.log(`[Evolution Webhook] Contato ${contato.id} adicionado à fila de análise IA`);
            }
          }

          // Enriquecer contato em background
          if (!isFromMe && evolutionConfig) {
            enrichContactData(supabase, evolutionConfig, instance, contato.id, remoteJid, pushName)
              .catch(err => console.error("[Evolution Webhook] Erro enriquecimento:", err));
          }
        }

        // Atualizar última sincronização
        await supabase
          .from("evolution_config")
          .update({ ultima_sincronizacao: new Date().toISOString() })
          .eq("instance_name", instance);
        break;
      }

      // ========== ATUALIZAÇÃO DE STATUS DE MENSAGEM ==========
      case "MESSAGES_UPDATE":
      case "MESSAGE_UPDATE": {
        // Pode ser objeto único ou array
        const updates = Array.isArray(data) ? data : [data];
        
        for (const update of updates) {
          // Formatos possíveis de messageId
          const messageId = update.key?.id || update.keyId || update.messageId;
          // Formatos possíveis de status
          const newStatus = update.update?.status || update.status;
          
          if (!messageId) continue;

          const mappedStatus = mapMessageStatus(newStatus);
          
          const { error } = await supabase
            .from("conversas_whatsapp")
            .update({ message_status: mappedStatus })
            .eq("message_id", messageId);

          if (!error) {
            console.log(`[Evolution Webhook] ✅ Status ${messageId} -> ${mappedStatus}`);
          }
        }
        break;
      }

      // ========== CONFIRMAÇÃO DE MENSAGEM ENVIADA ==========
      case "SEND_MESSAGE": {
        const key = data.key || {};
        const remoteJid = key.remoteJid;
        const messageId = key.id;
        
        if (!remoteJid || !messageId) break;
        
        // Ignorar grupos
        if (remoteJid.includes("@g.us") || remoteJid.includes("@broadcast")) break;

        const phone = normalizePhone(remoteJid);

        // Verificar se já existe
        const { data: existingMsg } = await supabase
          .from("conversas_whatsapp")
          .select("id")
          .eq("message_id", messageId)
          .maybeSingle();

        if (existingMsg) {
          // Atualizar status
          await supabase
            .from("conversas_whatsapp")
            .update({ message_status: "SERVER_ACK" })
            .eq("message_id", messageId);
          console.log(`[Evolution Webhook] ✅ SEND_MESSAGE: Status atualizado ${messageId}`);
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
                conteudo: content || "[Mensagem enviada]",
                tipo_midia: tipoMidia,
                lida: true,
                message_status: "SERVER_ACK",
              });
            
            console.log(`[Evolution Webhook] ✅ SEND_MESSAGE: Nova mensagem ${messageId}`);
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
                nome: contact.pushName || `Contato ${phone.slice(-4)}`,
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
        console.log(`[Evolution Webhook] ⚠️ Evento não tratado: ${rawEvent} (normalizado: ${event})`);
    }

    console.log(`[Evolution Webhook] Processamento concluído em ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Evolution Webhook] ❌ Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
