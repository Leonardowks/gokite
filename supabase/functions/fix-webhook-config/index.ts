import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("[Fix Webhook] Iniciando reconfiguração do webhook...");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar configuração atual
    const { data: config, error: configError } = await supabase
      .from("evolution_config")
      .select("*")
      .limit(1)
      .single();

    if (configError || !config) {
      console.error("[Fix Webhook] Erro ao buscar config:", configError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Configuração não encontrada" 
      }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { api_url, api_key, instance_name } = config;
    console.log(`[Fix Webhook] Configurando webhook para instância: ${instance_name}`);

    // URL do webhook que deve ser configurado
    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;

    // Payload COMPLETO com estrutura correta para Evolution API
    const webhookPayload = {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE", 
          "MESSAGES_DELETE",
          "SEND_MESSAGE",
          "CONNECTION_UPDATE",
          "CONTACTS_UPSERT",
          "CONTACTS_UPDATE",
          "QRCODE_UPDATED"
        ]
      }
    };

    console.log("[Fix Webhook] Payload:", JSON.stringify(webhookPayload, null, 2));

    // Fazer requisição para configurar o webhook
    const evolutionUrl = `${api_url}/webhook/set/${instance_name}`;
    console.log(`[Fix Webhook] Enviando para: ${evolutionUrl}`);

    const response = await fetch(evolutionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": api_key,
      },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await response.text();
    console.log(`[Fix Webhook] Status: ${response.status}`);
    console.log(`[Fix Webhook] Response: ${responseText}`);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error("[Fix Webhook] Erro na Evolution API:", responseData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Evolution API retornou ${response.status}`,
        details: responseData
      }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Atualizar a tabela com a URL do webhook e eventos
    const { error: updateError } = await supabase
      .from("evolution_config")
      .update({
        webhook_url: webhookUrl,
        eventos_ativos: webhookPayload.webhook.events,
        updated_at: new Date().toISOString(),
      })
      .eq("id", config.id);

    if (updateError) {
      console.error("[Fix Webhook] Erro ao atualizar config local:", updateError);
    }

    console.log("[Fix Webhook] ✅ Webhook configurado com sucesso!");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Webhook configurado com sucesso",
      webhook_url: webhookUrl,
      events: webhookPayload.webhook.events,
      evolution_response: responseData
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Fix Webhook] Erro crítico:", errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
