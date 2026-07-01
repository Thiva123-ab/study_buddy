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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          extracted_text: string
          id: string
          is_favorite: boolean
          source_type: string
          storage_path: string | null
          tags: string[]
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text: string
          id?: string
          is_favorite?: boolean
          source_type: string
          storage_path?: string | null
          tags?: string[]
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string
          id?: string
          is_favorite?: boolean
          source_type?: string
          storage_path?: string | null
          tags?: string[]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back_en: string
          back_si: string | null
          created_at: string
          document_id: string
          front_en: string
          front_si: string | null
          id: string
          position: number
          user_id: string
        }
        Insert: {
          back_en: string
          back_si?: string | null
          created_at?: string
          document_id: string
          front_en: string
          front_si?: string | null
          id?: string
          position?: number
          user_id: string
        }
        Update: {
          back_en?: string
          back_si?: string | null
          created_at?: string
          document_id?: string
          front_en?: string
          front_si?: string | null
          id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_questions: {
        Row: {
          blanks: Json | null
          correct_index: number | null
          created_at: string
          id: string
          marks: number
          model_answer: string | null
          options: Json | null
          paper_id: string
          position: number
          question: string
          type: string
          user_id: string
        }
        Insert: {
          blanks?: Json | null
          correct_index?: number | null
          created_at?: string
          id?: string
          marks?: number
          model_answer?: string | null
          options?: Json | null
          paper_id: string
          position?: number
          question: string
          type: string
          user_id: string
        }
        Update: {
          blanks?: Json | null
          correct_index?: number | null
          created_at?: string
          id?: string
          marks?: number
          model_answer?: string | null
          options?: Json | null
          paper_id?: string
          position?: number
          question?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_questions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      papers: {
        Row: {
          created_at: string
          document_id: string | null
          duration_minutes: number
          id: string
          source_document_ids: string[]
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          duration_minutes?: number
          id?: string
          source_document_ids?: string[]
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          duration_minutes?: number
          id?: string
          source_document_ids?: string[]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "papers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          accuracy: number
          created_at: string
          document_id: string
          id: string
          score: number
          total: number
          user_id: string
          wrong_question_ids: Json
        }
        Insert: {
          accuracy: number
          created_at?: string
          document_id: string
          id?: string
          score: number
          total: number
          user_id: string
          wrong_question_ids?: Json
        }
        Update: {
          accuracy?: number
          created_at?: string
          document_id?: string
          id?: string
          score?: number
          total?: number
          user_id?: string
          wrong_question_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          document_id: string
          explanation_en: string | null
          explanation_si: string | null
          id: string
          options_en: Json
          options_si: Json | null
          position: number
          question_en: string
          question_si: string | null
          user_id: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          document_id: string
          explanation_en?: string | null
          explanation_si?: string | null
          id?: string
          options_en: Json
          options_si?: Json | null
          position?: number
          question_en: string
          question_si?: string | null
          user_id: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          document_id?: string
          explanation_en?: string | null
          explanation_si?: string | null
          id?: string
          options_en?: Json
          options_si?: Json | null
          position?: number
          question_en?: string
          question_si?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          content_en: string
          content_si: string | null
          created_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          content_en: string
          content_si?: string | null
          created_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          content_en?: string
          content_si?: string | null
          created_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
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
