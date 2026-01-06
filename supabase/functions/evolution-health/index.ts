import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthStatus {
  connected: boolean;
  apiReachable: boolean;
  webhookConfigured: boolean;
  lastSync: string | null;
  lastMessage: string | null;
  messageGap: number | null; // Diferença em minutos entre última msg e agora
  issues: string[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[Evolution Health] Verificando saúde da conexão...");

    const healthStatus: HealthStatus = {
      connected: false,
      apiReachable: false,
      webhookConfigured: false,
      lastSync: null,
      lastMessage: null,
      messageGap: null,
      issues: [],
      recommendations: [],
    };

    // Buscar configuração
    const { data: config } = await supabase
      .from("evolution_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!config) {
      healthStatus.issues.push("Evolution API não configurada");
      healthStatus.recommendations.push("Configure a Evolution API em Inteligência > Conectar WhatsApp");
      
      return new Response(
        JSON.stringify(healthStatus),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    healthStatus.lastSync = config.ultima_sincronizacao;
    healthStatus.connected = config.status === "conectado";

    // Verificar se API está acessível
    try {
      const statusResponse = await fetch(
        `${config.api_url}/instance/connectionState/${config.instance_name}`,
        {
          method: "GET",
          headers: { "apikey": config.api_key },
          signal: AbortSignal.timeout(5000), // 5 segundos timeout
        }
      );

      if (statusResponse.ok) {
        healthStatus.apiReachable = true;
        const statusData = await statusResponse.json();
        
        if (statusData.instance?.state === "open") {
          healthStatus.connected = true;
        } else if (statusData.instance?.state !== "open" && config.status === "conectado") {
          healthStatus.issues.push("Status desatualizado no banco de dados");
          
          // Atualizar status no banco
          await supabase
            .from("evolution_config")
            .update({ status: statusData.instance?.state === "close" ? "desconectado" : "conectando" })
            .eq("instance_name", config.instance_name);
        }
      }
    } catch (apiError) {
      healthStatus.issues.push("Evolution API inacessível");
      healthStatus.recommendations.push("Verifique se a URL da API está correta e acessível");
    }

    // Verificar configuração do webhook
    try {
      const webhookResponse = await fetch(
        `${config.api_url}/webhook/find/${config.instance_name}`,
        {
          method: "GET",
          headers: { "apikey": config.api_key },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        const webhook = webhookData.webhook || webhookData;
        
        if (webhook.enabled && webhook.url === config.webhook_url) {
          healthStatus.webhookConfigured = true;
          
          // Verificar se tem todos os eventos necessários
          const requiredEvents = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"];
          const configuredEvents = webhook.events || [];
          const missingEvents = requiredEvents.filter(e => !configuredEvents.includes(e));
          
          if (missingEvents.length > 0) {
            healthStatus.issues.push(`Eventos faltando no webhook: ${missingEvents.join(", ")}`);
            healthStatus.recommendations.push("Reconfigure o webhook para adicionar todos os eventos");
          }
        } else {
          healthStatus.issues.push("Webhook não configurado corretamente");
          healthStatus.recommendations.push("Reconfigure o webhook clicando em 'Reconectar'");
        }
      }
    } catch (webhookError) {
      console.error("[Evolution Health] Erro ao verificar webhook:", webhookError);
    }

    // Verificar última mensagem recebida
    const { data: lastMessage } = await supabase
      .from("conversas_whatsapp")
      .select("data_mensagem")
      .order("data_mensagem", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastMessage) {
      healthStatus.lastMessage = lastMessage.data_mensagem;
      const gapMinutes = Math.floor((Date.now() - new Date(lastMessage.data_mensagem).getTime()) / 60000);
      healthStatus.messageGap = gapMinutes;
      
      // Alertar se não recebeu mensagens há muito tempo
      if (healthStatus.connected && gapMinutes > 60) {
        healthStatus.issues.push(`Nenhuma mensagem recebida há ${gapMinutes} minutos`);
        healthStatus.recommendations.push("Verifique se o webhook está funcionando corretamente");
      }
    } else if (healthStatus.connected) {
      healthStatus.issues.push("Nenhuma mensagem sincronizada ainda");
      healthStatus.recommendations.push("Envie uma mensagem de teste para verificar a sincronização");
    }

    // Se conectado mas com problemas, sugerir reconexão
    if (healthStatus.connected && healthStatus.issues.length > 0) {
      healthStatus.recommendations.push("Tente reconfigurar o webhook para resolver problemas de sincronização");
    }

    console.log("[Evolution Health] Status:", JSON.stringify(healthStatus));

    return new Response(
      JSON.stringify(healthStatus),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Evolution Health] Erro:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        connected: false,
        apiReachable: false,
        webhookConfigured: false,
        issues: ["Erro ao verificar saúde da conexão"],
        recommendations: ["Tente novamente em alguns segundos"],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
