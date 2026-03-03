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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      indexing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          drive_folder_id: string
          drive_folder_url: string | null
          errors: Json | null
          id: string
          log: Json | null
          processed_files: number | null
          started_at: string | null
          status: string
          total_files: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          drive_folder_id: string
          drive_folder_url?: string | null
          errors?: Json | null
          id?: string
          log?: Json | null
          processed_files?: number | null
          started_at?: string | null
          status?: string
          total_files?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          drive_folder_id?: string
          drive_folder_url?: string | null
          errors?: Json | null
          id?: string
          log?: Json | null
          processed_files?: number | null
          started_at?: string | null
          status?: string
          total_files?: number | null
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          created_at: string
          drive_file_id: string | null
          duration_seconds: number | null
          file_path: string | null
          file_size: number | null
          file_type: string
          file_url: string | null
          id: string
          indexed_at: string
          processing_error: string | null
          processing_status: string
          title: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          duration_seconds?: number | null
          file_path?: string | null
          file_size?: number | null
          file_type: string
          file_url?: string | null
          id?: string
          indexed_at?: string
          processing_error?: string | null
          processing_status?: string
          title: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          duration_seconds?: number | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string | null
          id?: string
          indexed_at?: string
          processing_error?: string | null
          processing_status?: string
          title?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_option: string
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          lesson_id: string | null
          options: Json
          question_text: string
          subject_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          correct_option: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          lesson_id?: string | null
          options: Json
          question_text: string
          subject_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          correct_option?: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          lesson_id?: string | null
          options?: Json
          question_text?: string
          subject_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          answers: Json | null
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          id: string
          question_ids: Json
          score: number | null
          started_at: string | null
          status: string | null
          time_limit_minutes: number | null
          time_spent_seconds: number | null
          title: string
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          question_ids?: Json
          score?: number | null
          started_at?: string | null
          status?: string | null
          time_limit_minutes?: number | null
          time_spent_seconds?: number | null
          title: string
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          question_ids?: Json
          score?: number | null
          started_at?: string | null
          status?: string | null
          time_limit_minutes?: number | null
          time_spent_seconds?: number | null
          title?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          drive_folder_id: string | null
          folder_path: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          drive_folder_id?: string | null
          folder_path?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          drive_folder_id?: string | null
          folder_path?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      summaries: {
        Row: {
          bullet_points: Json | null
          content: string
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          bullet_points?: Json | null
          content: string
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          bullet_points?: Json | null
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          drive_folder_id: string | null
          folder_path: string | null
          id: string
          name: string
          sort_order: number | null
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drive_folder_id?: string | null
          folder_path?: string | null
          id?: string
          name: string
          sort_order?: number | null
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          drive_folder_id?: string | null
          folder_path?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string | null
          lesson_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language?: string | null
          lesson_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string | null
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed: boolean | null
          created_at: string
          id: string
          last_accessed_at: string | null
          lesson_id: string | null
          subject_id: string | null
          time_spent_seconds: number | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string | null
          subject_id?: string | null
          time_spent_seconds?: number | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string | null
          subject_id?: string | null
          time_spent_seconds?: number | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      weak_topics: {
        Row: {
          accuracy_rate: number | null
          created_at: string
          id: string
          incorrect_attempts: number | null
          last_calculated_at: string | null
          severity: string | null
          subject_id: string
          topic_id: string
          total_attempts: number | null
          user_id: string
        }
        Insert: {
          accuracy_rate?: number | null
          created_at?: string
          id?: string
          incorrect_attempts?: number | null
          last_calculated_at?: string | null
          severity?: string | null
          subject_id: string
          topic_id: string
          total_attempts?: number | null
          user_id: string
        }
        Update: {
          accuracy_rate?: number | null
          created_at?: string
          id?: string
          incorrect_attempts?: number | null
          last_calculated_at?: string | null
          severity?: string | null
          subject_id?: string
          topic_id?: string
          total_attempts?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weak_topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weak_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
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
