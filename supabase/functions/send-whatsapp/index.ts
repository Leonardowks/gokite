import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  contatoId: string;
  mensagem?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video' | 'document';
  fileName?: string;
  caption?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contatoId, mensagem, mediaUrl, mediaType, fileName, caption }: SendMessageRequest = await req.json();

    // Validação: precisa ter mensagem OU mídia
    if (!contatoId || (!mensagem?.trim() && !mediaUrl)) {
      return new Response(
        JSON.stringify({ error: "contatoId e (mensagem ou mediaUrl) são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Send WhatsApp] Enviando para contato ${contatoId}`, { hasText: !!mensagem, hasMedia: !!mediaUrl, mediaType });

    // Buscar dados do contato
    const { data: contato, error: contatoError } = await supabase
      .from("contatos_inteligencia")
      .select("telefone, remote_jid, nome")
      .eq("id", contatoId)
      .single();

    if (contatoError || !contato) {
      console.error("[Send WhatsApp] Contato não encontrado:", contatoError);
      return new Response(
        JSON.stringify({ error: "Contato não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar configuração da Evolution API
    const { data: config, error: configError } = await supabase
      .from("evolution_config")
      .select("api_url, api_key, instance_name, status")
      .eq("status", "conectado")
      .maybeSingle();

    if (configError || !config) {
      console.error("[Send WhatsApp] Config não encontrada ou desconectada:", configError);
      return new Response(
        JSON.stringify({ error: "WhatsApp não está conectado. Configure a Evolution API primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar número para envio
    const remoteJid = contato.remote_jid || `${contato.telefone.replace(/\D/g, "")}@s.whatsapp.net`;
    let evolutionResponse: Response;
    let messageContent: string;
    let tipoMidia = "texto";

    // Enviar mídia ou texto
    if (mediaUrl) {
      // Determinar endpoint baseado no tipo de mídia
      let endpoint: string;
      let bodyPayload: Record<string, any>;

      switch (mediaType) {
        case 'image':
          endpoint = 'sendMedia';
          bodyPayload = {
            number: remoteJid,
            mediatype: 'image',
            media: mediaUrl,
            caption: caption || '',
          };
          tipoMidia = 'imagem';
          messageContent = caption || '[Imagem]';
          break;
        case 'audio':
          endpoint = 'sendWhatsAppAudio';
          bodyPayload = {
            number: remoteJid,
            audio: mediaUrl,
          };
          tipoMidia = 'audio';
          messageContent = '[Áudio]';
          break;
        case 'video':
          endpoint = 'sendMedia';
          bodyPayload = {
            number: remoteJid,
            mediatype: 'video',
            media: mediaUrl,
            caption: caption || '',
          };
          tipoMidia = 'video';
          messageContent = caption || '[Vídeo]';
          break;
        case 'document':
        default:
          endpoint = 'sendMedia';
          bodyPayload = {
            number: remoteJid,
            mediatype: 'document',
            media: mediaUrl,
            fileName: fileName || 'documento',
          };
          tipoMidia = 'documento';
          messageContent = fileName || '[Documento]';
          break;
      }

      console.log(`[Send WhatsApp] Enviando mídia via ${endpoint}`, bodyPayload);

      evolutionResponse = await fetch(`${config.api_url}/message/${endpoint}/${config.instance_name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.api_key,
        },
        body: JSON.stringify(bodyPayload),
      });
    } else {
      // Enviar texto simples
      console.log(`[Send WhatsApp] Enviando texto para ${remoteJid}`);
      
      evolutionResponse = await fetch(`${config.api_url}/message/sendText/${config.instance_name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.api_key,
        },
        body: JSON.stringify({
          number: remoteJid,
          text: mensagem!.trim(),
        }),
      });
      messageContent = mensagem!.trim();
    }

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error("[Send WhatsApp] Erro da Evolution API:", evolutionResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Erro ao enviar mensagem: ${evolutionResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const evolutionData = await evolutionResponse.json();
    console.log("[Send WhatsApp] Resposta Evolution:", JSON.stringify(evolutionData).slice(0, 300));

    // Extrair messageId da resposta
    const messageId = evolutionData.key?.id || `local_${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Salvar mensagem no banco de dados
    const { error: insertError } = await supabase
      .from("conversas_whatsapp")
      .insert({
        contato_id: contatoId,
        telefone: contato.telefone,
        message_id: messageId,
        instance_name: config.instance_name,
        is_from_me: true,
        data_mensagem: timestamp,
        remetente: "empresa",
        conteudo: messageContent,
        tipo_midia: tipoMidia,
        media_url: mediaUrl || null,
        lida: true,
        message_status: "SERVER_ACK",
      });

    if (insertError) {
      console.error("[Send WhatsApp] Erro ao salvar mensagem:", insertError);
    }

    // Atualizar última mensagem do contato
    await supabase
      .from("contatos_inteligencia")
      .update({ ultima_mensagem: timestamp })
      .eq("id", contatoId);

    console.log(`[Send WhatsApp] Mensagem enviada com sucesso: ${messageId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId,
        timestamp,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Send WhatsApp] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
