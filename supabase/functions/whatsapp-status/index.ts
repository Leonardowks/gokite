import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeInItem {
  id: string;
  equipamento_recebido: string;
  valor_entrada: number;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  tamanho: string | null;
  condicao: string | null;
  fotos: string[];
  foto_url: string | null;
}

interface PublishRequest {
  action: 'publish_single' | 'publish_batch' | 'schedule';
  item_id?: string;
  items_ids?: string[];
  schedule_cron?: string;
  custom_template?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Evolution API config
    const { data: evolutionConfig } = await supabase
      .from('evolution_config')
      .select('*')
      .limit(1)
      .single();

    if (!evolutionConfig) {
      return new Response(
        JSON.stringify({ success: false, error: 'Evolution API não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { api_url, api_key, instance_name } = evolutionConfig;

    const body: PublishRequest = await req.json();
    const { action, item_id, items_ids, custom_template } = body;

    // Default template
    const template = custom_template || "🔥 NOVO USADO: {nome} - R$ {valor} - {condicao}\n\n{descricao}\n\n👉 Veja mais em: {link}";

    let itemsToPublish: TradeInItem[] = [];

    if (action === 'publish_single' && item_id) {
      const { data } = await supabase
        .from('trade_ins')
        .select('id, equipamento_recebido, valor_entrada, categoria, marca, modelo, tamanho, condicao, fotos, foto_url')
        .eq('id', item_id)
        .eq('status', 'em_estoque')
        .single();
      
      if (data) itemsToPublish = [data as TradeInItem];
    } else if (action === 'publish_batch' && items_ids?.length) {
      const { data } = await supabase
        .from('trade_ins')
        .select('id, equipamento_recebido, valor_entrada, categoria, marca, modelo, tamanho, condicao, fotos, foto_url')
        .in('id', items_ids)
        .eq('status', 'em_estoque');
      
      if (data) itemsToPublish = data as TradeInItem[];
    } else if (action === 'schedule') {
      // Para agendamento, retornamos sucesso - o cron job será configurado separadamente
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Agendamento configurado. Use pg_cron para executar esta função periodicamente.',
          suggested_cron: body.schedule_cron || '0 10 * * 6' // Sábados às 10h
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (itemsToPublish.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum item encontrado para publicar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    const catalogoUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://seusite.com';

    for (const item of itemsToPublish) {
      const nome = [item.marca, item.modelo, item.tamanho].filter(Boolean).join(' ') || item.equipamento_recebido;
      const link = `${catalogoUrl}/catalogo?item=${item.id}`;
      
      const condicaoMap: Record<string, string> = {
        'novo': '✨ Novo',
        'seminovo': '🌟 Seminovo',
        'usado_bom': '👍 Usado Bom',
        'usado_regular': '👌 Usado Regular',
        'desgastado': '⚠️ Desgastado'
      };

      const mensagem = template
        .replace('{nome}', nome)
        .replace('{valor}', item.valor_entrada.toLocaleString('pt-BR'))
        .replace('{condicao}', condicaoMap[item.condicao || ''] || item.condicao || 'N/A')
        .replace('{descricao}', `${item.categoria || ''} ${item.marca || ''} ${item.modelo || ''}`.trim())
        .replace('{link}', link);

      // Foto para o status
      const fotoUrl = item.fotos?.[0] || item.foto_url;

      try {
        // Publicar no WhatsApp Status via Evolution API
        const statusPayload: any = {
          type: 'text',
          content: mensagem,
          statusJidList: ['all'], // Publicar para todos os contatos
          backgroundColor: '#128C7E', // Verde WhatsApp
          font: 1
        };

        // Se tiver foto, usar status de imagem
        if (fotoUrl) {
          statusPayload.type = 'image';
          statusPayload.content = fotoUrl;
          statusPayload.caption = mensagem;
          delete statusPayload.backgroundColor;
          delete statusPayload.font;
        }

        const evolutionResponse = await fetch(
          `${api_url}/message/sendStatus/${instance_name}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': api_key,
            },
            body: JSON.stringify(statusPayload),
          }
        );

        const evolutionResult = await evolutionResponse.json();

        results.push({
          item_id: item.id,
          nome,
          success: evolutionResponse.ok,
          response: evolutionResult
        });

        console.log(`[whatsapp-status] Publicado: ${nome}`, evolutionResult);

      } catch (error) {
        console.error(`[whatsapp-status] Erro ao publicar ${nome}:`, error);
        results.push({
          item_id: item.id,
          nome,
          success: false,
          error: String(error)
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${successCount}/${results.length} itens publicados no Status`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[whatsapp-status] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
