import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1) Busca credenciais
    const { data: config, error: configError } = await supabase
      .from('evolution_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (configError || !config) throw new Error('Configuração não encontrada');

    // 2) Define URL do Webhook (Dinâmica)
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/evolution-webhook`;

    console.log(`[Evolution Repair] Reparando webhook para ${config.instance_name} apontando para ${webhookUrl}`);

    // 3) Força configuração na Evolution (V2 exige propriedade "webhook")
    const body = {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "SEND_MESSAGE",
          "CONNECTION_UPDATE",
          "CONTACTS_UPSERT",
        ],
      },
    };

    const response = await fetch(`${config.api_url}/webhook/set/${config.instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    console.log('[Evolution Repair] Resposta Evolution:', response.status, result);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, status: response.status, error: 'Bad Request', details: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualiza cache local da config (best-effort)
    await supabase
      .from('evolution_config')
      .update({ webhook_url: webhookUrl, eventos_ativos: body.webhook.events, updated_at: new Date().toISOString() })
      .eq('id', config.id);

    return new Response(
      JSON.stringify({ success: true, status: response.status, webhookUrl, events: body.webhook.events, apiResponse: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Evolution Repair] Erro:', error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
