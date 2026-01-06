import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== UTILITÁRIOS ==========

function isValidWhatsAppJid(jid: string | null | undefined): boolean {
  if (!jid || typeof jid !== 'string') return false;
  const isIndividual = jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
  if (!isIndividual) return false;
  if (jid.includes("@g.us") || jid.includes("@broadcast")) return false;
  return true;
}

function extractPhone(jid: string | null | undefined): string {
  if (!jid || typeof jid !== 'string') return "";
  const phone = jid.replace(/\D/g, "");
  return phone.length >= 8 ? phone : "";
}

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

function looksLikePhone(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') return true;
  const digits = str.replace(/\D/g, '');
  return digits.length >= 8 && digits.length / str.length > 0.7;
}

function extractMessageContent(message: any): { 
  content: string; 
  tipoMidia: string; 
  mediaUrl?: string; 
  mediaMimetype?: string 
} {
  if (!message || typeof message !== 'object') {
    return { content: "📩 Nova mensagem", tipoMidia: "texto" };
  }

  // Texto simples
  if (message.conversation && typeof message.conversation === 'string') {
    return { content: message.conversation, tipoMidia: "texto" };
  }

  // Texto estendido
  if (message.extendedTextMessage?.text) {
    return { content: message.extendedTextMessage.text, tipoMidia: "texto" };
  }

  // Imagem
  if (message.imageMessage) {
    const caption = message.imageMessage.caption;
    return {
      content: caption && caption.trim() ? caption : "📷 Imagem",
      tipoMidia: "imagem",
      mediaUrl: message.imageMessage.url,
      mediaMimetype: message.imageMessage.mimetype,
    };
  }

  // Áudio
  if (message.audioMessage) {
    const seconds = message.audioMessage.seconds || 0;
    return {
      content: `🎤 Áudio (${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')})`,
      tipoMidia: "audio",
      mediaUrl: message.audioMessage.url,
      mediaMimetype: message.audioMessage.mimetype,
    };
  }

  // Vídeo
  if (message.videoMessage) {
    const caption = message.videoMessage.caption;
    return {
      content: caption && caption.trim() ? caption : "🎬 Vídeo",
      tipoMidia: "video",
      mediaUrl: message.videoMessage.url,
      mediaMimetype: message.videoMessage.mimetype,
    };
  }

  // Documento
  if (message.documentMessage) {
    return {
      content: `📄 ${message.documentMessage.fileName || "Documento"}`,
      tipoMidia: "documento",
      mediaUrl: message.documentMessage.url,
      mediaMimetype: message.documentMessage.mimetype,
    };
  }

  // Sticker
  if (message.stickerMessage) {
    return { content: "🎭 Sticker", tipoMidia: "sticker" };
  }

  // Localização
  if (message.locationMessage) {
    return { content: "📍 Localização", tipoMidia: "localizacao" };
  }

  // Contato
  if (message.contactMessage) {
    return { content: `👤 ${message.contactMessage.displayName || "Contato"}`, tipoMidia: "contato" };
  }

  // Fallback
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

// ========== HANDLER PRINCIPAL ==========

serve(async (req) => {
  console.log(`[Import History] 🔔 Request at ${new Date().toISOString()}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ler parâmetros
    const body = await req.json().catch(() => ({}));
    const { phone, contato_id, limit = 100 } = body;
    
    console.log(`[Import History] 📥 Params: phone=${phone}, contato_id=${contato_id}, limit=${limit}`);

    // Buscar config Evolution
    const { data: config, error: configError } = await supabase
      .from("evolution_config")
      .select("*")
      .single();

    if (configError || !config) {
      console.error("[Import History] ❌ Config não encontrada:", configError);
      return new Response(
        JSON.stringify({ error: "Configuração Evolution não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (config.status !== "conectado") {
      return new Response(
        JSON.stringify({ error: "WhatsApp não está conectado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar contatos para importar
    let contatosParaImportar: { id: string; telefone: string; remote_jid?: string }[] = [];

    if (contato_id) {
      // Buscar contato específico
      const { data: contato } = await supabase
        .from("contatos_inteligencia")
        .select("id, telefone, remote_jid")
        .eq("id", contato_id)
        .single();
      
      if (contato) {
        contatosParaImportar = [contato];
      }
    } else if (phone) {
      // Buscar por telefone
      const phoneClean = phone.replace(/\D/g, "");
      const { data: contato } = await supabase
        .from("contatos_inteligencia")
        .select("id, telefone, remote_jid")
        .eq("telefone", phoneClean)
        .single();
      
      if (contato) {
        contatosParaImportar = [contato];
      } else {
        // Criar contato se não existir
        const remoteJid = `${phoneClean}@s.whatsapp.net`;
        const { data: novoContato, error: insertError } = await supabase
          .from("contatos_inteligencia")
          .insert({
            telefone: phoneClean,
            nome: formatPhoneDisplay(phoneClean),
            remote_jid: remoteJid,
            origem: "evolution",
            status: "nao_classificado",
          })
          .select("id, telefone, remote_jid")
          .single();
        
        if (novoContato) {
          contatosParaImportar = [novoContato];
        } else {
          console.error("[Import History] ❌ Erro ao criar contato:", insertError);
        }
      }
    } else {
      // Buscar todos os contatos com remote_jid
      const { data: contatos } = await supabase
        .from("contatos_inteligencia")
        .select("id, telefone, remote_jid")
        .not("remote_jid", "is", null)
        .order("ultima_mensagem", { ascending: false, nullsFirst: false })
        .limit(50);
      
      contatosParaImportar = contatos || [];
    }

    if (contatosParaImportar.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum contato encontrado para importar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Import History] 📋 Importando histórico de ${contatosParaImportar.length} contato(s)`);

    const apiUrl = config.api_url.replace(/\/$/, "");
    const instanceName = config.instance_name;
    let totalImportadas = 0;
    let totalDuplicadas = 0;
    let totalErros = 0;

    for (const contato of contatosParaImportar) {
      try {
        const remoteJid = contato.remote_jid || `${contato.telefone}@s.whatsapp.net`;
        
        console.log(`[Import History] 🔍 Buscando mensagens para ${remoteJid}`);

        // Chamar API Evolution para buscar mensagens
        const findMessagesUrl = `${apiUrl}/chat/findMessages/${instanceName}`;
        
        const findResponse = await fetch(findMessagesUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": config.api_key,
          },
          body: JSON.stringify({
            where: {
              key: {
                remoteJid: remoteJid,
              },
            },
            limit: limit,
          }),
        });

        if (!findResponse.ok) {
          console.error(`[Import History] ❌ Erro API Evolution: ${findResponse.status}`);
          totalErros++;
          continue;
        }

        const messagesData = await findResponse.json();
        const messages = Array.isArray(messagesData) ? messagesData : (messagesData.messages || []);
        
        console.log(`[Import History] 📨 Encontradas ${messages.length} mensagens para ${contato.telefone}`);

        for (const msgData of messages) {
          try {
            // Extrair dados da mensagem
            const messageId = msgData?.key?.id || `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const isFromMe = msgData?.key?.fromMe === true;
            const pushName = msgData?.pushName || formatPhoneDisplay(contato.telefone);
            const messageObj = msgData?.message || {};
            const { content, tipoMidia, mediaUrl, mediaMimetype } = extractMessageContent(messageObj);
            const timestamp = extractTimestamp(msgData);

            // UPSERT para evitar duplicatas e atualizar se já existir
            const { error: upsertError, data: upsertResult } = await supabase
              .from("conversas_whatsapp")
              .upsert(
                {
                  contato_id: contato.id,
                  telefone: contato.telefone,
                  message_id: messageId,
                  instance_name: instanceName,
                  is_from_me: isFromMe,
                  push_name: pushName,
                  data_mensagem: timestamp.toISOString(),
                  remetente: isFromMe ? "empresa" : "cliente",
                  conteudo: content,
                  tipo_midia: tipoMidia,
                  media_url: mediaUrl,
                  media_mimetype: mediaMimetype,
                  lida: true,
                },
                { 
                  onConflict: "message_id",
                  ignoreDuplicates: true 
                }
              )
              .select("id");

            if (upsertError) {
              if (upsertError.code === "23505") {
                // Duplicata - não é erro
                totalDuplicadas++;
              } else {
                console.error(`[Import History] ⚠️ Erro ao upsert msg:`, upsertError.message);
                totalErros++;
              }
            } else if (upsertResult && upsertResult.length > 0) {
              totalImportadas++;
            } else {
              totalDuplicadas++;
            }
          } catch (msgError) {
            console.error(`[Import History] ❌ Erro processando msg:`, msgError);
            totalErros++;
          }
        }

        // Atualizar ultima_mensagem do contato
        if (messages.length > 0) {
          const latestMsg = messages.reduce((latest: any, msg: any) => {
            const latestTs = extractTimestamp(latest);
            const msgTs = extractTimestamp(msg);
            return msgTs > latestTs ? msg : latest;
          }, messages[0]);

          const latestTimestamp = extractTimestamp(latestMsg);
          
          await supabase
            .from("contatos_inteligencia")
            .update({ ultima_mensagem: latestTimestamp.toISOString() })
            .eq("id", contato.id);
        }

      } catch (contatoError) {
        console.error(`[Import History] ❌ Erro no contato ${contato.telefone}:`, contatoError);
        totalErros++;
      }
    }

    const resultado = {
      success: true,
      contatos_processados: contatosParaImportar.length,
      mensagens_importadas: totalImportadas,
      mensagens_duplicadas: totalDuplicadas,
      erros: totalErros,
    };

    console.log(`[Import History] ✅ Resultado:`, resultado);

    return new Response(
      JSON.stringify(resultado),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    console.error("[Import History] ❌ Erro geral:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
