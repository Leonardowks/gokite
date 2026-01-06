import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  action: "contacts" | "messages" | "full";
  instanceName?: string;
  phoneNumber?: string;
}

interface Chat {
  id: string;
  name?: string;
  pushName?: string;
  profilePictureUrl?: string;
  remoteJid?: string;
  unreadCount?: number;
}

interface Message {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: { caption?: string; mimetype?: string; url?: string };
    audioMessage?: { mimetype?: string; url?: string };
    videoMessage?: { caption?: string; mimetype?: string; url?: string };
    documentMessage?: { fileName?: string; mimetype?: string; url?: string };
    stickerMessage?: { mimetype?: string };
  };
  messageTimestamp?: string | number;
  messageType?: string;
}

// Extrai telefone limpo do JID
function extractPhoneFromJid(jid: string): string {
  if (!jid) return "";
  return jid.split("@")[0].replace(/\D/g, "");
}

// Valida se é um JID de contato individual (não grupo)
// Aceitar @s.whatsapp.net (normal) e @lid (WhatsApp Business Lead)
// Bloquear apenas grupos (@g.us)
function isIndividualChat(jid: string): boolean {
  if (jid.includes("@g.us")) return false; // Grupo = sempre bloquear
  return jid.includes("@s.whatsapp.net") || jid.includes("@lid");
}

// Extrai conteúdo e tipo de mídia de uma mensagem
function extractMessageContent(message: Message["message"]): { 
  content: string; 
  tipoMidia: string; 
  mediaUrl?: string;
  mediaMimetype?: string;
} {
  if (!message) return { content: "", tipoMidia: "texto" };

  if (message.conversation) {
    return { content: message.conversation, tipoMidia: "texto" };
  }
  if (message.extendedTextMessage?.text) {
    return { content: message.extendedTextMessage.text, tipoMidia: "texto" };
  }
  if (message.imageMessage) {
    return { 
      content: message.imageMessage.caption || "[Imagem]", 
      tipoMidia: "imagem",
      mediaUrl: message.imageMessage.url,
      mediaMimetype: message.imageMessage.mimetype,
    };
  }
  if (message.audioMessage) {
    return { 
      content: "[Áudio]", 
      tipoMidia: "audio",
      mediaUrl: message.audioMessage.url,
      mediaMimetype: message.audioMessage.mimetype,
    };
  }
  if (message.videoMessage) {
    return { 
      content: message.videoMessage.caption || "[Vídeo]", 
      tipoMidia: "video",
      mediaUrl: message.videoMessage.url,
      mediaMimetype: message.videoMessage.mimetype,
    };
  }
  if (message.documentMessage) {
    return { 
      content: message.documentMessage.fileName || "[Documento]", 
      tipoMidia: "documento",
      mediaUrl: message.documentMessage.url,
      mediaMimetype: message.documentMessage.mimetype,
    };
  }
  if (message.stickerMessage) {
    return { content: "[Sticker]", tipoMidia: "sticker" };
  }

  return { content: "[Mensagem não suportada]", tipoMidia: "outro" };
}

