import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== UTILITÁRIOS ==========

function extractPhone(jid: string): string {
  if (!jid) return "";
  return jid.replace(/\D/g, "");
}

function isValidJid(jid: string): boolean {
  if (!jid) return false;
  if (jid.includes("@g.us") || jid.includes("@broadcast") || jid.includes("status@")) return false;
  return jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
}

function extractContent(message: any): { content: string; tipoMidia: string; mediaUrl?: string } {
  if (!message) return { content: "📩 Nova mensagem", tipoMidia: "texto" };

  if (message.conversation) return { content: message.conversation, tipoMidia: "texto" };
  if (message.extendedTextMessage?.text) return { content: message.extendedTextMessage.text, tipoMidia: "texto" };
  if (message.imageMessage) return { content: message.imageMessage.caption || "📷 Imagem", tipoMidia: "imagem", mediaUrl: message.imageMessage.url };
  if (message.audioMessage) return { content: `🎤 Áudio (${message.audioMessage.seconds || 0}s)`, tipoMidia: "audio", mediaUrl: message.audioMessage.url };
  if (message.videoMessage) return { content: message.videoMessage.caption || "🎬 Vídeo", tipoMidia: "video", mediaUrl: message.videoMessage.url };
  if (message.documentMessage) return { content: `📄 ${message.documentMessage.fileName || "Documento"}`, tipoMidia: "documento", mediaUrl: message.documentMessage.url };
  if (message.stickerMessage) return { content: "🎭 Sticker", tipoMidia: "sticker" };
  if (message.locationMessage) return { content: "📍 Localização", tipoMidia: "localizacao" };
  if (message.contactMessage) return { content: `👤 ${message.contactMessage.displayName || "Contato"}`, tipoMidia: "contato" };

  return { content: "📩 Mensagem", tipoMidia: "outro" };
}

// ========== EXTRATORES UNIVERSAIS (BLINDAGEM) ==========

interface ExtractedMessage {
  remoteJid: string;
  fromMe: boolean;
  messageId: string;
  pushName: string | null;
  messageObj: any;
  timestamp: Date;
}

function tryExtractMessage(payload: any): ExtractedMessage | null {
  // Tenta extrair mensagem de QUALQUER estrutura de payload
  // Funciona para MESSAGES_UPSERT, SEND_MESSAGE, e qualquer variação
  
  const paths = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.message,
    payload?.data?.message,
  ];
  
  for (const p of paths) {
    if (!p) continue;
    
    // Verificar se é um array de mensagens
    const messages = p.messages || (Array.isArray(p) ? p : null);
    if (messages && messages.length > 0) {
      return extractFromMessageObject(messages[0], payload);
    }
    
    // Verificar se tem key + message (formato direto)
    if (p.key && p.message) {
      return extractFromMessageObject(p, payload);
    }
    
    // Verificar se tem key.remoteJid + message em algum lugar
    if (p.key?.remoteJid) {
      const msgObj = p.message || payload?.data?.message || {};
      return extractFromMessageObject({ ...p, message: msgObj }, payload);
    }
  }
  
  return null;
}

