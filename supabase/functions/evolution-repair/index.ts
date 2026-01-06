import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Evolution Repair] Iniciando reparo de webhook...');

    // Buscar configuração ativa
    const { data: config, error: configError } = await supabase
      .from('evolution_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (configError || !config) {
      console.error('[Evolution Repair] Nenhuma configuração encontrada:', configError);
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma configuração Evolution encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[Evolution Repair] Config encontrada:', {
      instance: config.instance_name,
      apiUrl: config.api_url,
      status: config.status
    });

    // URL do webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;

    // Payload OBRIGATÓRIO para forçar configuração
    const webhookPayload = {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      events: [
        "MESSAGES_UPSERT",
        "SEND_MESSAGE", 
        "CONNECTION_UPDATE",
        "MESSAGES_UPDATE",
        "CONTACTS_UPSERT",
        "CONTACTS_UPDATE"
      ]
    };

    console.log('[Evolution Repair] Payload do webhook:', JSON.stringify(webhookPayload));

    // Fazer POST para configurar webhook
    const webhookSetUrl = `${config.api_url}/webhook/set/${config.instance_name}`;
    console.log('[Evolution Repair] URL de configuração:', webhookSetUrl);

    const response = await fetch(webhookSetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key,
      },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await response.text();
    console.log('[Evolution Repair] Resposta da API:', response.status, responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error('[Evolution Repair] Erro na API Evolution:', response.status, responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ${response.status}: ${responseText}`,
          details: responseData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Atualizar configuração no banco com o webhook configurado
    const { error: updateError } = await supabase
      .from('evolution_config')
      .update({
        webhook_url: webhookUrl,
        eventos_ativos: webhookPayload.events,
        updated_at: new Date().toISOString()
      })
      .eq('id', config.id);

    if (updateError) {
      console.error('[Evolution Repair] Erro ao atualizar config:', updateError);
    }

    console.log('[Evolution Repair] ✅ Webhook configurado com sucesso!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook configurado com sucesso',
        webhookUrl: webhookUrl,
        events: webhookPayload.events,
        apiResponse: responseData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Evolution Repair] Erro crítico:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
