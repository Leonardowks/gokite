export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      aluguel: {
        Row: {
          cliente_id: string
          condicao_devolucao: string | null
          created_at: string | null
          danos_registrados: string | null
          data_fim: string
          data_inicio: string
          equipamento_id: string
          id: string
          status: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          cliente_id: string
          condicao_devolucao?: string | null
          created_at?: string | null
          danos_registrados?: string | null
          data_fim: string
          data_inicio: string
          equipamento_id: string
          id?: string
          status?: string | null
          updated_at?: string | null
          valor: number
        }
        Update: {
          cliente_id?: string
          condicao_devolucao?: string | null
          created_at?: string | null
          danos_registrados?: string | null
          data_fim?: string
          data_inicio?: string
          equipamento_id?: string
          id?: string
          status?: string | null
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "aluguel_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluguel_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      analise_queue: {
        Row: {
          contato_id: string | null
          created_at: string | null
          erro: string | null
          id: string
          prioridade: number | null
          processed_at: string | null
          status: string | null
          tentativas: number | null
        }
        Insert: {
          contato_id?: string | null
          created_at?: string | null
          erro?: string | null
          id?: string
          prioridade?: number | null
          processed_at?: string | null
          status?: string | null
          tentativas?: number | null
        }
        Update: {
          contato_id?: string | null
          created_at?: string | null
          erro?: string | null
          id?: string
          prioridade?: number | null
          processed_at?: string | null
          status?: string | null
          tentativas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analise_queue_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos_inteligencia"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas: {
        Row: {
          cliente_id: string
          created_at: string | null
          data: string
          hora: string
          id: string
          instrutor: string
          local: string
          pacote_id: string | null
          preco: number
          status: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data: string
          hora: string
          id?: string
          instrutor: string
          local: string
          pacote_id?: string | null
          preco: number
          status?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data?: string
          hora?: string
          id?: string
          instrutor?: string
          local?: string
          pacote_id?: string | null
          preco?: number
          status?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aulas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aulas_pacote_id_fkey"
            columns: ["pacote_id"]
            isOneToOne: false
            referencedRelation: "pacotes"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas_remarketing: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          segmento_filtros: Json
          status: string | null
          template_mensagem: string | null
          total_contatos: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          segmento_filtros?: Json
          status?: string | null
          template_mensagem?: string | null
          total_contatos?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          segmento_filtros?: Json
          status?: string | null
          template_mensagem?: string | null
          total_contatos?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string | null
          data_cadastro: string | null
          email: string
          id: string
          nome: string
          status: string | null
          store_credit: number | null
          tags: string[] | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_cadastro?: string | null
          email: string
          id?: string
          nome: string
          status?: string | null
          store_credit?: number | null
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_cadastro?: string | null
          email?: string
          id?: string
          nome?: string
          status?: string | null
          store_credit?: number | null
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      config_financeiro: {
        Row: {
          created_at: string
          id: string
          meta_mensal: number
          taxa_imposto_padrao: number
          taxa_pix: number
          taxas_cartao: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_mensal?: number
          taxa_imposto_padrao?: number
          taxa_pix?: number
          taxas_cartao?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_mensal?: number
          taxa_imposto_padrao?: number
          taxa_pix?: number
          taxas_cartao?: Json
          updated_at?: string
        }
        Relationships: []
      }
      contas_a_pagar: {
        Row: {
          categoria: string
          centro_de_custo: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          fornecedor: string | null
          frequencia_recorrencia: string | null
          id: string
          notas: string | null
          recorrente: boolean
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string
          centro_de_custo?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          fornecedor?: string | null
          frequencia_recorrencia?: string | null
          id?: string
          notas?: string | null
          recorrente?: boolean
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string
          centro_de_custo?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          fornecedor?: string | null
          frequencia_recorrencia?: string | null
          id?: string
          notas?: string | null
          recorrente?: boolean
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      contatos_inteligencia: {
        Row: {
          business_name: string | null
          campanha_sugerida: string | null
          classificado_em: string | null
          cliente_id: string | null
          conversas_analisadas: number | null
          created_at: string | null
          dados_brutos: Json | null
          dores_identificadas: string[] | null
          email: string | null
          engajamento_score: number | null
          evolution_contact_id: string | null
          gatilhos: string[] | null
          id: string
          interesse_principal: string | null
          is_business: boolean | null
          mensagem_personalizada: string | null
          nome: string | null
          objecoes: string[] | null
          origem: string | null
          prioridade: string | null
          remote_jid: string | null
          resumo_ia: string | null
          score_interesse: number | null
          sentimento_predominante: string | null
          status: string | null
          telefone: string
          tempo_resposta_medio_hrs: number | null
          total_interacoes: number | null
          ultima_mensagem: string | null
          ultimo_contato: string | null
          updated_at: string | null
          whatsapp_profile_name: string | null
          whatsapp_profile_picture: string | null
        }
        Insert: {
          business_name?: string | null
          campanha_sugerida?: string | null
          classificado_em?: string | null
          cliente_id?: string | null
          conversas_analisadas?: number | null
          created_at?: string | null
          dados_brutos?: Json | null
          dores_identificadas?: string[] | null
          email?: string | null
          engajamento_score?: number | null
          evolution_contact_id?: string | null
          gatilhos?: string[] | null
          id?: string
          interesse_principal?: string | null
          is_business?: boolean | null
          mensagem_personalizada?: string | null
          nome?: string | null
          objecoes?: string[] | null
          origem?: string | null
          prioridade?: string | null
          remote_jid?: string | null
          resumo_ia?: string | null
          score_interesse?: number | null
          sentimento_predominante?: string | null
          status?: string | null
          telefone: string
          tempo_resposta_medio_hrs?: number | null
          total_interacoes?: number | null
          ultima_mensagem?: string | null
          ultimo_contato?: string | null
          updated_at?: string | null
          whatsapp_profile_name?: string | null
          whatsapp_profile_picture?: string | null
        }
        Update: {
          business_name?: string | null
          campanha_sugerida?: string | null
          classificado_em?: string | null
          cliente_id?: string | null
          conversas_analisadas?: number | null
          created_at?: string | null
          dados_brutos?: Json | null
          dores_identificadas?: string[] | null
          email?: string | null
          engajamento_score?: number | null
          evolution_contact_id?: string | null
          gatilhos?: string[] | null
          id?: string
          interesse_principal?: string | null
          is_business?: boolean | null
          mensagem_personalizada?: string | null
          nome?: string | null
          objecoes?: string[] | null
          origem?: string | null
          prioridade?: string | null
          remote_jid?: string | null
          resumo_ia?: string | null
          score_interesse?: number | null
          sentimento_predominante?: string | null
          status?: string | null
          telefone?: string
          tempo_resposta_medio_hrs?: number | null
          total_interacoes?: number | null
          ultima_mensagem?: string | null
          ultimo_contato?: string | null
          updated_at?: string | null
          whatsapp_profile_name?: string | null
          whatsapp_profile_picture?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_inteligencia_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas_whatsapp: {
        Row: {
          cliente_id: string | null
          contato_id: string | null
          conteudo: string
          created_at: string | null
          dados_extraidos: Json | null
          data_mensagem: string
          id: string
          instance_name: string | null
          intencao: string | null
          is_from_me: boolean | null
          lida: boolean
          media_mimetype: string | null
          media_url: string | null
          message_id: string | null
          message_status: string | null
          palavras_chave: string[] | null
          push_name: string | null
          quoted_message_id: string | null
          remetente: string
          sentimento: string | null
          telefone: string
          tipo_midia: string | null
        }
        Insert: {
          cliente_id?: string | null
          contato_id?: string | null
          conteudo: string
          created_at?: string | null
          dados_extraidos?: Json | null
          data_mensagem: string
          id?: string
          instance_name?: string | null
          intencao?: string | null
          is_from_me?: boolean | null
          lida?: boolean
          media_mimetype?: string | null
          media_url?: string | null
          message_id?: string | null
          message_status?: string | null
          palavras_chave?: string[] | null
          push_name?: string | null
          quoted_message_id?: string | null
          remetente: string
          sentimento?: string | null
          telefone: string
          tipo_midia?: string | null
        }
        Update: {
          cliente_id?: string | null
          contato_id?: string | null
          conteudo?: string
          created_at?: string | null
          dados_extraidos?: Json | null
          data_mensagem?: string
          id?: string
          instance_name?: string | null
          intencao?: string | null
          is_from_me?: boolean | null
          lida?: boolean
          media_mimetype?: string | null
          media_url?: string | null
          message_id?: string | null
          message_status?: string | null
          palavras_chave?: string[] | null
          push_name?: string | null
          quoted_message_id?: string | null
          remetente?: string
          sentimento?: string | null
          telefone?: string
          tipo_midia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_whatsapp_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_whatsapp_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos_inteligencia"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string | null
          equipamento_id: string | null
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string | null
          equipamento_id?: string | null
          id?: string
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string | null
          equipamento_id?: string | null
          id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          created_at: string | null
          data_proxima_manutencao: string | null
          id: string
          localizacao: string | null
          nome: string
          preco_aluguel_dia: number
          status: string | null
          tamanho: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_proxima_manutencao?: string | null
          id?: string
          localizacao?: string | null
          nome: string
          preco_aluguel_dia: number
          status?: string | null
          tamanho?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_proxima_manutencao?: string | null
          id?: string
          localizacao?: string | null
          nome?: string
          preco_aluguel_dia?: number
          status?: string | null
          tamanho?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      evolution_config: {
        Row: {
          api_key: string
          api_url: string
          created_at: string | null
          eventos_ativos: string[] | null
          id: string
          instance_name: string
          numero_conectado: string | null
          qrcode_base64: string | null
          status: string | null
          total_contatos_sync: number | null
          total_mensagens_sync: number | null
          ultima_sincronizacao: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key: string
          api_url: string
          created_at?: string | null
          eventos_ativos?: string[] | null
          id?: string
          instance_name: string
          numero_conectado?: string | null
          qrcode_base64?: string | null
          status?: string | null
          total_contatos_sync?: number | null
          total_mensagens_sync?: number | null
          ultima_sincronizacao?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string | null
          eventos_ativos?: string[] | null
          id?: string
          instance_name?: string
          numero_conectado?: string | null
          qrcode_base64?: string | null
          status?: string | null
          total_contatos_sync?: number | null
          total_mensagens_sync?: number | null
          ultima_sincronizacao?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      insights_conversas: {
        Row: {
          contato_id: string | null
          created_at: string | null
          dia_preferido: string | null
          gatilhos_compra: string[] | null
          horario_preferido: string | null
          id: string
          mensagens_enviadas: number | null
          mensagens_recebidas: number | null
          objecoes_identificadas: string[] | null
          primeira_interacao: string | null
          principais_interesses: string[] | null
          probabilidade_conversao: number | null
          proxima_acao_sugerida: string | null
          resumo_ia: string | null
          score_engajamento: number | null
          sentimento_geral: string | null
          tempo_medio_resposta_minutos: number | null
          total_mensagens: number | null
          ultima_analise: string | null
          ultima_interacao: string | null
          updated_at: string | null
        }
        Insert: {
          contato_id?: string | null
          created_at?: string | null
          dia_preferido?: string | null
          gatilhos_compra?: string[] | null
          horario_preferido?: string | null
          id?: string
          mensagens_enviadas?: number | null
          mensagens_recebidas?: number | null
          objecoes_identificadas?: string[] | null
          primeira_interacao?: string | null
          principais_interesses?: string[] | null
          probabilidade_conversao?: number | null
          proxima_acao_sugerida?: string | null
          resumo_ia?: string | null
          score_engajamento?: number | null
          sentimento_geral?: string | null
          tempo_medio_resposta_minutos?: number | null
          total_mensagens?: number | null
          ultima_analise?: string | null
          ultima_interacao?: string | null
          updated_at?: string | null
        }
        Update: {
          contato_id?: string | null
          created_at?: string | null
          dia_preferido?: string | null
          gatilhos_compra?: string[] | null
          horario_preferido?: string | null
          id?: string
          mensagens_enviadas?: number | null
          mensagens_recebidas?: number | null
          objecoes_identificadas?: string[] | null
          primeira_interacao?: string | null
          principais_interesses?: string[] | null
          probabilidade_conversao?: number | null
          proxima_acao_sugerida?: string | null
          resumo_ia?: string | null
          score_engajamento?: number | null
          sentimento_geral?: string | null
          tempo_medio_resposta_minutos?: number | null
          total_mensagens?: number | null
          ultima_analise?: string | null
          ultima_interacao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_conversas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "contatos_inteligencia"
            referencedColumns: ["id"]
          },
        ]
      }
      pacotes: {
        Row: {
          cliente_id: string
          created_at: string | null
          data_inicio: string
          data_vencimento: string
          horas_total: number
          horas_usadas: number | null
          id: string
          tipo_pacote: string
          updated_at: string | null
          valor_pago: number
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data_inicio: string
          data_vencimento: string
          horas_total: number
          horas_usadas?: number | null
          id?: string
          tipo_pacote: string
          updated_at?: string | null
          valor_pago: number
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data_inicio?: string
          data_vencimento?: string
          horas_total?: number
          horas_usadas?: number | null
          id?: string
          tipo_pacote?: string
          updated_at?: string | null
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "pacotes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_ecommerce: {
        Row: {
          cliente_id: string
          created_at: string | null
          data_pedido: string | null
          endereco_entrega: string
          id: string
          itens: Json
          status: string | null
          updated_at: string | null
          valor_total: number
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data_pedido?: string | null
          endereco_entrega: string
          id?: string
          itens: Json
          status?: string | null
          updated_at?: string | null
          valor_total: number
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data_pedido?: string | null
          endereco_entrega?: string
          id?: string
          itens?: Json
          status?: string | null
          updated_at?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_ecommerce_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          chats_processados: number | null
          concluido_em: string | null
          contatos_atualizados: number | null
          contatos_criados: number | null
          created_at: string | null
          erro: string | null
          erros: number | null
          id: string
          iniciado_em: string | null
          logs: Json | null
          mensagens_criadas: number | null
          mensagens_puladas: number | null
          progresso_atual: number | null
          progresso_total: number | null
          resultado: Json | null
          status: string
          tipo: string
        }
        Insert: {
          chats_processados?: number | null
          concluido_em?: string | null
          contatos_atualizados?: number | null
          contatos_criados?: number | null
          created_at?: string | null
          erro?: string | null
          erros?: number | null
          id?: string
          iniciado_em?: string | null
          logs?: Json | null
          mensagens_criadas?: number | null
          mensagens_puladas?: number | null
          progresso_atual?: number | null
          progresso_total?: number | null
          resultado?: Json | null
          status?: string
          tipo: string
        }
        Update: {
          chats_processados?: number | null
          concluido_em?: string | null
          contatos_atualizados?: number | null
          contatos_criados?: number | null
          created_at?: string | null
          erro?: string | null
          erros?: number | null
          id?: string
          iniciado_em?: string | null
          logs?: Json | null
          mensagens_criadas?: number | null
          mensagens_puladas?: number | null
          progresso_atual?: number | null
          progresso_total?: number | null
          resultado?: Json | null
          status?: string
          tipo?: string
        }
        Relationships: []
      }
      tax_rules: {
        Row: {
          card_fee_rate: number
          category: string
          created_at: string
          description: string | null
          estimated_tax_rate: number
          icon: string | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          card_fee_rate?: number
          category: string
          created_at?: string
          description?: string | null
          estimated_tax_rate?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          card_fee_rate?: number
          category?: string
          created_at?: string
          description?: string | null
          estimated_tax_rate?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      trade_ins: {
        Row: {
          comprador_id: string | null
          created_at: string
          data_entrada: string
          data_saida: string | null
          descricao: string | null
          equipamento_id_entrada: string | null
          equipamento_recebido: string
          foto_url: string | null
          id: string
          lucro_trade_in: number | null
          notas: string | null
          status: string
          transacao_origem_id: string | null
          updated_at: string
          valor_entrada: number
          valor_saida: number | null
        }
        Insert: {
          comprador_id?: string | null
          created_at?: string
          data_entrada?: string
          data_saida?: string | null
          descricao?: string | null
          equipamento_id_entrada?: string | null
          equipamento_recebido: string
          foto_url?: string | null
          id?: string
          lucro_trade_in?: number | null
          notas?: string | null
          status?: string
          transacao_origem_id?: string | null
          updated_at?: string
          valor_entrada: number
          valor_saida?: number | null
        }
        Update: {
          comprador_id?: string | null
          created_at?: string
          data_entrada?: string
          data_saida?: string | null
          descricao?: string | null
          equipamento_id_entrada?: string | null
          equipamento_recebido?: string
          foto_url?: string | null
          id?: string
          lucro_trade_in?: number | null
          notas?: string | null
          status?: string
          transacao_origem_id?: string | null
          updated_at?: string
          valor_entrada?: number
          valor_saida?: number | null
        }
        Relationships: []
      }
      transacoes: {
        Row: {
          centro_de_custo: string
          cliente_id: string | null
          created_at: string
          custo_produto: number | null
          data_transacao: string
          descricao: string | null
          equipamento_id: string | null
          forma_pagamento: string
          id: string
          imposto_provisionado: number | null
          lucro_liquido: number | null
          origem: string
          parcelas: number | null
          referencia_id: string | null
          taxa_cartao_estimada: number | null
          tipo: string
          updated_at: string
          valor_bruto: number
        }
        Insert: {
          centro_de_custo?: string
          cliente_id?: string | null
          created_at?: string
          custo_produto?: number | null
          data_transacao?: string
          descricao?: string | null
          equipamento_id?: string | null
          forma_pagamento?: string
          id?: string
          imposto_provisionado?: number | null
          lucro_liquido?: number | null
          origem?: string
          parcelas?: number | null
          referencia_id?: string | null
          taxa_cartao_estimada?: number | null
          tipo: string
          updated_at?: string
          valor_bruto: number
        }
        Update: {
          centro_de_custo?: string
          cliente_id?: string | null
          created_at?: string
          custo_produto?: number | null
          data_transacao?: string
          descricao?: string | null
          equipamento_id?: string | null
          forma_pagamento?: string
          id?: string
          imposto_provisionado?: number | null
          lucro_liquido?: number | null
          origem?: string
          parcelas?: number | null
          referencia_id?: string | null
          taxa_cartao_estimada?: number | null
          tipo?: string
          updated_at?: string
          valor_bruto?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
