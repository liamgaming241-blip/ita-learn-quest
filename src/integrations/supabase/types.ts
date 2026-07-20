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
      app_settings: {
        Row: {
          content_root_folder_id: string | null
          google_sheets_id: string | null
          id: boolean
          last_sync_completed_at: string | null
          last_sync_started_at: string | null
          updated_at: string
        }
        Insert: {
          content_root_folder_id?: string | null
          google_sheets_id?: string | null
          id?: boolean
          last_sync_completed_at?: string | null
          last_sync_started_at?: string | null
          updated_at?: string
        }
        Update: {
          content_root_folder_id?: string | null
          google_sheets_id?: string | null
          id?: boolean
          last_sync_completed_at?: string | null
          last_sync_started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      drive_files: {
        Row: {
          created_at: string
          drive_file_id: string
          id: string
          last_seen_at: string
          md5_checksum: string | null
          mime_type: string
          modified_time: string | null
          name: string
          parent_id: string | null
          path: string | null
          size: number | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          drive_file_id: string
          id?: string
          last_seen_at?: string
          md5_checksum?: string | null
          mime_type: string
          modified_time?: string | null
          name: string
          parent_id?: string | null
          path?: string | null
          size?: number | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          drive_file_id?: string
          id?: string
          last_seen_at?: string
          md5_checksum?: string | null
          mime_type?: string
          modified_time?: string | null
          name?: string
          parent_id?: string | null
          path?: string | null
          size?: number | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      file_versions: {
        Row: {
          changed_at: string
          drive_file_id: string
          id: string
          previous_md5: string | null
          previous_modified_time: string | null
          previous_size: number | null
        }
        Insert: {
          changed_at?: string
          drive_file_id: string
          id?: string
          previous_md5?: string | null
          previous_modified_time?: string | null
          previous_size?: number | null
        }
        Update: {
          changed_at?: string
          drive_file_id?: string
          id?: string
          previous_md5?: string | null
          previous_modified_time?: string | null
          previous_size?: number | null
        }
        Relationships: []
      }
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
          drive_file_uuid: string | null
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
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          drive_file_uuid?: string | null
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
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          drive_file_uuid?: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: "lessons_drive_file_uuid_fkey"
            columns: ["drive_file_uuid"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      license_email_aliases: {
        Row: {
          added_by: string | null
          canonical_email: string
          created_at: string
          email: string
          id: string
          license_id: string
        }
        Insert: {
          added_by?: string | null
          canonical_email: string
          created_at?: string
          email: string
          id?: string
          license_id: string
        }
        Update: {
          added_by?: string | null
          canonical_email?: string
          created_at?: string
          email?: string
          id?: string
          license_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_email_aliases_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          affiliate_code: string | null
          canonical_email: string | null
          coupon_code: string | null
          created_at: string
          email: string
          id: string
          kwify_customer_id: string | null
          metadata: Json
          product_code: string | null
          status: Database["public"]["Enums"]["license_status"]
          updated_at: string
        }
        Insert: {
          affiliate_code?: string | null
          canonical_email?: string | null
          coupon_code?: string | null
          created_at?: string
          email: string
          id?: string
          kwify_customer_id?: string | null
          metadata?: Json
          product_code?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          updated_at?: string
        }
        Update: {
          affiliate_code?: string | null
          canonical_email?: string | null
          coupon_code?: string | null
          created_at?: string
          email?: string
          id?: string
          kwify_customer_id?: string | null
          metadata?: Json
          product_code?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          kwify_order_id: string | null
          license_id: string | null
          paid_at: string | null
          payload: Json
          status: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          kwify_order_id?: string | null
          license_id?: string | null
          paid_at?: string | null
          payload?: Json
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          kwify_order_id?: string | null
          license_id?: string | null
          paid_at?: string | null
          payload?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          id: string
          interval: Database["public"]["Enums"]["plan_interval"]
          is_active: boolean
          metadata: Json
          name: string
          price_cents: number
          product_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          interval?: Database["public"]["Enums"]["plan_interval"]
          is_active?: boolean
          metadata?: Json
          name: string
          price_cents?: number
          product_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          interval?: Database["public"]["Enums"]["plan_interval"]
          is_active?: boolean
          metadata?: Json
          name?: string
          price_cents?: number
          product_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      processing_queue: {
        Row: {
          attempts: number
          created_at: string
          drive_file_id: string
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number
          next_run_at: string
          payload: Json
          status: Database["public"]["Enums"]["queue_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          drive_file_id: string
          id?: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          drive_file_id?: string
          id?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          drive_folder_id?: string | null
          folder_path?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          drive_folder_id?: string | null
          folder_path?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          kwify_subscription_id: string | null
          license_id: string
          metadata: Json
          plan_id: string | null
          renewed_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          kwify_subscription_id?: string | null
          license_id: string
          metadata?: Json
          plan_id?: string | null
          renewed_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          kwify_subscription_id?: string | null
          license_id?: string
          metadata?: Json
          plan_id?: string | null
          renewed_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          bullet_points: Json | null
          content: string
          created_at: string
          id: string
          lesson_id: string
        }
        Insert: {
          bullet_points?: Json | null
          content: string
          created_at?: string
          id?: string
          lesson_id: string
        }
        Update: {
          bullet_points?: Json | null
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
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
      sync_logs: {
        Row: {
          context: Json
          created_at: string
          drive_file_id: string | null
          id: string
          level: string
          message: string
          sync_run_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          drive_file_id?: string | null
          id?: string
          level?: string
          message: string
          sync_run_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          drive_file_id?: string | null
          id?: string
          level?: string
          message?: string
          sync_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          errors_count: number
          files_added: number
          files_modified: number
          files_removed: number
          finished_at: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["sync_run_status"]
          summary: Json
          trigger: string
        }
        Insert: {
          errors_count?: number
          files_added?: number
          files_modified?: number
          files_removed?: number
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_run_status"]
          summary?: Json
          trigger?: string
        }
        Update: {
          errors_count?: number
          files_added?: number
          files_modified?: number
          files_removed?: number
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_run_status"]
          summary?: Json
          trigger?: string
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          drive_folder_id?: string | null
          folder_path?: string | null
          id?: string
          name: string
          sort_order?: number | null
          subject_id: string
        }
        Update: {
          created_at?: string
          drive_folder_id?: string | null
          folder_path?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          subject_id?: string
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
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language?: string | null
          lesson_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string | null
          lesson_id?: string
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      admin_add_license_alias: {
        Args: { _email: string; _license_id: string }
        Returns: string
      }
      admin_grant_licenses: {
        Args: { _emails: string[]; _product_code?: string }
        Returns: number
      }
      admin_lookup_access: { Args: { _email: string }; Returns: Json }
      canonical_email: { Args: { _email: string }; Returns: string }
      email_has_active_license: { Args: { _email: string }; Returns: boolean }
      get_my_access: { Args: never; Returns: Json }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_signup_email_to_license: {
        Args: { _purchase_email: string; _signup_email: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "student"
      license_status: "active" | "inactive" | "refunded"
      plan_interval: "monthly" | "annual" | "lifetime"
      queue_status: "pending" | "running" | "succeeded" | "failed" | "canceled"
      subscription_status: "active" | "canceled" | "expired" | "past_due"
      sync_run_status: "running" | "succeeded" | "failed"
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
    Enums: {
      app_role: ["admin", "student"],
      license_status: ["active", "inactive", "refunded"],
      plan_interval: ["monthly", "annual", "lifetime"],
      queue_status: ["pending", "running", "succeeded", "failed", "canceled"],
      subscription_status: ["active", "canceled", "expired", "past_due"],
      sync_run_status: ["running", "succeeded", "failed"],
    },
  },
} as const