function extractFromMessageObject(msgData: any, rootPayload: any): ExtractedMessage | null {
  // Extração blindada de todos os campos necessários
  
  const remoteJid = 
    msgData?.key?.remoteJid ||
    rootPayload?.data?.key?.remoteJid ||
    rootPayload?.key?.remoteJid ||
    null;
  
  if (!remoteJid || !isValidJid(remoteJid)) {
    return null;
  }
  
  const fromMe = 
    msgData?.key?.fromMe === true ||
    rootPayload?.data?.key?.fromMe === true ||
    rootPayload?.key?.fromMe === true ||
    false;
  
  const messageId = 
    msgData?.key?.id ||
    rootPayload?.data?.key?.id ||
    rootPayload?.key?.id ||
    `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const pushName = 
    msgData?.pushName ||
    rootPayload?.data?.pushName ||
    rootPayload?.pushName ||
    null;
  
  const messageObj = 
    msgData?.message ||
    rootPayload?.data?.message ||
    rootPayload?.message ||
    {};
  
  // Extrair timestamp
  let timestamp = new Date();
  const ts = msgData?.messageTimestamp || rootPayload?.data?.messageTimestamp;
  if (ts) {
    const tsNum = typeof ts === 'object' ? ts.low : (typeof ts === 'string' ? parseInt(ts, 10) : ts);
    if (tsNum > 1577836800 && tsNum < 2000000000) {
      timestamp = new Date(tsNum * 1000);
    }
  }
  
  return {
    remoteJid,
    fromMe,
    messageId,
    pushName,
    messageObj,
    timestamp,
  };
}

// ========== PROCESSADOR DE MENSAGEM UNIFICADO ==========

async function processMessage(
  supabase: any,
  extracted: ExtractedMessage,
  instance: string
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  
  const { remoteJid, fromMe, messageId, pushName, messageObj, timestamp } = extracted;
  
  // PASSO A: Extrair telefone limpo
  const telefone = extractPhone(remoteJid);
  if (!telefone || telefone.length < 8) {
    return { success: false, error: "Telefone inválido" };
  }
  
  console.log(`>>> MSG ${fromMe ? "ENVIADA" : "RECEBIDA"}. FromMe: ${fromMe}. Tel: ${telefone}`);
  
  // PASSO B: Determinar remetente baseado em fromMe
  const remetente = fromMe ? "suporte" : "cliente";
  const nomeContato = (pushName && pushName.trim().length > 1 && !pushName.match(/^\d+$/)) 
    ? pushName.trim() 
    : `Contato ${telefone.slice(-4)}`;
  
  // PASSO C: UPSERT do contato (OBRIGATÓRIO antes de salvar mensagem)
  let contatoId: string;
  
  const { data: contatoExistente } = await supabase
    .from("contatos_inteligencia")
    .select("id, nome, whatsapp_profile_name")
    .eq("telefone", telefone)
    .maybeSingle();
  
  if (contatoExistente) {
    contatoId = contatoExistente.id;
    
    const updateData: Record<string, any> = {
      ultima_mensagem: timestamp.toISOString(),
      remote_jid: remoteJid,
    };
    
    // Atualizar nome se pushName for válido
    if (pushName && pushName.trim().length > 1 && !pushName.match(/^\d+$/)) {
      if (!contatoExistente.whatsapp_profile_name || contatoExistente.whatsapp_profile_name.startsWith("Contato ")) {
        updateData.nome = pushName.trim();
        updateData.whatsapp_profile_name = pushName.trim();
      }
    }
    
    await supabase
      .from("contatos_inteligencia")
      .update(updateData)
      .eq("id", contatoId);
    
    console.log(`>>> Contato atualizado: ${contatoId}`);
  } else {
    // Criar novo contato
    const { data: novoContato, error: insertError } = await supabase
      .from("contatos_inteligencia")
      .insert({
        telefone: telefone,
        nome: nomeContato,
        whatsapp_profile_name: (pushName && !pushName.match(/^\d+$/)) ? pushName.trim() : null,
        remote_jid: remoteJid,
        origem: "evolution",
        status: "nao_classificado",
        prioridade: "media",
        ultima_mensagem: timestamp.toISOString(),
      })
      .select("id")
      .single();
    
    if (insertError) {
      console.error(">>> ERRO criando contato:", JSON.stringify(insertError));
      return { success: false, error: "Falha ao criar contato" };
    }
    
    contatoId = novoContato.id;
    console.log(`>>> Contato criado: ${contatoId}`);
  }
  
  // PASSO D: Verificar duplicata e salvar mensagem
  const { data: msgExistente } = await supabase
    .from("conversas_whatsapp")
    .select("id")
    .eq("message_id", messageId)
    .maybeSingle();
  
  if (msgExistente) {
    console.log(`>>> Msg duplicada: ${messageId}`);
    return { success: true, contactId: contatoId };
  }
  
  // Extrair conteúdo
  const { content, tipoMidia, mediaUrl } = extractContent(messageObj);
  
  // Inserir mensagem
  const { error: msgError } = await supabase
    .from("conversas_whatsapp")
    .insert({
      contato_id: contatoId,
      telefone: telefone,
      remetente: remetente,
      conteudo: content,
      tipo_midia: tipoMidia,
      is_from_me: fromMe,
      data_mensagem: timestamp.toISOString(),
      message_id: messageId,
      instance_name: instance,
      push_name: pushName || null,
      media_url: mediaUrl || null,
      lida: fromMe, // Mensagens enviadas já são lidas
    });
  
  if (msgError) {
    console.error(">>> ERRO salvando msg:", JSON.stringify(msgError));
    return { success: false, contactId: contatoId, error: "Falha ao salvar mensagem" };
  }
  
  console.log(`>>> Msg salva! Contato: ${contatoId}`);
  
  // Enfileirar para análise
  await supabase
    .from("analise_queue")
    .upsert({
      contato_id: contatoId,
      status: "pendente",
      prioridade: 1,
    }, { onConflict: "contato_id" });
  
  return { success: true, contactId: contatoId };
}

// ========== HANDLER PRINCIPAL ==========

serve(async (req) => {
  console.log("========================================");
  console.log(">>> WEBHOOK:", new Date().toISOString());
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    // Log do payload (limitado)
    console.log(">>> PAYLOAD:", JSON.stringify(body).slice(0, 1500));
    
    const rawEvent = body.event || body.type || "";
    const instance = body.instance || body.instanceName || "";
    const event = rawEvent.toUpperCase().replace(/\./g, "_").replace(/-/g, "_");
    
    console.log(">>> EVENTO:", event, "| INSTANCE:", instance);

    // =========================================================
    // LÓGICA UNIFICADA: DETECTAR MENSAGEM POR CONTEÚDO, NÃO POR EVENTO
    // =========================================================
    
    // Primeiro: Tentar extrair mensagem do payload
    // Isso funciona para MESSAGES_UPSERT, SEND_MESSAGE, e qualquer variação
    const extracted = tryExtractMessage(body);
    
    if (extracted) {
      console.log(">>> MENSAGEM DETECTADA no payload!");
      
      // Pode haver múltiplas mensagens em um array
      const data = body.data || body;
      const messages = data.messages || (Array.isArray(data) ? data : [data]);
      
      let processed = 0;
      
      for (const msgData of messages) {
        // Extrair cada mensagem individualmente
        const msgExtracted = extractFromMessageObject(msgData, body);
        
        if (msgExtracted) {
          const result = await processMessage(supabase, msgExtracted, instance);
          if (result.success) processed++;
        }
      }
      
      // Se só tinha uma mensagem, usar a extraída inicialmente
      if (processed === 0 && extracted) {
        const result = await processMessage(supabase, extracted, instance);
        if (result.success) processed = 1;
      }
      
      return new Response(JSON.stringify({ success: true, processed }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // ========== MESSAGES_UPDATE - Atualizar status de entrega ==========
    if (event === "MESSAGES_UPDATE" || event === "MESSAGE_UPDATE") {
      console.log(">>> Processando STATUS UPDATE");
      
      const data = body.data || body;
      const updates = Array.isArray(data) ? data : [data];
      
      for (const update of updates) {
        const messageId = update?.key?.id || update?.keyId;
        const status = update?.update?.status || update?.status;
        
        if (messageId && status) {
          const statusMap: Record<string, string> = {
            "0": "PENDING", "1": "SERVER_ACK", "2": "DELIVERY_ACK", "3": "READ", "4": "PLAYED",
          };
          
          await supabase
            .from("conversas_whatsapp")
            .update({ message_status: statusMap[String(status)] || String(status) })
            .eq("message_id", messageId);
        }
      }

      return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // ========== CONNECTION_UPDATE ==========
    if (event === "CONNECTION_UPDATE") {
      console.log(">>> Processando CONNECTION_UPDATE");
      
      const data = body.data || body;
      const state = data?.state || data?.status || body?.state;
      console.log(">>> State:", state);
      
      let newStatus = "desconectado";
      if (state === "open" || state === "connected") {
        newStatus = "conectado";
      } else if (state === "connecting" || state === "qrcode") {
        newStatus = "conectando";
      }
      
      await supabase
        .from("evolution_config")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("instance_name", instance);
      
      // Se conectou, disparar sync automático
      if (newStatus === "conectado") {
        console.log(">>> CONEXÃO ESTABELECIDA! Disparando import-history...");
        
        fetch(`${supabaseUrl}/functions/v1/import-history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ instanceName: instance, limit: 100 }),
        }).catch(e => console.error(">>> Erro import-history:", e));
      }

      return new Response(JSON.stringify({ success: true, status: newStatus }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // ========== QRCODE_UPDATED ==========
    if (event === "QRCODE_UPDATED" || event === "QR_CODE") {
      console.log(">>> Processando QRCODE_UPDATED");
      
      const data = body.data || body;
      const qrcode = data?.qrcode?.base64 || data?.qrcode || data?.base64;
      
      if (qrcode) {
        await supabase
          .from("evolution_config")
          .update({
            qrcode_base64: qrcode,
            status: "conectando",
            updated_at: new Date().toISOString(),
          })
          .eq("instance_name", instance);
      }

      return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // ========== CONTACTS_UPSERT - Atualizar foto/nome do contato ==========
    if (event === "CONTACTS_UPSERT" || event === "CONTACTS_UPDATE") {
      console.log(">>> Processando CONTACTS_UPSERT/UPDATE");
      
      const data = body.data || body;
      const contacts = Array.isArray(data) ? data : [data];
      
      for (const contact of contacts) {
        const remoteJid = contact?.remoteJid || contact?.id;
        if (!remoteJid || !isValidJid(remoteJid)) continue;
        
        const telefone = extractPhone(remoteJid);
        const profilePic = contact?.profilePicUrl || contact?.imgUrl;
        const pushName = contact?.pushName || contact?.name || contact?.notify;
        
        if (telefone && (profilePic || pushName)) {
          const updateData: Record<string, any> = {};
          
          if (profilePic) updateData.whatsapp_profile_picture = profilePic;
          if (pushName && !pushName.match(/^\d+$/)) {
            updateData.whatsapp_profile_name = pushName;
          }
          
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("contatos_inteligencia")
              .update(updateData)
              .eq("telefone", telefone);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // ========== EVENTO NÃO PROCESSADO ==========
    console.log(">>> Evento ignorado:", event);
    
    return new Response(JSON.stringify({ success: true, ignored: event }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(">>> ERRO CRÍTICO:", errorMessage);
    
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { 
      status: 200, // Retornar 200 para Evolution não retentar
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
