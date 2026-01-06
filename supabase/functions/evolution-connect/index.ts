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

        let instanceExists = false;

        // Primeiro, verificar se a instância já existe
        try {
          const checkResponse = await fetch(`${config.api_url}/instance/connectionState/${config.instance_name}`, {
            method: "GET",
            headers: { "apikey": config.api_key },
          });
          
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            console.log("[Evolution Connect] Instance check:", checkData);
            instanceExists = true;
          }
        } catch (e) {
          console.log("[Evolution Connect] Instance does not exist, will create");
        }

        // Se não existe, criar
        if (!instanceExists) {
          console.log(`[Evolution Connect] Criando instância: ${config.instance_name} em ${config.api_url}`);
          
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

          const createText = await createResponse.text();
          console.log("[Evolution Connect] Create raw response:", createResponse.status, createText);
          
          let createData: any = {};
          try {
            createData = JSON.parse(createText);
          } catch {
            createData = { raw: createText };
          }

          // Verificar se o erro é porque já existe
          const errorMessage = Array.isArray(createData.message) 
            ? createData.message.join(' ') 
            : (createData.message || createData.error || createText || '');
          
          if (!createResponse.ok && !errorMessage.toLowerCase().includes('already') && !errorMessage.toLowerCase().includes('exists')) {
            console.error("[Evolution Connect] Erro ao criar:", errorMessage);
            return new Response(
              JSON.stringify({ error: errorMessage || "Erro ao criar instância", details: createData }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          // Se chegou aqui, instância foi criada ou já existe
          if (errorMessage.toLowerCase().includes('already') || errorMessage.toLowerCase().includes('exists')) {
            instanceExists = true;
            console.log("[Evolution Connect] Instância já existe, continuando...");
          } else {
            console.log("[Evolution Connect] Instância criada com sucesso");
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

        // Buscar QR Code ou status de conexão
        const qrResponse = await fetch(`${config.api_url}/instance/connect/${config.instance_name}`, {
          method: "GET",
          headers: { "apikey": config.api_key },
        });

        const qrData = await qrResponse.json();
        console.log("[Evolution Connect] QR/Connect response:", JSON.stringify(qrData).slice(0, 300));

        // Se tem QR code, retornar
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

        // Verificar se já está conectado
        const statusResponse = await fetch(`${config.api_url}/instance/connectionState/${config.instance_name}`, {
          method: "GET",
          headers: { "apikey": config.api_key },
        });
        
        const statusData = await statusResponse.json();
        console.log("[Evolution Connect] Status check:", statusData);

        if (statusData.instance?.state === "open") {
          await supabase
            .from("evolution_config")
            .update({
              status: "conectado",
              numero_conectado: statusData.instance?.owner || qrData.instance?.owner,
              qrcode_base64: null,
            })
            .eq("instance_name", config.instance_name);

          return new Response(
            JSON.stringify({ 
              success: true, 
              status: "conectado", 
              numero: statusData.instance?.owner || qrData.instance?.owner 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Se está desconectado, tentar reconectar
        if (statusData.instance?.state === "close") {
          // Forçar reconexão
          const reconnectResponse = await fetch(`${config.api_url}/instance/connect/${config.instance_name}`, {
            method: "GET",
            headers: { "apikey": config.api_key },
          });
          
          const reconnectData = await reconnectResponse.json();
          console.log("[Evolution Connect] Reconnect response:", JSON.stringify(reconnectData).slice(0, 300));
          
          if (reconnectData.base64) {
            await supabase
              .from("evolution_config")
              .update({
                qrcode_base64: reconnectData.base64,
                status: "qrcode",
              })
              .eq("instance_name", config.instance_name);

            return new Response(
              JSON.stringify({ success: true, qrcode: reconnectData.base64, status: "qrcode" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify({ success: true, data: qrData, status: statusData.instance?.state || "unknown" }),
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
          let qrcodeToReturn = null;
          
          if (statusData.instance?.state === "open") {
            status = "conectado";
            // Limpar QR code quando conectado
            if (config.qrcode_base64) {
              await supabase
                .from("evolution_config")
                .update({ qrcode_base64: null, status: "conectado" })
                .eq("instance_name", config.instance_name);
            }
          } else if (statusData.instance?.state === "close") {
            status = "desconectado";
          } else if (statusData.instance?.state === "connecting") {
            // Se está "connecting" e tem QR code salvo, manter status como "qrcode"
            if (config.qrcode_base64) {
              status = "qrcode";
              qrcodeToReturn = config.qrcode_base64;
            } else {
              // Se não tem QR code, buscar um novo
              try {
                const qrResponse = await fetch(`${config.api_url}/instance/connect/${config.instance_name}`, {
                  method: "GET",
                  headers: { "apikey": config.api_key },
                });
                const qrData = await qrResponse.json();
                if (qrData.base64) {
                  qrcodeToReturn = qrData.base64;
                  status = "qrcode";
                  await supabase
                    .from("evolution_config")
                    .update({ qrcode_base64: qrData.base64, status: "qrcode" })
                    .eq("instance_name", config.instance_name);
                } else {
                  status = "conectando";
                }
              } catch (e) {
                status = "conectando";
              }
            }
          }

          // Atualizar status no banco se mudou
          if (status !== config.status && status !== "qrcode") {
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
              qrcode: qrcodeToReturn,
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
