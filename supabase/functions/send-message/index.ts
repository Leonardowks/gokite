import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  phone: string;
  message: string;
  instance_name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, message, instance_name }: SendMessageRequest = await req.json();

    console.log("[send-message] >>> Recebido:", {
      phone,
      message: message?.substring(0, 80),
      instance_name,
    });

    if (!phone || !message?.trim()) {
      console.error("[send-message] >>> ERRO: phone e message são obrigatórios");
      return new Response(JSON.stringify({ error: "phone e message são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Buscar configuração conectada
    const { data: config, error: configError } = await supabase
      .from("evolution_config")
      .select("api_url, api_key, instance_name, status")
      .eq("status", "conectado")
      .maybeSingle();

    if (configError || !config) {
      console.error("[send-message] >>> ERRO: Config não encontrada ou desconectada:", configError);
      return new Response(
        JSON.stringify({ error: "WhatsApp não está conectado. Configure a Evolution API primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const instanceToUse = instance_name || config.instance_name;

    // 2) Normalizar telefone brasileiro
    // Remove tudo que não é dígito
    let digitsOnly = phone.replace(/\D/g, "");
    
    // Se o número tem 10-11 dígitos e NÃO começa com 55, adicionar prefixo do Brasil
    // Formato esperado: 55 + DDD (2 dígitos) + número (8-9 dígitos)
    if (digitsOnly.length >= 10 && digitsOnly.length <= 11 && !digitsOnly.startsWith("55")) {
      digitsOnly = "55" + digitsOnly;
      console.log("[send-message] >>> Adicionado prefixo 55:", digitsOnly);
    }
    
    // Se já tem 12-13 dígitos (com 55), está correto
    // Se ainda não está no formato correto, tentar enviar assim mesmo
    
    const phoneForDb = digitsOnly;
    const phoneForSend = phone.includes("@") ? phone : `${digitsOnly}@s.whatsapp.net`;

    console.log("[send-message] >>> Enviando para Evolution API:", {
      url: `${config.api_url}/message/sendText/${instanceToUse}`,
      number: phoneForSend,
      textLength: message.trim().length,
    });

    // 3) Envio
    const evolutionResponse = await fetch(`${config.api_url}/message/sendText/${instanceToUse}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.api_key,
      },
      body: JSON.stringify({
        number: phoneForSend,
        text: message.trim(),
        linkPreview: false,
      }),
    });

    let evolutionData: any = null;
    try {
      evolutionData = await evolutionResponse.json();
    } catch {
      evolutionData = null;
    }

    if (!evolutionResponse.ok) {
      console.error("[send-message] >>> ERRO da Evolution API:", evolutionResponse.status, evolutionData);
      return new Response(
        JSON.stringify({
          error: `Erro ao enviar mensagem: ${evolutionResponse.status}`,
          details: evolutionData,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(
      "[send-message] >>> Sucesso! Resposta Evolution:",
      JSON.stringify(evolutionData).slice(0, 300),
    );

    // 4) Salvamento direto (bypass do webhook)
    // Passo A: buscar ou criar contato
    let contatoId: string | null = null;

    const { data: existingContato, error: existingError } = await supabase
      .from("contatos_inteligencia")
      .select("id")
      .eq("telefone", phoneForDb)
      .maybeSingle();

    if (existingError) {
      console.error("[send-message] >>> Erro ao buscar contato:", existingError);
    }

    if (existingContato?.id) {
      contatoId = existingContato.id;
      console.log("[send-message] >>> Contato encontrado:", contatoId);
    } else {
      const { data: newContato, error: createError } = await supabase
        .from("contatos_inteligencia")
        .insert({
          telefone: phoneForDb,
          nome: `Contato ${phoneForDb.slice(-4)}`,
          remote_jid: phoneForSend,
          origem: "envio_plataforma",
          status: "nao_classificado",
          ultima_mensagem: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError) {
        console.error("[send-message] >>> Erro ao criar contato:", createError);
      } else {
        contatoId = newContato.id;
        console.log("[send-message] >>> Contato criado:", contatoId);
      }
    }

    // Passo B: inserir mensagem
    if (contatoId) {
      const messageId = evolutionData?.key?.id || evolutionData?.messageId || `local_${crypto.randomUUID()}`;

      const { error: msgError } = await supabase
        .from("conversas_whatsapp")
        .insert({
          contato_id: contatoId,
          telefone: phoneForDb,
          conteudo: message.trim(),
          is_from_me: true,
          remetente: "empresa", // precisa bater com o constraint do banco
          tipo_midia: "texto",
          data_mensagem: new Date().toISOString(),
          message_id: messageId,
          message_status: "sent",
          lida: true,
          push_name: evolutionData?.pushName || "GoKite",
        });

      if (msgError) {
        console.error("[send-message] >>> Erro ao salvar mensagem:", msgError);
      } else {
        console.log("[send-message] >>> Mensagem salva no banco com sucesso!", { contatoId, messageId });
      }

      // Atualizar ultima_mensagem do contato (para aparecer na lista de conversas)
      const { error: updateContatoError } = await supabase
        .from("contatos_inteligencia")
        .update({ ultima_mensagem: new Date().toISOString() })
        .eq("id", contatoId);

      if (updateContatoError) {
        console.error("[send-message] >>> Erro ao atualizar ultima_mensagem do contato:", updateContatoError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: evolutionData?.key?.id || null,
        status: evolutionData?.status || "sent",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[send-message] >>> ERRO GERAL:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
