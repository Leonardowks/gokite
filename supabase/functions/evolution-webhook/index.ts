// 🛑 🛑 🛑 ARQUIVO CRÍTICO - ZONA DE PERIGO 🛑 🛑 🛑
//
// ESTE ARQUIVO É O CORAÇÃO DA INTEGRAÇÃO COM WHATSAPP (V3).
// ELE ESTÁ FUNCIONANDO PERFEITAMENTE PARA ENTRADA E SAÍDA DE MENSAGENS.
//
// REGRA 1: NÃO FAÇA REFACTORING NESTE ARQUIVO.
// REGRA 2: NÃO ADICIONE LÓGICAS DE NEGÓCIO AQUI (Use Database Triggers).
// REGRA 3: SE PRECISAR MUDAR ALGO, PEÇA PERMISSÃO EXPLÍCITA AO USUÁRIO.
//
// ---------------------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('>>> PAYLOAD RECEBIDO:', JSON.stringify(body))

    // 1. SANITIZAÇÃO DO PAYLOAD (EVOLUTION V2)
    // A Evolution pode mandar o dado direto ou dentro de 'data'
    const payload = body.data || body
    const eventType = body.event || payload.event
    
    // Se for evento de conexão, apenas loga e ignora (não quebra o fluxo)
    if (eventType === 'CONNECTION_UPDATE') {
        console.log('>>> Status Conexão:', payload.statusReason || payload.status || payload.state)
        
        // Atualizar status no banco
        const state = payload.state || payload.status
        if (state === 'open') {
          await supabase
            .from('evolution_config')
            .update({ status: 'conectado', qrcode_base64: null, updated_at: new Date().toISOString() })
            .eq('instance_name', body.instance || body.instanceName || 'gokite_v3')
        }
        
        return new Response('ok', { headers: corsHeaders })
    }

    // PRESENCE_UPDATE: Broadcast de "digitando..." via Realtime
    if (eventType === 'PRESENCE_UPDATE') {
        const presenceData = payload.data || payload
        const remoteJid = presenceData.id || presenceData.remoteJid
        const presence = presenceData.presence || presenceData.status // 'composing', 'recording', 'available', 'unavailable'
        
        console.log('>>> PRESENCE_UPDATE:', { remoteJid, presence })
        
        if (remoteJid && !remoteJid.includes('@g.us') && !remoteJid.includes('@broadcast')) {
            const phone = remoteJid.replace(/@.+/, '')
            
            // Broadcast via Realtime channel (não salva no banco)
            await supabase.channel('typing-status')
                .send({
                    type: 'broadcast',
                    event: 'presence',
                    payload: {
                        phone,
                        remoteJid,
                        presence, // 'composing' | 'recording' | 'available' | 'unavailable'
                        timestamp: new Date().toISOString()
                    }
                })
        }
        
        return new Response('Presence broadcasted', { headers: corsHeaders })
    }

    // 2. DETECÇÃO DE MENSAGEM (Qualquer tipo)
    // Procura a mensagem dentro da estrutura complexa da Evolution
    // Suporte para MESSAGES_UPSERT e SEND_MESSAGE (estruturas diferentes)
    const msgData = payload.data || payload
    
    // SEND_MESSAGE vem com key diretamente no data, MESSAGES_UPSERT vem mais aninhado
    const key = msgData.key || payload.key || {}
    const messageContent = msgData.message || payload.message || {}
    
    // Se não tiver remoteJid, não é mensagem válida
    if (!key.remoteJid) {
        console.log('>>> Ignorado: Sem remoteJid')
        return new Response('Ignorado: Sem remoteJid', { headers: corsHeaders })
    }
    
    // Ignorar grupos e broadcasts
    if (key.remoteJid.includes('@g.us') || key.remoteJid.includes('@broadcast')) {
        console.log('>>> Ignorado: Grupo ou Broadcast')
        return new Response('Ignorado: Grupo', { headers: corsHeaders })
    }

    // 3. EXTRAÇÃO DE DADOS CRÍTICOS
    const remoteJid = key.remoteJid
    const isFromMe = key.fromMe === true
    const pushName = msgData.pushName || (isFromMe ? 'Eu (Suporte)' : 'Cliente Sem Nome')
    
    // Limpeza do Telefone (Remove @s.whatsapp.net e @lid)
    const phone = remoteJid.replace(/@.+/, '')

    // Extração do Texto (Tenta todos os campos possíveis)
    let text = ''
    let tipoMidia = 'texto'
    if (messageContent.conversation) {
        text = messageContent.conversation
    } else if (messageContent.extendedTextMessage?.text) {
        text = messageContent.extendedTextMessage.text
    } else if (messageContent.imageMessage?.caption) {
        text = messageContent.imageMessage.caption || '📷 Imagem'
        tipoMidia = 'imagem'
    } else if (messageContent.imageMessage) {
        text = '📷 Imagem'
        tipoMidia = 'imagem'
    } else if (messageContent.audioMessage) {
        text = '🎤 Áudio'
        tipoMidia = 'audio'
    } else if (messageContent.videoMessage) {
        text = '🎬 Vídeo'
        tipoMidia = 'video'
    } else if (messageContent.documentMessage) {
        text = '📄 ' + (messageContent.documentMessage.fileName || 'Documento')
        tipoMidia = 'documento'
    } else if (messageContent.stickerMessage) {
        text = '🎭 Sticker'
        tipoMidia = 'sticker'
    } else {
        text = '📎 [Mídia/Outros]'
        tipoMidia = 'outro'
    }

    console.log(`>>> PROCESSANDO: De: ${phone} | FromMe: ${isFromMe} | Texto: ${text}`)

    // 4. PASSO OBRIGATÓRIO: CRIAR/ATUALIZAR CONTATO
    // Se não criarmos o contato ANTES, a mensagem falha por Foreign Key
    // IMPORTANTE: Usar messageTimestamp do WhatsApp, NÃO new Date() do servidor
    const messageTimestamp = msgData.messageTimestamp || Math.floor(Date.now() / 1000)
    const messageDate = new Date(messageTimestamp * 1000).toISOString()
    
    const contactData = {
        telefone: phone,
        nome: (!pushName.match(/^\d+$/) && pushName.length > 1) ? pushName : `Contato ${phone.slice(-4)}`,
        whatsapp_profile_name: (!pushName.match(/^\d+$/) && pushName.length > 1) ? pushName : null,
        ultima_mensagem: messageDate,
        remote_jid: remoteJid,
        origem: 'evolution',
        status: 'nao_classificado',
    }

    // Upsert na tabela contatos_inteligencia
    const { data: contact, error: contactError } = await supabase
        .from('contatos_inteligencia')
        .upsert(contactData, { onConflict: 'telefone' })
        .select()
        .single()

    if (contactError) {
        console.error('>>> ERRO AO CRIAR CONTATO:', JSON.stringify(contactError))
        // Tentar buscar contato existente
        const { data: existingContact } = await supabase
            .from('contatos_inteligencia')
            .select('id')
            .eq('telefone', phone)
            .single()
        
        if (!existingContact) {
            throw contactError
        }
        
        // Usar contato existente
        const contactId = existingContact.id
        
        // Salvar mensagem com contato existente
        const messageInsert = {
            contato_id: contactId,
            telefone: phone,
            conteudo: text,
            remetente: isFromMe ? 'suporte' : 'cliente',
            is_from_me: isFromMe,
            data_mensagem: new Date( (msgData.messageTimestamp || Date.now()/1000) * 1000 ).toISOString(),
            tipo_midia: tipoMidia,
            message_id: key.id,
            push_name: pushName,
            lida: isFromMe,
        }

        const { error: msgError } = await supabase
            .from('conversas_whatsapp')
            .insert(messageInsert)

        if (msgError && !msgError.message?.includes('unique')) {
            console.error('>>> ERRO AO SALVAR MENSAGEM:', JSON.stringify(msgError))
        } else {
            console.log('>>> Mensagem salva com contato existente!')
        }
        
        return new Response('Mensagem Processada (contato existente)', { headers: corsHeaders })
    }

    console.log('>>> Contato criado/atualizado:', contact.id)

    // 5. SALVAR A MENSAGEM
    const messageInsert = {
        contato_id: contact.id,
        telefone: phone,
        conteudo: text,
        remetente: isFromMe ? 'suporte' : 'cliente',
        is_from_me: isFromMe,
        data_mensagem: new Date( (msgData.messageTimestamp || Date.now()/1000) * 1000 ).toISOString(),
        tipo_midia: tipoMidia,
        message_id: key.id,
        push_name: pushName,
        lida: isFromMe,
    }

    const { error: msgError } = await supabase
        .from('conversas_whatsapp')
        .insert(messageInsert)

    if (msgError) {
        // Ignora erro de duplicidade (mensagem já salva)
        if (!msgError.message?.includes('unique')) {
            console.error('>>> ERRO AO SALVAR MENSAGEM:', JSON.stringify(msgError))
        } else {
            console.log('>>> Mensagem duplicada, ignorando')
        }
    } else {
        console.log('>>> Mensagem salva com sucesso!')
    }

    return new Response('Mensagem Processada', { headers: corsHeaders })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('>>> ERRO FATAL:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), { 
        status: 200, // Retornar 200 para Evolution não retentar
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
