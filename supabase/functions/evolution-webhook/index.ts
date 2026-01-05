import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvolutionMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
      contextInfo?: {
        quotedMessage?: any;
        stanzaId?: string;
      };
    };
    imageMessage?: {
      url?: string;
      mimetype?: string;
      caption?: string;
    };
    audioMessage?: {
      url?: string;
      mimetype?: string;
    };
    videoMessage?: {
      url?: string;
      mimetype?: string;
      caption?: string;
    };
    documentMessage?: {
      url?: string;
      mimetype?: string;
      fileName?: string;
    };
  };
  messageTimestamp?: number | string;
  status?: string;
}

interface EvolutionContact {
  id: string;
  pushName?: string;
  profilePictureUrl?: string;
  isBusiness?: boolean;
  businessName?: string;
}

interface WebhookPayload {
  event: string;
  instance: string;
  data: {
    key?: EvolutionMessage["key"];
    pushName?: string;
    message?: EvolutionMessage["message"];
    messageTimestamp?: number | string;
    status?: string;
    contact?: EvolutionContact;
    contacts?: EvolutionContact[];
  };
}

// Normaliza telefone para formato consistente
function normalizePhone(phone: string): string {
  return phone.replace(/[@s.a-z]/gi, "").replace(/\D/g, "");
}

