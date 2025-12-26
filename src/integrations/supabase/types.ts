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
      clientes: {
        Row: {
          created_at: string | null
          data_cadastro: string | null
          email: string
          id: string
          nome: string
          status: string | null
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
          taxa_cartao_credito: number
          taxa_cartao_debito: number
          taxa_imposto_padrao: number
          taxa_pix: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_mensal?: number
          taxa_cartao_credito?: number
          taxa_cartao_debito?: number
          taxa_imposto_padrao?: number
          taxa_pix?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_mensal?: number
          taxa_cartao_credito?: number
          taxa_cartao_debito?: number
          taxa_imposto_padrao?: number
          taxa_pix?: number
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
      trade_ins: {
        Row: {
          comprador_id: string | null
          created_at: string
          data_entrada: string
          data_saida: string | null
          descricao: string | null
          equipamento_id_entrada: string | null
          equipamento_recebido: string
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