// Fetch com retry e backoff exponencial
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
        console.log(`[Sync] Rate limited. Aguardando ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Sync] Tentativa ${attempt}/${maxRetries} falhou:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error("Falha após múltiplas tentativas");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Adiciona log ao job
async function addJobLog(
  supabase: any, 
  jobId: string, 
  message: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  console.log(logEntry);
  
  try {
    const { data } = await supabase
      .from("sync_jobs")
      .select("logs")
      .eq("id", jobId)
      .single();
    
    const logs = Array.isArray(data?.logs) ? data.logs : [];
    logs.push(logEntry);
    
    await supabase
      .from("sync_jobs")
      .update({ logs: logs.slice(-100) })
      .eq("id", jobId);
  } catch (err) {
    console.error("[addJobLog] Erro:", err);
  }
}

// Atualiza progresso do job
async function updateJobProgress(
  supabase: any,
  jobId: string,
  updates: Record<string, any>
): Promise<void> {
  await supabase
    .from("sync_jobs")
    .update(updates)
    .eq("id", jobId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let jobId = "";
  const startTime = Date.now();

  try {
    const body: SyncRequest = await req.json();
    const { action, instanceName, phoneNumber } = body;

    console.log(`[Evolution Sync] Iniciando: action=${action}, instance=${instanceName}`);

    // Buscar config
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

    if (!config) {
      return new Response(
        JSON.stringify({ error: "Configuração da Evolution não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar job de sincronização
    const { data: job, error: jobError } = await supabase
      .from("sync_jobs")
      .insert({
        tipo: action,
        status: "em_andamento",
        iniciado_em: new Date().toISOString(),
        logs: [],
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error(`Erro ao criar job: ${jobError?.message}`);
    }

    jobId = job.id;
    await addJobLog(supabase, jobId, `Sincronização ${action} iniciada`);

    const stats = {
      chats_processados: 0,
      contatos_criados: 0,
      contatos_atualizados: 0,
      mensagens_criadas: 0,
      mensagens_puladas: 0,
      erros: 0,
    };

    // ========================================
    // FASE 1: Buscar todos os chats ativos
    // ========================================
    if (action === "full" || action === "contacts") {
      await addJobLog(supabase, jobId, "Buscando chats ativos via findChats...");

      // Evolution API v2 usa POST para findChats
      const chatsResponse = await fetchWithRetry(
        `${config.api_url}/chat/findChats/${config.instance_name}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": config.api_key,
          },
          body: JSON.stringify({}),
        }
      );

      if (!chatsResponse.ok) {
        const errorText = await chatsResponse.text();
        await addJobLog(supabase, jobId, `Erro findChats: ${chatsResponse.status} - ${errorText}`);
        throw new Error(`findChats falhou: ${chatsResponse.status}`);
      }

      const chats: Chat[] = await chatsResponse.json();
      const individualChats = chats.filter(c => {
        const jid = c.id || c.remoteJid || "";
        return isIndividualChat(jid);
      });

      await addJobLog(supabase, jobId, `${chats.length} chats encontrados (${individualChats.length} individuais)`);
      
      await updateJobProgress(supabase, jobId, {
        progresso_total: individualChats.length,
        progresso_atual: 0,
      });

      // ========================================
      // FASE 2: Processar cada chat
      // ========================================
      const BATCH_SIZE = 10;
      
      for (let i = 0; i < individualChats.length; i += BATCH_SIZE) {
        const batch = individualChats.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (chat) => {
          const jid = chat.id || chat.remoteJid || "";
          const phone = extractPhoneFromJid(jid);
          
          if (!phone || phone.length < 8) {
            stats.erros++;
            return;
          }

          try {
            // Upsert contato com remote_jid
            const { data: existingContact } = await supabase
              .from("contatos_inteligencia")
              .select("id, conversas_analisadas")
              .or(`telefone.eq.${phone},remote_jid.eq.${jid}`)
              .maybeSingle();

            let contatoId: string;

            if (existingContact) {
              // Atualizar contato existente - NÃO sobrescrever nome se já tiver
              // Só atualizar foto, remote_jid e dados técnicos
              const updateData: Record<string, any> = {
                remote_jid: jid,
                telefone: phone,
                evolution_contact_id: chat.id,
                updated_at: new Date().toISOString(),
              };
              
              // Só atualizar foto se tiver uma nova
              if (chat.profilePictureUrl) {
                updateData.whatsapp_profile_picture = chat.profilePictureUrl;
              }
              
              await supabase
                .from("contatos_inteligencia")
                .update(updateData)
                .eq("id", existingContact.id);
              
              contatoId = existingContact.id;
              stats.contatos_atualizados++;
            } else {
              // Criar novo contato
              const { data: newContact, error: insertError } = await supabase
                .from("contatos_inteligencia")
                .insert({
                  telefone: phone,
                  remote_jid: jid,
                  nome: chat.pushName || chat.name || `Contato ${phone.slice(-4)}`,
                  whatsapp_profile_name: chat.pushName || chat.name,
                  whatsapp_profile_picture: chat.profilePictureUrl,
                  evolution_contact_id: chat.id,
                  origem: "evolution",
                  status: "nao_classificado",
                })
                .select("id")
                .single();

              if (insertError || !newContact) {
                console.error(`Erro ao criar contato ${phone}:`, insertError);
                stats.erros++;
                return;
              }

              contatoId = newContact.id;
              stats.contatos_criados++;
            }

            // ========================================
            // FASE 3: Buscar mensagens do chat (se full)
            // ========================================
            if (action === "full") {
              await syncMessagesForContact(
                supabase,
                config,
                jid,
                phone,
                contatoId,
                stats
              );
            }

            stats.chats_processados++;
          } catch (error) {
            console.error(`Erro ao processar chat ${jid}:`, error);
            stats.erros++;
          }
        }));

        // Atualizar progresso
        await updateJobProgress(supabase, jobId, {
          progresso_atual: Math.min(i + BATCH_SIZE, individualChats.length),
          ...stats,
        });

        // Log a cada 50 chats
        if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= individualChats.length) {
          await addJobLog(
            supabase, 
            jobId, 
            `Progresso: ${Math.min(i + BATCH_SIZE, individualChats.length)}/${individualChats.length} chats`
          );
        }

        // Pequeno delay para não sobrecarregar a API
        if (i + BATCH_SIZE < individualChats.length) {
          await sleep(200);
        }
      }
    }

    // Sync apenas de mensagens (para todos os contatos)
    if (action === "messages") {
      await addJobLog(supabase, jobId, "Sincronizando mensagens de todos os contatos...");
      
      const { data: contatos } = await supabase
        .from("contatos_inteligencia")
        .select("id, telefone, remote_jid")
        .not("remote_jid", "is", null)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (contatos && contatos.length > 0) {
        await updateJobProgress(supabase, jobId, { progresso_total: contatos.length });

        for (let i = 0; i < contatos.length; i++) {
          const contato = contatos[i];
          const jid = contato.remote_jid || `${contato.telefone}@s.whatsapp.net`;
          
          await syncMessagesForContact(
            supabase,
            config,
            jid,
            contato.telefone,
            contato.id,
            stats
          );

          stats.chats_processados++;
          
          if ((i + 1) % 20 === 0) {
            await updateJobProgress(supabase, jobId, {
              progresso_atual: i + 1,
              ...stats,
            });
          }
        }
      }
    }

    // Sync de mensagens para um contato específico
    if (phoneNumber) {
      await addJobLog(supabase, jobId, `Sincronizando mensagens do contato ${phoneNumber}...`);
      
      const phone = phoneNumber.replace(/\D/g, "");
      const jid = `${phone}@s.whatsapp.net`;

      const { data: contato } = await supabase
        .from("contatos_inteligencia")
        .select("id")
        .or(`telefone.eq.${phone},remote_jid.eq.${jid}`)
        .maybeSingle();

      if (contato) {
        await syncMessagesForContact(
          supabase,
          config,
          jid,
          phone,
          contato.id,
          stats
        );
      }
    }

    // ========================================
    // FASE FINAL: Atualizar estatísticas
    // ========================================
    const { count: totalMensagens } = await supabase
      .from("conversas_whatsapp")
      .select("*", { count: "exact", head: true });

    const { count: totalContatos } = await supabase
      .from("contatos_inteligencia")
      .select("*", { count: "exact", head: true })
      .not("remote_jid", "is", null);

    await supabase
      .from("evolution_config")
      .update({
        ultima_sincronizacao: new Date().toISOString(),
        total_mensagens_sync: totalMensagens || 0,
        total_contatos_sync: totalContatos || 0,
      })
      .eq("instance_name", config.instance_name);

    // Finalizar job
    const duration = Math.round((Date.now() - startTime) / 1000);
    await addJobLog(supabase, jobId, `Sincronização concluída em ${duration}s`);
    
    await supabase
      .from("sync_jobs")
      .update({
        status: "concluido",
        concluido_em: new Date().toISOString(),
        ...stats,
        resultado: {
          duration,
          totalMensagens,
          totalContatos,
        },
      })
      .eq("id", jobId);

    console.log("[Evolution Sync] Resultado final:", stats);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        results: stats,
        duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Evolution Sync] Erro crítico:", error);
    
    // Marcar job como erro
    if (jobId) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await addJobLog(supabase, jobId, `ERRO: ${errorMessage}`);
      await supabase
        .from("sync_jobs")
        .update({
          status: "erro",
          erro: errorMessage,
          concluido_em: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        jobId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Função dedicada para sincronizar mensagens de um contato
async function syncMessagesForContact(
  supabase: any,
  config: any,
  jid: string,
  phone: string,
  contatoId: string,
  stats: {
    mensagens_criadas: number;
    mensagens_puladas: number;
    erros: number;
  }
): Promise<void> {
  try {
    let messages: Message[] = [];
    
    console.log(`[Sync] Buscando mensagens para JID: ${jid}`);
    
    const findMessagesUrl = `${config.api_url}/chat/findMessages/${config.instance_name}`;
    let currentPage = 1;
    let totalPages = 1;
    
    // Buscar todas as páginas de mensagens (500 por página para máxima eficiência)
    const MAX_PAGES = 50; // Limite de segurança para evitar loops infinitos
    
    while (currentPage <= totalPages && currentPage <= MAX_PAGES) {
      const requestBody = {
        where: {
          key: {
            remoteJid: jid,
          },
        },
        page: currentPage,
        offset: 500, // 500 mensagens por página (máximo recomendado)
      };
      
      const findMessagesResponse = await fetchWithRetry(
        findMessagesUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": config.api_key,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!findMessagesResponse.ok) {
        const errorText = await findMessagesResponse.text();
        console.log(`[Sync] findMessages falhou página ${currentPage}: ${findMessagesResponse.status} - ${errorText}`);
        break;
      }

      const data = await findMessagesResponse.json();
      
      // Evolution API v2 retorna: { messages: { total, pages, currentPage, records: [...] } }
      if (data.messages?.records) {
        const pageMessages = data.messages.records;
        totalPages = data.messages.pages || 1;
        
        if (currentPage === 1) {
          console.log(`[Sync] JID ${jid}: ${data.messages.total} mensagens em ${totalPages} páginas`);
        }
        
        // Filtrar mensagens deste JID
        const filteredMessages = pageMessages.filter((m: Message) => {
          const msgJid = m.key?.remoteJid || "";
          return msgJid === jid || extractPhoneFromJid(msgJid) === phone;
        });
        
        messages.push(...filteredMessages);
        
        // Se a página veio vazia, parar
        if (pageMessages.length === 0) {
          break;
        }
      } else if (Array.isArray(data)) {
        messages.push(...data);
        break; // Sem paginação
      } else if (Array.isArray(data.messages)) {
        messages.push(...data.messages);
        break; // Sem paginação
      } else {
        break;
      }
      
      currentPage++;
      
      // Delay entre páginas para não sobrecarregar a API
      if (currentPage <= totalPages) {
        await sleep(50);
      }
    }
    
    if (currentPage > MAX_PAGES) {
      console.log(`[Sync] Limite de ${MAX_PAGES} páginas atingido para ${jid}`);
    }

    if (messages.length === 0) {
      console.log(`[Sync] Nenhuma mensagem encontrada para ${jid}`);
      return;
    }

    console.log(`[Sync] Total de ${messages.length} mensagens para processar de ${jid}`);

    // Buscar IDs de mensagens já existentes para este contato
    const { data: existingMessages } = await supabase
      .from("conversas_whatsapp")
      .select("message_id")
      .eq("contato_id", contatoId);

    const existingIds = new Set((existingMessages || []).map((m: any) => m.message_id));

    // Processar mensagens
    const newMessages: any[] = [];

    for (const msg of messages) {
      if (!msg.key?.id || !msg.message) continue;
      if (existingIds.has(msg.key.id)) {
        stats.mensagens_puladas++;
        continue;
      }

      const { content, tipoMidia, mediaUrl, mediaMimetype } = extractMessageContent(msg.message);
      
      if (!content) continue;

      const timestamp = msg.messageTimestamp
        ? new Date(
            typeof msg.messageTimestamp === "string"
              ? parseInt(msg.messageTimestamp) * 1000
              : (msg.messageTimestamp as number) * 1000
          )
        : new Date();

      newMessages.push({
        contato_id: contatoId,
        telefone: phone,
        message_id: msg.key.id,
        instance_name: config.instance_name,
        is_from_me: msg.key.fromMe || false,
        push_name: msg.pushName,
        data_mensagem: timestamp.toISOString(),
        remetente: msg.key.fromMe ? "empresa" : "cliente",
        conteudo: content,
        tipo_midia: tipoMidia,
        media_url: mediaUrl,
        media_mimetype: mediaMimetype,
      });
    }

    // Inserir em batches de 100 usando upsert para evitar duplicatas
    const BATCH_SIZE = 100;
    for (let i = 0; i < newMessages.length; i += BATCH_SIZE) {
      const batch = newMessages.slice(i, i + BATCH_SIZE);
      
      const { error, data: inserted } = await supabase
        .from("conversas_whatsapp")
        .upsert(batch, { 
          onConflict: "message_id",
          ignoreDuplicates: true 
        })
        .select("id");

      if (error) {
        console.error(`Erro ao inserir mensagens batch ${i}:`, error);
        stats.erros += batch.length;
      } else {
        const insertedCount = inserted?.length || 0;
        stats.mensagens_criadas += insertedCount;
        stats.mensagens_puladas += batch.length - insertedCount;
      }
    }

    // Atualizar contagem no contato
    const { count } = await supabase
      .from("conversas_whatsapp")
      .select("*", { count: "exact", head: true })
      .eq("contato_id", contatoId);

    // Buscar timestamp da última mensagem REAL do contato
    const { data: lastMsg } = await supabase
      .from("conversas_whatsapp")
      .select("data_mensagem")
      .eq("contato_id", contatoId)
      .order("data_mensagem", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Buscar nome real do cliente da última mensagem RECEBIDA (não enviada pela empresa)
    const { data: lastClientMsg } = await supabase
      .from("conversas_whatsapp")
      .select("push_name")
      .eq("contato_id", contatoId)
      .eq("is_from_me", false)
      .not("push_name", "is", null)
      .order("data_mensagem", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Preparar update do contato
    const contactUpdate: Record<string, any> = {
      conversas_analisadas: count || 0,
      ultima_mensagem: lastMsg?.data_mensagem || new Date().toISOString(),
    };
    
    // Atualizar nome se encontrou um válido nas mensagens recebidas
    if (lastClientMsg?.push_name && 
        lastClientMsg.push_name.length > 2 && 
        !/^\d+$/.test(lastClientMsg.push_name) &&
        !['Você', 'EQA', 'Eu (Suporte)', 'Suporte'].includes(lastClientMsg.push_name)) {
      contactUpdate.whatsapp_profile_name = lastClientMsg.push_name;
      contactUpdate.nome = lastClientMsg.push_name;
    }
    
    await supabase
      .from("contatos_inteligencia")
      .update(contactUpdate)
      .eq("id", contatoId);

  } catch (error) {
    console.error(`[Sync] Erro ao sincronizar mensagens de ${jid}:`, error);
    stats.erros++;
  }
}
