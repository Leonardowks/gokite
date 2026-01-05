import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  contatoId: string;
  mensagem: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contatoId, mensagem }: SendMessageRequest = await req.json();

    if (!contatoId || !mensagem?.trim()) {
      return new Response(
        JSON.stringify({ error: "contatoId e mensagem são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Send WhatsApp] Enviando mensagem para contato ${contatoId}`);

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

    console.log(`[Send WhatsApp] Enviando para ${remoteJid} via instância ${config.instance_name}`);

    // Enviar mensagem via Evolution API
    const evolutionUrl = `${config.api_url}/message/sendText/${config.instance_name}`;
    
    const evolutionResponse = await fetch(evolutionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": config.api_key,
      },
      body: JSON.stringify({
        number: remoteJid,
        text: mensagem.trim(),
      }),
    });

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
        conteudo: mensagem.trim(),
        tipo_midia: "texto",
        lida: true,
        message_status: "SERVER_ACK",
      });

    if (insertError) {
      console.error("[Send WhatsApp] Erro ao salvar mensagem:", insertError);
      // Não retorna erro, pois a mensagem foi enviada com sucesso
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
