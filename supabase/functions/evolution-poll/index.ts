import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normaliza telefone para formato consistente
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

      const messages = await response.json();
      console.log(`[Evolution Poll] ${messages.length || 0} mensagens encontradas`);

      // Processar mensagens
      for (const msg of (messages || [])) {
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
      // Poll geral - buscar chats recentes
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
        const chats = await response.json();
        console.log(`[Evolution Poll] ${chats.length || 0} chats encontrados`);
        
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
