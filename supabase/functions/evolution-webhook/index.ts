import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== UTILITÁRIOS SIMPLES ==========

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

// ========== HANDLER PRINCIPAL ==========

serve(async (req) => {
  console.log("========================================");
  console.log(">>> 1. WEBHOOK ACIONADO:", new Date().toISOString());
  console.log(">>> METHOD:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    // ========== PASSO 1: SANITIZAÇÃO DO PAYLOAD ==========
    console.log(">>> 2. PAYLOAD BRUTO:", JSON.stringify(body).slice(0, 2000));
    
    const rawEvent = body.event || body.type || "";
    const instance = body.instance || body.instanceName || "";
    
    // Detectar se payload está em body.data ou body.data.data (Evolution v2)
    let data = body.data || body;
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      console.log(">>> DETECTADO Evolution v2 (data.data)");
      data = data.data;
    }
    
    const event = rawEvent.toUpperCase().replace(/\./g, "_").replace(/-/g, "_");
    console.log(">>> 3. EVENTO NORMALIZADO:", event, "| INSTANCE:", instance);

    // ========== PROCESSAR EVENTOS DE MENSAGEM ==========
    if (event === "MESSAGES_UPSERT" || event === "MESSAGE_UPSERT" || event === "SEND_MESSAGE") {
      console.log(">>> 4. PROCESSANDO EVENTO DE MENSAGEM:", event);
      
      // Construir array de mensagens
      let messages: any[] = [];
      if (Array.isArray(data.messages)) {
        messages = data.messages;
      } else if (Array.isArray(data)) {
        messages = data;
      } else if (data.key || data.message) {
        messages = [data];
      } else if (body.data?.key || body.data?.message) {
        messages = [body.data];
      }
      
      console.log(">>> 5. TOTAL DE MENSAGENS:", messages.length);
      
      if (messages.length === 0) {
        console.log(">>> NENHUMA MENSAGEM ENCONTRADA. Estrutura:", JSON.stringify(data).slice(0, 500));
        return new Response(JSON.stringify({ success: true, noMessages: true }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      for (let i = 0; i < messages.length; i++) {
        const msgData = messages[i];
        console.log(`>>> 6. PROCESSANDO MENSAGEM ${i + 1}/${messages.length}`);
        
        try {
          // ========== EXTRAIR remoteJid ==========
          const remoteJid = 
            msgData?.key?.remoteJid ||
            data?.key?.remoteJid ||
            body?.data?.key?.remoteJid ||
            body?.key?.remoteJid ||
            null;
          
          console.log(">>> 7. remoteJid EXTRAÍDO:", remoteJid);
          
          if (!remoteJid || !isValidJid(remoteJid)) {
            console.log(">>> PULANDO: JID inválido ou grupo");
            continue;
          }

          // ========== EXTRAIR fromMe ==========
          const fromMe = 
            msgData?.key?.fromMe === true ||
            data?.key?.fromMe === true ||
            body?.data?.key?.fromMe === true ||
            body?.key?.fromMe === true ||
            false;
          
          console.log(">>> 8. fromMe:", fromMe);

          // ========== DETERMINAR TELEFONE ==========
          // Se fromMe=true, o remoteJid é o DESTINATÁRIO (número do cliente)
          // Se fromMe=false, o remoteJid é o REMETENTE (número do cliente)
          // Em ambos os casos, o telefone do contato é o remoteJid
          const telefone = extractPhone(remoteJid);
          
          if (!telefone || telefone.length < 8) {
            console.log(">>> PULANDO: Telefone inválido:", telefone);
            continue;
          }
          
          console.log(">>> 9. TELEFONE LIMPO:", telefone);

          // ========== EXTRAIR pushName ==========
          const pushName = 
            msgData?.pushName ||
            data?.pushName ||
            body?.data?.pushName ||
            body?.pushName ||
            null;
          
          const nomeContato = pushName && pushName.trim().length > 1 ? pushName.trim() : `Contato ${telefone.slice(-4)}`;
          console.log(">>> 10. NOME DO CONTATO:", nomeContato);

          // ========== EXTRAIR messageId ==========
          const messageId = 
            msgData?.key?.id ||
            data?.key?.id ||
            body?.data?.key?.id ||
            `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          
          console.log(">>> 11. MESSAGE_ID:", messageId);

          // ========== EXTRAIR CONTEÚDO ==========
          const messageObj = msgData?.message || data?.message || body?.data?.message || {};
          const { content, tipoMidia, mediaUrl } = extractContent(messageObj);
          console.log(">>> 12. CONTEÚDO:", content.slice(0, 100), "| TIPO:", tipoMidia);

          // ========== EXTRAIR TIMESTAMP ==========
          let timestamp = new Date();
          const ts = msgData?.messageTimestamp || data?.messageTimestamp;
          if (ts) {
            const tsNum = typeof ts === 'object' ? ts.low : (typeof ts === 'string' ? parseInt(ts, 10) : ts);
            if (tsNum > 1577836800 && tsNum < 2000000000) {
              timestamp = new Date(tsNum * 1000);
            }
          }
          console.log(">>> 13. TIMESTAMP:", timestamp.toISOString());

          // ==========================================
          // PASSO 2: UPSERT DO CONTATO (OBRIGATÓRIO)
          // ==========================================
          console.log(">>> 14. INICIANDO UPSERT DO CONTATO...");
          
          // Primeiro, tentar buscar o contato existente
          const { data: contatoExistente, error: selectError } = await supabase
            .from("contatos_inteligencia")
            .select("id, nome, whatsapp_profile_name")
            .eq("telefone", telefone)
            .maybeSingle();
          
          if (selectError) {
            console.error(">>> ERRO SELECT CONTATO:", JSON.stringify(selectError));
          }
          
          let contatoId: string;
          
          if (contatoExistente) {
            // Contato existe - atualizar
            contatoId = contatoExistente.id;
            console.log(">>> 15. CONTATO EXISTENTE ENCONTRADO:", contatoId);
            
            const updateData: Record<string, any> = {
              ultima_mensagem: timestamp.toISOString(),
              remote_jid: remoteJid,
            };
            
            // Atualizar nome se pushName for válido e diferente
            if (pushName && pushName.trim().length > 1 && !pushName.match(/^\d+$/)) {
              if (!contatoExistente.whatsapp_profile_name || contatoExistente.whatsapp_profile_name.startsWith("Contato ")) {
                updateData.nome = pushName.trim();
                updateData.whatsapp_profile_name = pushName.trim();
              }
            }
            
            const { error: updateError } = await supabase
              .from("contatos_inteligencia")
              .update(updateData)
              .eq("id", contatoId);
            
            if (updateError) {
              console.error(">>> ERRO UPDATE CONTATO:", JSON.stringify(updateError));
            } else {
              console.log(">>> 16. CONTATO ATUALIZADO COM SUCESSO");
            }
          } else {
            // Contato não existe - criar
            console.log(">>> 15. CONTATO NÃO EXISTE. CRIANDO...");
            
            const { data: novoContato, error: insertError } = await supabase
              .from("contatos_inteligencia")
              .insert({
                telefone: telefone,
                nome: nomeContato,
                whatsapp_profile_name: pushName && !pushName.match(/^\d+$/) ? pushName.trim() : null,
                remote_jid: remoteJid,
                origem: "evolution",
                status: "nao_classificado",
                prioridade: "media",
                ultima_mensagem: timestamp.toISOString(),
              })
              .select("id")
              .single();
            
            if (insertError) {
              console.error(">>> ERRO INSERT CONTATO:", JSON.stringify(insertError));
              console.log(">>> ABORTANDO MENSAGEM - SEM CONTATO_ID");
              continue;
            }
            
            contatoId = novoContato.id;
            console.log(">>> 16. CONTATO CRIADO COM SUCESSO:", contatoId);
          }

          // ==========================================
          // PASSO 3: SALVAR MENSAGEM
          // ==========================================
          console.log(">>> 17. VERIFICANDO DUPLICATA...");
          
          // Verificar se mensagem já existe
          const { data: msgExistente } = await supabase
            .from("conversas_whatsapp")
            .select("id")
            .eq("message_id", messageId)
            .maybeSingle();
          
          if (msgExistente) {
            console.log(">>> MENSAGEM DUPLICADA. PULANDO:", messageId);
            continue;
          }
          
          console.log(">>> 18. INSERINDO MENSAGEM...");
          
          const messageData = {
            contato_id: contatoId,
            telefone: telefone,
            remetente: fromMe ? "suporte" : "cliente",
            conteudo: content,
            tipo_midia: tipoMidia,
            is_from_me: fromMe,
            data_mensagem: timestamp.toISOString(),
            message_id: messageId,
            instance_name: instance,
            push_name: pushName || null,
            media_url: mediaUrl || null,
            lida: fromMe,
          };
          
          console.log(">>> 19. DADOS DA MENSAGEM:", JSON.stringify(messageData));
          
          const { error: msgError } = await supabase
            .from("conversas_whatsapp")
            .insert(messageData);
          
          if (msgError) {
            console.error(">>> ERRO INSERT MENSAGEM:", JSON.stringify(msgError));
          } else {
            console.log(">>> 20. MENSAGEM SALVA COM SUCESSO!");
          }

          // Enfileirar para análise de IA
          await supabase
            .from("analise_queue")
            .upsert({
              contato_id: contatoId,
              status: "pendente",
              prioridade: 1,
            }, { onConflict: "contato_id" });
          
          console.log(">>> 21. CONTATO ENFILEIRADO PARA ANÁLISE");
          
        } catch (msgError) {
          console.error(">>> ERRO PROCESSANDO MENSAGEM:", msgError);
        }
      }

      return new Response(JSON.stringify({ success: true, processed: messages.length }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // ========== MESSAGES_UPDATE - Atualizar status ==========
    if (event === "MESSAGES_UPDATE" || event === "MESSAGE_UPDATE") {
      console.log(">>> PROCESSANDO MESSAGES_UPDATE");
      
      const updates = Array.isArray(data) ? data : [data];
      
      for (const update of updates) {
        const messageId = update?.key?.id;
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
      console.log(">>> PROCESSANDO CONNECTION_UPDATE");
      
      const state = data?.state || data?.status || body?.state;
      console.log(">>> CONNECTION STATE:", state);
      
      let newStatus = "desconectado";
      if (state === "open" || state === "connected") {
        newStatus = "conectado";
      } else if (state === "connecting" || state === "qrcode") {
        newStatus = "conectando";
      }
      
      // Atualizar status na tabela
      const { error: updateError } = await supabase
        .from("evolution_config")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("instance_name", instance);
      
      if (updateError) {
        console.error(">>> ERRO UPDATE CONFIG:", updateError);
      }
      
      // Se conectou, disparar sync automático
      if (newStatus === "conectado") {
        console.log(">>> CONEXÃO ESTABELECIDA! Disparando import-history...");
        
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          
          fetch(`${supabaseUrl}/functions/v1/import-history`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ 
              instanceName: instance,
              limit: 100,
            }),
          }).catch(e => console.error(">>> Erro chamando import-history:", e));
          
        } catch (e) {
          console.error(">>> Erro disparando sync:", e);
        }
      }

      return new Response(JSON.stringify({ success: true, status: newStatus }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // ========== QRCODE_UPDATED ==========
    if (event === "QRCODE_UPDATED" || event === "QR_CODE") {
      console.log(">>> PROCESSANDO QRCODE_UPDATED");
      
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

    // ========== OUTROS EVENTOS ==========
    console.log(">>> EVENTO NÃO TRATADO:", event);
    
    return new Response(JSON.stringify({ success: true, event: event }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("========================================");
    console.error(">>> ERRO CRÍTICO NO WEBHOOK:", errorMessage);
    console.error(">>> STACK:", errorStack);
    console.error("========================================");
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), { 
      status: 200, // Retornar 200 para Evolution não retentar
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
