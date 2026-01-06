import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConnectRequest {
  action: "create" | "connect" | "disconnect" | "status" | "delete" | "save-config" | "reconfigure-webhook";
  instanceName?: string;
  apiUrl?: string;
  apiKey?: string;
}

// Lista completa de eventos para sincronização bidirecional em tempo real
const WEBHOOK_EVENTS = [
  "MESSAGES_UPSERT",      // Novas mensagens (recebidas e enviadas)
  "MESSAGES_UPDATE",       // Status de mensagem (entregue, lida)
  "MESSAGES_DELETE",       // Mensagens deletadas
  "SEND_MESSAGE",          // Confirmação de mensagem enviada
  "CONTACTS_UPSERT",       // Novos contatos ou atualizações
  "CONNECTION_UPDATE",     // Status da conexão
  "QRCODE_UPDATED",        // QR Code atualizado
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ConnectRequest = await req.json();
    const { action, instanceName, apiUrl, apiKey } = body;

    console.log(`[Evolution Connect] Action: ${action}, Instance: ${instanceName}`);

    // Buscar config existente
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

    switch (action) {
      case "save-config": {
        if (!instanceName || !apiUrl || !apiKey) {
          return new Response(
            JSON.stringify({ error: "instanceName, apiUrl e apiKey são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Gerar webhook URL
        const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;

        // Salvar ou atualizar config
        if (config) {
          await supabase
            .from("evolution_config")
            .update({
              api_url: apiUrl,
              api_key: apiKey,
              webhook_url: webhookUrl,
            })
            .eq("instance_name", instanceName);
        } else {
          await supabase
            .from("evolution_config")
            .insert({
              instance_name: instanceName,
              api_url: apiUrl,
              api_key: apiKey,
              webhook_url: webhookUrl,
              status: "desconectado",
            });
        }

        return new Response(
          JSON.stringify({ success: true, webhookUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create": {
        if (!config) {
          return new Response(
            JSON.stringify({ error: "Configuração não encontrada. Salve as credenciais primeiro." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Criar instância na Evolution API
        const createResponse = await fetch(`${config.api_url}/instance/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": config.api_key,
          },
          body: JSON.stringify({
            instanceName: config.instance_name,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        });

        const createData = await createResponse.json();
        console.log("[Evolution Connect] Create response:", createData);

        if (!createResponse.ok) {
          // Se instância já existe, tenta conectar
          if (createData.message?.includes("already") || createData.error?.includes("already")) {
            console.log("[Evolution Connect] Instância já existe, tentando conectar...");
          } else {
            return new Response(
              JSON.stringify({ error: createData.message || "Erro ao criar instância" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Configurar webhook na Evolution com TODOS os eventos
        const webhookPayload = {
          webhook: {
            enabled: true,
            url: config.webhook_url,
            webhookByEvents: true,
            webhookBase64: false,
            events: WEBHOOK_EVENTS,
          },
        };

        console.log("[Evolution Connect] Configurando webhook:", webhookPayload);
        
        const webhookResponse = await fetch(`${config.api_url}/webhook/set/${config.instance_name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": config.api_key,
          },
          body: JSON.stringify(webhookPayload),
        });
        
        const webhookResult = await webhookResponse.json();
        console.log("[Evolution Connect] Webhook response:", webhookResult);

        // Atualizar eventos ativos no banco
        await supabase
          .from("evolution_config")
          .update({
            eventos_ativos: WEBHOOK_EVENTS,
          })
          .eq("instance_name", config.instance_name);

        // Buscar QR Code
        const qrResponse = await fetch(`${config.api_url}/instance/connect/${config.instance_name}`, {
          method: "GET",
          headers: { "apikey": config.api_key },
        });

        const qrData = await qrResponse.json();
        console.log("[Evolution Connect] QR response:", JSON.stringify(qrData).slice(0, 200));

        if (qrData.base64) {
          await supabase
            .from("evolution_config")
            .update({
              qrcode_base64: qrData.base64,
              status: "qrcode",
            })
            .eq("instance_name", config.instance_name);

          return new Response(
            JSON.stringify({ success: true, qrcode: qrData.base64, status: "qrcode" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Se já está conectado
        if (qrData.instance?.state === "open") {
          await supabase
            .from("evolution_config")
            .update({
              status: "conectado",
              numero_conectado: qrData.instance?.owner,
            })
            .eq("instance_name", config.instance_name);

          return new Response(
            JSON.stringify({ success: true, status: "conectado", numero: qrData.instance?.owner }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: qrData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reconfigure-webhook": {
        if (!config) {
          return new Response(
            JSON.stringify({ error: "Configuração não encontrada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("[Evolution Connect] Reconfigurando webhook...");

        // Reconfigurar webhook com todos os eventos
        const webhookPayload = {
          webhook: {
            enabled: true,
            url: config.webhook_url,
            webhookByEvents: true,
            webhookBase64: false,
            events: WEBHOOK_EVENTS,
          },
        };

        const webhookResponse = await fetch(`${config.api_url}/webhook/set/${config.instance_name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": config.api_key,
          },
          body: JSON.stringify(webhookPayload),
        });

        const webhookResult = await webhookResponse.json();
        console.log("[Evolution Connect] Webhook reconfigured:", webhookResult);

        // Verificar configuração atual
        const verifyResponse = await fetch(`${config.api_url}/webhook/find/${config.instance_name}`, {
          method: "GET",
          headers: { "apikey": config.api_key },
        });

        const verifyData = await verifyResponse.json();
        console.log("[Evolution Connect] Webhook verify:", verifyData);

        // Atualizar eventos ativos no banco
        await supabase
          .from("evolution_config")
          .update({
            eventos_ativos: WEBHOOK_EVENTS,
            updated_at: new Date().toISOString(),
          })
          .eq("instance_name", config.instance_name);

        return new Response(
          JSON.stringify({ 
            success: true, 
            webhookUrl: config.webhook_url,
            events: WEBHOOK_EVENTS,
            currentConfig: verifyData,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "connect": {
        if (!config) {
          return new Response(
            JSON.stringify({ error: "Configuração não encontrada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const connectResponse = await fetch(`${config.api_url}/instance/connect/${config.instance_name}`, {
          method: "GET",
          headers: { "apikey": config.api_key },
        });

        const connectData = await connectResponse.json();

        if (connectData.base64) {
          await supabase
            .from("evolution_config")
            .update({
              qrcode_base64: connectData.base64,
              status: "qrcode",
            })
            .eq("instance_name", config.instance_name);

          return new Response(
            JSON.stringify({ success: true, qrcode: connectData.base64, status: "qrcode" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: connectData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disconnect": {
        if (!config) {
          return new Response(
            JSON.stringify({ error: "Configuração não encontrada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await fetch(`${config.api_url}/instance/logout/${config.instance_name}`, {
          method: "DELETE",
          headers: { "apikey": config.api_key },
        });

        await supabase
          .from("evolution_config")
          .update({
            status: "desconectado",
            qrcode_base64: null,
          })
          .eq("instance_name", config.instance_name);

        return new Response(
          JSON.stringify({ success: true, status: "desconectado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        if (!config) {
          return new Response(
            JSON.stringify({ configured: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar status real da instância
        try {
          const statusResponse = await fetch(`${config.api_url}/instance/connectionState/${config.instance_name}`, {
            method: "GET",
            headers: { "apikey": config.api_key },
          });

          const statusData = await statusResponse.json();
          console.log("[Evolution Connect] Status response:", statusData);

          let status = config.status;
          if (statusData.instance?.state === "open") status = "conectado";
          else if (statusData.instance?.state === "close") status = "desconectado";
          else if (statusData.instance?.state === "connecting") status = "conectando";

          // Atualizar status no banco
          if (status !== config.status) {
            await supabase
              .from("evolution_config")
              .update({ 
                status,
                numero_conectado: statusData.instance?.owner || config.numero_conectado,
              })
              .eq("instance_name", config.instance_name);
          }

          return new Response(
            JSON.stringify({
              configured: true,
              status,
              instanceName: config.instance_name,
              numeroConectado: statusData.instance?.owner || config.numero_conectado,
              qrcode: status === "qrcode" ? config.qrcode_base64 : null,
              ultimaSincronizacao: config.ultima_sincronizacao,
              totalMensagens: config.total_mensagens_sync,
              totalContatos: config.total_contatos_sync,
              eventosAtivos: config.eventos_ativos || [],
              webhookUrl: config.webhook_url,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (apiError) {
          console.error("[Evolution Connect] Erro ao buscar status:", apiError);
          return new Response(
            JSON.stringify({
              configured: true,
              status: config.status,
              instanceName: config.instance_name,
              numeroConectado: config.numero_conectado,
              qrcode: config.status === "qrcode" ? config.qrcode_base64 : null,
              error: "Não foi possível conectar à Evolution API",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "delete": {
        if (!config) {
          return new Response(
            JSON.stringify({ error: "Configuração não encontrada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Deletar instância na Evolution
        await fetch(`${config.api_url}/instance/delete/${config.instance_name}`, {
          method: "DELETE",
          headers: { "apikey": config.api_key },
        });

        // Deletar config do banco
        await supabase
          .from("evolution_config")
          .delete()
          .eq("instance_name", config.instance_name);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("[Evolution Connect] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
