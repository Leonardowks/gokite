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

    console.log("[send-message] >>> Recebido:", { phone, message: message?.substring(0, 50), instance_name });

    // Validação
    if (!phone || !message?.trim()) {
      console.error("[send-message] >>> ERRO: phone e message são obrigatórios");
      return new Response(
        JSON.stringify({ error: "phone e message são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar configuração da Evolution API
    const { data: config, error: configError } = await supabase
      .from("evolution_config")
      .select("api_url, api_key, instance_name, status")
      .eq("status", "conectado")
      .maybeSingle();

    if (configError || !config) {
      console.error("[send-message] >>> ERRO: Config não encontrada ou desconectada:", configError);
      return new Response(
        JSON.stringify({ error: "WhatsApp não está conectado. Configure a Evolution API primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usar instance_name do parâmetro ou da config
    const instanceToUse = instance_name || config.instance_name;

    // Formatar número para envio (garantir que esteja no formato correto)
    let formattedPhone = phone.replace(/\D/g, "");
    const phoneForDb = formattedPhone; // Guardar versão limpa para o banco
    if (!formattedPhone.includes("@")) {
      formattedPhone = `${formattedPhone}@s.whatsapp.net`;
    }

    console.log("[send-message] >>> Enviando para Evolution API:", {
      url: `${config.api_url}/message/sendText/${instanceToUse}`,
      number: formattedPhone,
      textLength: message.length,
    });

    // Fazer POST para Evolution API
    const evolutionResponse = await fetch(`${config.api_url}/message/sendText/${instanceToUse}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": config.api_key,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message.trim(),
      }),
    });

    const evolutionData = await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      console.error("[send-message] >>> ERRO da Evolution API:", evolutionResponse.status, evolutionData);
      return new Response(
        JSON.stringify({ 
          error: `Erro ao enviar mensagem: ${evolutionResponse.status}`,
          details: evolutionData 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-message] >>> Sucesso! Resposta Evolution:", JSON.stringify(evolutionData).slice(0, 200));

    // ========== SALVAR MENSAGEM NO BANCO (BYPASS WEBHOOK) ==========
    
    // 1. Buscar ou criar contato
    let contatoId: string | null = null;
    
    const { data: existingContato } = await supabase
      .from("contatos_inteligencia")
      .select("id")
      .eq("telefone", phoneForDb)
      .maybeSingle();

    if (existingContato) {
      contatoId = existingContato.id;
      console.log("[send-message] >>> Contato encontrado:", contatoId);
    } else {
      // Criar novo contato
      const { data: newContato, error: createError } = await supabase
        .from("contatos_inteligencia")
        .insert({
          telefone: phoneForDb,
          nome: `Contato ${phoneForDb.slice(-4)}`,
          remote_jid: formattedPhone,
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

    // 2. Salvar mensagem na tabela conversas_whatsapp
    if (contatoId) {
      const messageId = evolutionData.key?.id || `local_${Date.now()}`;
      
      const { error: msgError } = await supabase
        .from("conversas_whatsapp")
        .insert({
          contato_id: contatoId,
          telefone: phoneForDb,
          conteudo: message.trim(),
          remetente: "suporte",
          is_from_me: true,
          data_mensagem: new Date().toISOString(),
          tipo_midia: "texto",
          message_id: messageId,
          message_status: "sent",
          push_name: "Suporte GoKite",
          lida: true,
        });

      if (msgError) {
        // Ignorar erro de duplicidade
        if (!msgError.message?.includes("unique") && !msgError.message?.includes("duplicate")) {
          console.error("[send-message] >>> Erro ao salvar mensagem:", msgError);
        } else {
          console.log("[send-message] >>> Mensagem duplicada (já salva pelo webhook), ignorando");
        }
      } else {
        console.log("[send-message] >>> Mensagem salva no banco com sucesso!");
      }

      // 3. Atualizar ultima_mensagem do contato
      await supabase
        .from("contatos_inteligencia")
        .update({ ultima_mensagem: new Date().toISOString() })
        .eq("id", contatoId);
    }

    // ========== FIM DO SALVAMENTO ==========

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: evolutionData.key?.id || null,
        status: evolutionData.status || "sent",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[send-message] >>> ERRO GERAL:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});