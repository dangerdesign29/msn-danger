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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      contatos: {
        Row: {
          apelido: string | null
          contato_id: string
          criado_em: string
          id: string
          usuario_id: string
        }
        Insert: {
          apelido?: string | null
          contato_id: string
          criado_em?: string
          id?: string
          usuario_id: string
        }
        Update: {
          apelido?: string | null
          contato_id?: string
          criado_em?: string
          id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      grupo_membros: {
        Row: {
          entrou_em: string
          grupo_id: string
          id: string
          usuario_id: string
        }
        Insert: {
          entrou_em?: string
          grupo_id: string
          id?: string
          usuario_id: string
        }
        Update: {
          entrou_em?: string
          grupo_id?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_membros_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          avatar_url: string | null
          criado_em: string
          descricao: string | null
          dono_id: string
          id: string
          nome: string
        }
        Insert: {
          avatar_url?: string | null
          criado_em?: string
          descricao?: string | null
          dono_id: string
          id?: string
          nome: string
        }
        Update: {
          avatar_url?: string | null
          criado_em?: string
          descricao?: string | null
          dono_id?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          anexo_nome: string | null
          anexo_tamanho: number | null
          anexo_tipo: string | null
          anexo_url: string | null
          destinatario_id: string | null
          entregue_em: string | null
          enviada_em: string
          grupo_id: string | null
          id: string
          lida: boolean
          lida_em: string | null
          mensagem: string
          remetente_id: string
          tipo: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_tamanho?: number | null
          anexo_tipo?: string | null
          anexo_url?: string | null
          destinatario_id?: string | null
          entregue_em?: string | null
          enviada_em?: string
          grupo_id?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          mensagem: string
          remetente_id: string
          tipo?: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_tamanho?: number | null
          anexo_tipo?: string | null
          anexo_url?: string | null
          destinatario_id?: string | null
          entregue_em?: string | null
          enviada_em?: string
          grupo_id?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          mensagem?: string
          remetente_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          avatar_url: string | null
          criado_em: string
          email: string
          id: string
          musica: string | null
          nome: string
          status: string
          tema: Json | null
        }
        Insert: {
          avatar_url?: string | null
          criado_em?: string
          email: string
          id: string
          musica?: string | null
          nome?: string
          status?: string
          tema?: Json | null
        }
        Update: {
          avatar_url?: string | null
          criado_em?: string
          email?: string
          id?: string
          musica?: string | null
          nome?: string
          status?: string
          tema?: Json | null
        }
        Relationships: []
      }
      push_assinaturas: {
        Row: {
          atualizado_em: string
          auth: string
          criado_em: string
          endpoint: string
          id: string
          p256dh: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          auth: string
          criado_em?: string
          endpoint: string
          id?: string
          p256dh: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          auth?: string
          criado_em?: string
          endpoint?: string
          id?: string
          p256dh?: string
          usuario_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adicionar_contato: { Args: { _email: string }; Returns: string }
      adicionar_contato_id: { Args: { _alvo: string }; Returns: string }
      adicionar_membro: {
        Args: { _grupo: string; _usuario: string }
        Returns: string
      }
      buscar_usuarios: {
        Args: { _termo: string }
        Returns: {
          avatar_url: string
          email: string
          id: string
          ja_contato: boolean
          nome: string
          status: string
        }[]
      }
      compartilha_grupo: { Args: { _outro: string }; Returns: boolean }
      criar_grupo: {
        Args: { _membros: string[]; _nome: string }
        Returns: string
      }
      eh_meu_contato: { Args: { _outro: string }; Returns: boolean }
      membros_grupo: {
        Args: { _grupo: string }
        Returns: {
          avatar_url: string
          email: string
          id: string
          nome: string
          status: string
        }[]
      }
      sair_grupo: { Args: { _grupo: string }; Returns: string }
      sou_membro: { Args: { _grupo: string }; Returns: boolean }
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
