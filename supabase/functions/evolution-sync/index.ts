import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  action: "contacts" | "messages" | "full";
  instanceName?: string;
  phoneNumber?: string; // Para sync de mensagens de um contato específico
}

// Normaliza telefone
function normalizePhone(phone: string): string {
  return phone.replace(/[@s.a-z]/gi, "").replace(/\D/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SyncRequest = await req.json();
    const { action, instanceName, phoneNumber } = body;

    console.log(`[Evolution Sync] Action: ${action}, Instance: ${instanceName}`);

    // Buscar config
    let config: any = null;
    if (instanceName) {
      const { data } = await supabase
        .from("evolution_config")
        .select("*")
        .eq("instance_name", instanceName)
        .maybeSingle();
      config = data;
    } else {
      const { data } = await supabase
        .from("evolution_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      config = data;
    }

    if (!config) {
      return new Response(
        JSON.stringify({ error: "Configuração da Evolution não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      contacts: { total: 0, created: 0, updated: 0 },
      messages: { total: 0, created: 0, skipped: 0 },
    };

    // Sync de Contatos
    if (action === "contacts" || action === "full") {
      console.log("[Evolution Sync] Sincronizando contatos...");

      const contactsResponse = await fetch(`${config.api_url}/chat/findContacts/${config.instance_name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.api_key,
        },
        body: JSON.stringify({}),
      });

      if (!contactsResponse.ok) {
        console.error("[Evolution Sync] Erro ao buscar contatos:", await contactsResponse.text());
      } else {
        const contacts = await contactsResponse.json();
        console.log(`[Evolution Sync] ${contacts.length} contatos encontrados`);

        for (const contact of contacts) {
          if (!contact.id) continue;

          const phone = normalizePhone(contact.id);
          if (!phone || phone.length < 8) continue;

          results.contacts.total++;

          const { data: existing } = await supabase
            .from("contatos_inteligencia")
            .select("id")
            .eq("telefone", phone)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("contatos_inteligencia")
              .update({
                whatsapp_profile_name: contact.pushName,
                whatsapp_profile_picture: contact.profilePictureUrl,
                evolution_contact_id: contact.id,
              })
              .eq("id", existing.id);
            results.contacts.updated++;
          } else {
            await supabase
              .from("contatos_inteligencia")
              .insert({
                telefone: phone,
                nome: contact.pushName || `Contato ${phone.slice(-4)}`,
                whatsapp_profile_name: contact.pushName,
                whatsapp_profile_picture: contact.profilePictureUrl,
                evolution_contact_id: contact.id,
                origem: "evolution",
                status: "nao_classificado",
              });
            results.contacts.created++;
          }
        }
      }
    }

    // Sync de Mensagens
    if (action === "messages" || action === "full") {
      console.log("[Evolution Sync] Sincronizando mensagens...");

      // Se phoneNumber específico, busca só desse contato
      const phones = phoneNumber 
        ? [phoneNumber] 
        : await getContactPhones(supabase);

      for (const phone of phones) {
        try {
          const jid = `${phone}@s.whatsapp.net`;
          
          const messagesResponse = await fetch(`${config.api_url}/chat/findMessages/${config.instance_name}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": config.api_key,
            },
            body: JSON.stringify({
              where: { key: { remoteJid: jid } },
              limit: 500,
            }),
          });

          if (!messagesResponse.ok) {
            console.error(`[Evolution Sync] Erro ao buscar mensagens de ${phone}`);
            continue;
          }

          const messagesData = await messagesResponse.json();
          const messages = messagesData.messages || messagesData || [];
          
          if (!Array.isArray(messages)) continue;

          // Buscar contato
          const { data: contato } = await supabase
            .from("contatos_inteligencia")
            .select("id")
            .eq("telefone", phone)
            .maybeSingle();

          if (!contato) continue;

          for (const msg of messages) {
            if (!msg.key?.id || !msg.message) continue;

            results.messages.total++;

            // Verificar se já existe
            const { data: existing } = await supabase
              .from("conversas_whatsapp")
              .select("id")
              .eq("message_id", msg.key.id)
              .maybeSingle();

            if (existing) {
              results.messages.skipped++;
              continue;
            }

            // Extrair conteúdo
            let content = "";
            let tipoMidia = "texto";

            if (msg.message.conversation) {
              content = msg.message.conversation;
            } else if (msg.message.extendedTextMessage?.text) {
              content = msg.message.extendedTextMessage.text;
            } else if (msg.message.imageMessage) {
              content = msg.message.imageMessage.caption || "[Imagem]";
              tipoMidia = "imagem";
            } else if (msg.message.audioMessage) {
              content = "[Áudio]";
              tipoMidia = "audio";
            } else if (msg.message.videoMessage) {
              content = msg.message.videoMessage.caption || "[Vídeo]";
              tipoMidia = "video";
            } else if (msg.message.documentMessage) {
              content = msg.message.documentMessage.fileName || "[Documento]";
              tipoMidia = "documento";
            }

            if (!content) continue;

            const timestamp = msg.messageTimestamp 
              ? new Date(typeof msg.messageTimestamp === 'string' 
                  ? parseInt(msg.messageTimestamp) * 1000 
                  : msg.messageTimestamp * 1000)
              : new Date();

            await supabase
              .from("conversas_whatsapp")
              .insert({
                contato_id: contato.id,
                telefone: phone,
                message_id: msg.key.id,
                instance_name: config.instance_name,
                is_from_me: msg.key.fromMe,
                push_name: msg.pushName,
                data_mensagem: timestamp.toISOString(),
                remetente: msg.key.fromMe ? "empresa" : "cliente",
                conteudo: content,
                tipo_midia: tipoMidia,
              });

            results.messages.created++;
          }

          // Atualizar contagem no contato
          const { count } = await supabase
            .from("conversas_whatsapp")
            .select("*", { count: "exact", head: true })
            .eq("contato_id", contato.id);

          await supabase
            .from("contatos_inteligencia")
            .update({
              conversas_analisadas: count || 0,
            })
            .eq("id", contato.id);

        } catch (err) {
          console.error(`[Evolution Sync] Erro ao processar ${phone}:`, err);
        }
      }
    }

    // Atualizar estatísticas na config
    const { count: totalMensagens } = await supabase
      .from("conversas_whatsapp")
      .select("*", { count: "exact", head: true });

    const { count: totalContatos } = await supabase
      .from("contatos_inteligencia")
      .select("*", { count: "exact", head: true })
      .not("evolution_contact_id", "is", null);

    await supabase
      .from("evolution_config")
      .update({
        ultima_sincronizacao: new Date().toISOString(),
        total_mensagens_sync: totalMensagens || 0,
        total_contatos_sync: totalContatos || 0,
      })
      .eq("instance_name", config.instance_name);

    console.log("[Evolution Sync] Resultado:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Evolution Sync] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Busca telefones de contatos para sync
async function getContactPhones(supabase: any): Promise<string[]> {
  const { data } = await supabase
    .from("contatos_inteligencia")
    .select("telefone")
    .not("telefone", "is", null)
    .limit(100); // Limitar para não sobrecarregar

  return (data || []).map((c: any) => c.telefone).filter(Boolean);
}