// Extrai conteúdo da mensagem
function extractMessageContent(message: EvolutionMessage["message"]): { content: string; tipoMidia: string; mediaUrl?: string; mediaMimetype?: string } {
  if (!message) return { content: "", tipoMidia: "texto" };

  if (message.conversation) {
    return { content: message.conversation, tipoMidia: "texto" };
  }

  if (message.extendedTextMessage?.text) {
    return { content: message.extendedTextMessage.text, tipoMidia: "texto" };
  }

  if (message.imageMessage) {
    return {
      content: message.imageMessage.caption || "[Imagem]",
      tipoMidia: "imagem",
      mediaUrl: message.imageMessage.url,
      mediaMimetype: message.imageMessage.mimetype,
    };
  }

  if (message.audioMessage) {
    return {
      content: "[Áudio]",
      tipoMidia: "audio",
      mediaUrl: message.audioMessage.url,
      mediaMimetype: message.audioMessage.mimetype,
    };
  }

  if (message.videoMessage) {
    return {
      content: message.videoMessage.caption || "[Vídeo]",
      tipoMidia: "video",
      mediaUrl: message.videoMessage.url,
      mediaMimetype: message.videoMessage.mimetype,
    };
  }

  if (message.documentMessage) {
    return {
      content: message.documentMessage.fileName || "[Documento]",
      tipoMidia: "documento",
      mediaUrl: message.documentMessage.url,
      mediaMimetype: message.documentMessage.mimetype,
    };
  }

  return { content: "[Mensagem não suportada]", tipoMidia: "outro" };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    console.log(`[Evolution Webhook] Evento recebido: ${payload.event}`, JSON.stringify(payload).slice(0, 500));

    const { event, instance, data } = payload;

    // Processar diferentes tipos de eventos
    switch (event) {
      case "MESSAGES_UPSERT": {
        if (!data.key || !data.message) {
          console.log("[Evolution Webhook] Mensagem sem key ou message, ignorando");
          break;
        }

        const phone = normalizePhone(data.key.remoteJid);
        const messageId = data.key.id;
        const isFromMe = data.key.fromMe;
        const pushName = data.pushName;
        const timestamp = data.messageTimestamp 
          ? new Date(typeof data.messageTimestamp === 'string' 
              ? parseInt(data.messageTimestamp) * 1000 
              : data.messageTimestamp * 1000)
          : new Date();

        const { content, tipoMidia, mediaUrl, mediaMimetype } = extractMessageContent(data.message);

        if (!content) {
          console.log("[Evolution Webhook] Mensagem sem conteúdo, ignorando");
          break;
        }

        // Buscar ou criar contato
        let { data: contato } = await supabase
          .from("contatos_inteligencia")
          .select("id")
          .eq("telefone", phone)
          .maybeSingle();

        if (!contato) {
          // Criar novo contato
          const { data: novoContato, error: createError } = await supabase
            .from("contatos_inteligencia")
            .insert({
              telefone: phone,
              nome: pushName || `Contato ${phone.slice(-4)}`,
              whatsapp_profile_name: pushName,
              origem: "evolution",
              status: "nao_classificado",
            })
            .select("id")
            .single();

          if (createError) {
            console.error("[Evolution Webhook] Erro ao criar contato:", createError);
            break;
          }
          contato = novoContato;
          console.log(`[Evolution Webhook] Novo contato criado: ${contato.id}`);
        }

        // Verificar se mensagem já existe
        const { data: msgExistente } = await supabase
          .from("conversas_whatsapp")
          .select("id")
          .eq("message_id", messageId)
          .maybeSingle();

        if (msgExistente) {
          console.log(`[Evolution Webhook] Mensagem ${messageId} já existe, ignorando`);
          break;
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
          });

        if (insertError) {
          console.error("[Evolution Webhook] Erro ao inserir mensagem:", insertError);
          break;
        }

        // Atualizar última mensagem no contato
        await supabase
          .from("contatos_inteligencia")
          .update({
            ultima_mensagem: timestamp.toISOString(),
            whatsapp_profile_name: pushName || undefined,
          })
          .eq("id", contato.id);

        // Atualizar última sincronização na config
        await supabase
          .from("evolution_config")
          .update({
            ultima_sincronizacao: new Date().toISOString(),
          })
          .eq("instance_name", instance);

        console.log(`[Evolution Webhook] Mensagem ${messageId} salva com sucesso`);
        break;
      }

      case "CONTACTS_UPSERT": {
        const contacts = data.contacts || (data.contact ? [data.contact] : []);
        
        for (const contact of contacts) {
          if (!contact.id) continue;

          const phone = normalizePhone(contact.id);
          
          // Atualizar ou inserir contato
          const { data: existingContact } = await supabase
            .from("contatos_inteligencia")
            .select("id")
            .eq("telefone", phone)
            .maybeSingle();

          if (existingContact) {
            await supabase
              .from("contatos_inteligencia")
              .update({
                whatsapp_profile_name: contact.pushName,
                whatsapp_profile_picture: contact.profilePictureUrl,
                is_business: contact.isBusiness,
                business_name: contact.businessName,
                evolution_contact_id: contact.id,
              })
              .eq("id", existingContact.id);
          } else {
            await supabase
              .from("contatos_inteligencia")
              .insert({
                telefone: phone,
                nome: contact.pushName || `Contato ${phone.slice(-4)}`,
                whatsapp_profile_name: contact.pushName,
                whatsapp_profile_picture: contact.profilePictureUrl,
                is_business: contact.isBusiness,
                business_name: contact.businessName,
                evolution_contact_id: contact.id,
                origem: "evolution",
                status: "nao_classificado",
              });
          }
        }

        // Atualizar contagem de contatos sync
        await supabase
          .from("evolution_config")
          .update({
            ultima_sincronizacao: new Date().toISOString(),
          })
          .eq("instance_name", instance);

        console.log(`[Evolution Webhook] ${contacts.length} contatos processados`);
        break;
      }

      case "CONNECTION_UPDATE": {
        const state = (data as any).state;
        let status = "desconectado";
        
        if (state === "open") status = "conectado";
        else if (state === "connecting") status = "conectando";
        else if (state === "close") status = "desconectado";

        await supabase
          .from("evolution_config")
          .update({ status })
          .eq("instance_name", instance);

        console.log(`[Evolution Webhook] Status atualizado: ${status}`);
        break;
      }

      case "QRCODE_UPDATED": {
        const qrcode = (data as any).qrcode?.base64;
        
        if (qrcode) {
          await supabase
            .from("evolution_config")
            .update({ 
              qrcode_base64: qrcode,
              status: "qrcode",
            })
            .eq("instance_name", instance);

          console.log("[Evolution Webhook] QR Code atualizado");
        }
        break;
      }

      default:
        console.log(`[Evolution Webhook] Evento não tratado: ${event}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Evolution Webhook] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
