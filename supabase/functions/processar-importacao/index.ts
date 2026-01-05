import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContatoImport {
  nome?: string;
  telefone: string;
  email?: string;
  origem?: string;
  dados_brutos?: Record<string, unknown>;
}

function formatarTelefone(telefone: string): string | null {
  // Remove tudo que não é número
  const numeros = telefone.replace(/\D/g, '');
  
  // Valida tamanho mínimo
  if (numeros.length < 10) return null;
  
  // Se tem 13 dígitos e começa com 55, é BR com código
  if (numeros.length === 13 && numeros.startsWith('55')) {
    return numeros;
  }
  
  // Se tem 11 dígitos (DDD + celular BR)
  if (numeros.length === 11) {
    return `55${numeros}`;
  }
  
  // Se tem 10 dígitos (DDD + fixo BR)
  if (numeros.length === 10) {
    return `55${numeros}`;
  }
  
  // Outros formatos, retorna como está se válido
  if (numeros.length >= 10 && numeros.length <= 15) {
    return numeros;
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { contatos, origem = 'importacao' } = await req.json() as { 
      contatos: ContatoImport[]; 
      origem?: string;
    };

    if (!contatos || !Array.isArray(contatos)) {
      throw new Error("Array de contatos é obrigatório");
    }

    console.log(`Processando importação de ${contatos.length} contatos...`);

    const resultados = {
      importados: 0,
      duplicados: 0,
      invalidos: 0,
      erros: [] as string[],
    };

    // Processar em lotes de 100
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < contatos.length; i += BATCH_SIZE) {
      const lote = contatos.slice(i, i + BATCH_SIZE);
      
      const contatosParaInserir = [];
      
      for (const contato of lote) {
        const telefoneFormatado = formatarTelefone(contato.telefone);
        
        if (!telefoneFormatado) {
          resultados.invalidos++;
          continue;
        }

        contatosParaInserir.push({
          nome: contato.nome?.trim() || null,
          telefone: telefoneFormatado,
          email: contato.email?.trim().toLowerCase() || null,
          origem: contato.origem || origem,
          dados_brutos: contato.dados_brutos || {},
          status: 'nao_classificado',
        });
      }

      if (contatosParaInserir.length > 0) {
        // Usar upsert para evitar duplicatas
        const { data, error } = await supabase
          .from('contatos_inteligencia')
          .upsert(contatosParaInserir, {
            onConflict: 'telefone',
            ignoreDuplicates: true,
          })
          .select('id');

        if (error) {
          console.error("Erro no lote:", error);
          resultados.erros.push(`Erro no lote ${i / BATCH_SIZE + 1}: ${error.message}`);
        } else {
          // Contar quantos foram realmente inseridos
          const insertedCount = data?.length || 0;
          resultados.importados += insertedCount;
          resultados.duplicados += contatosParaInserir.length - insertedCount;
        }
      }
    }

    // Tentar vincular contatos a clientes existentes
    const { data: contatosSemCliente } = await supabase
      .from('contatos_inteligencia')
      .select('id, telefone, email')
      .is('cliente_id', null)
      .limit(500);

    if (contatosSemCliente && contatosSemCliente.length > 0) {
      let vinculados = 0;
      
      for (const contato of contatosSemCliente) {
        // Buscar cliente por telefone ou email
        const { data: cliente } = await supabase
          .from('clientes')
          .select('id')
          .or(`telefone.eq.${contato.telefone},email.eq.${contato.email}`)
          .maybeSingle();

        if (cliente) {
          await supabase
            .from('contatos_inteligencia')
            .update({ cliente_id: cliente.id })
            .eq('id', contato.id);
          vinculados++;
        }
      }

      console.log(`${vinculados} contatos vinculados a clientes existentes`);
    }

    console.log("Importação concluída:", resultados);

    return new Response(
      JSON.stringify({
        success: true,
        ...resultados,
        message: `${resultados.importados} contatos importados, ${resultados.duplicados} duplicados ignorados, ${resultados.invalidos} inválidos`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Erro na importação:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
