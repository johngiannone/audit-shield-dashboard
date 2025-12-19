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
      affiliates: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          referral_code: string
          stripe_connect_id: string | null
          total_earnings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          referral_code: string
          stripe_connect_id?: string | null
          total_earnings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          referral_code?: string
          stripe_connect_id?: string | null
          total_earnings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_model_config: {
        Row: {
          created_at: string
          description: string | null
          fallback_model_id: string | null
          id: string
          is_active: boolean
          max_tokens: number | null
          model_id: string
          provider: string
          task_name: string
          temperature: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fallback_model_id?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model_id: string
          provider?: string
          task_name: string
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fallback_model_id?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          model_id?: string
          provider?: string
          task_name?: string
          temperature?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          estimated_cost: number | null
          id: string
          input_tokens: number | null
          metadata: Json | null
          model_id: string
          output_tokens: number | null
          profile_id: string | null
          resource_id: string | null
          resource_type: string | null
          task_name: string
          total_tokens: number | null
        }
        Insert: {
          created_at?: string
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_id: string
          output_tokens?: number | null
          profile_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          task_name: string
          total_tokens?: number | null
        }
        Update: {
          created_at?: string
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_id?: string
          output_tokens?: number | null
          profile_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          task_name?: string
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_plans: {
        Row: {
          covered_years: number[]
          created_at: string
          id: string
          plan_level: string
          profile_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tax_year: number
          updated_at: string
        }
        Insert: {
          covered_years?: number[]
          created_at?: string
          id?: string
          plan_level?: string
          profile_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tax_year: number
          updated_at?: string
        }
        Update: {
          covered_years?: number[]
          created_at?: string
          id?: string
          plan_level?: string
          profile_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tax_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_plans_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_scan_jobs: {
        Row: {
          created_at: string
          detected_issues: Json | null
          error_message: string | null
          extracted_data: Json | null
          file_path: string
          id: string
          original_filename: string
          processed_at: string | null
          profile_id: string
          risk_score: number | null
          status: string
        }
        Insert: {
          created_at?: string
          detected_issues?: Json | null
          error_message?: string | null
          extracted_data?: Json | null
          file_path: string
          id?: string
          original_filename: string
          processed_at?: string | null
          profile_id: string
          risk_score?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          detected_issues?: Json | null
          error_message?: string | null
          extracted_data?: Json | null
          file_path?: string
          id?: string
          original_filename?: string
          processed_at?: string | null
          profile_id?: string
          risk_score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_scan_jobs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_documents: {
        Row: {
          case_id: string
          created_at: string
          document_type: string | null
          file_name: string
          file_path: string
          id: string
          uploaded_by: string
        }
        Insert: {
          case_id: string
          created_at?: string
          document_type?: string | null
          file_name: string
          file_path: string
          id?: string
          uploaded_by: string
        }
        Update: {
          case_id?: string
          created_at?: string
          document_type?: string | null
          file_name?: string
          file_path?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_messages: {
        Row: {
          case_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          agent_id: string
          case_id: string
          created_at: string
          id: string
          note: string
        }
        Insert: {
          agent_id: string
          case_id: string
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          agent_id?: string
          case_id?: string
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_status_history: {
        Row: {
          case_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
        }
        Insert: {
          case_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
        }
        Update: {
          case_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_status_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          assigned_agent_id: string | null
          client_id: string
          created_at: string
          file_path: string | null
          id: string
          notice_agency: string
          notice_type: string
          response_due_date: string | null
          status: string
          summary: string | null
          tax_return_path: string | null
          tax_year: number
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          client_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          notice_agency: string
          notice_type: string
          response_due_date?: string | null
          status?: string
          summary?: string | null
          tax_return_path?: string | null
          tax_year: number
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          client_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          notice_agency?: string
          notice_type?: string
          response_due_date?: string | null
          status?: string
          summary?: string | null
          tax_return_path?: string | null
          tax_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_activation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          profile_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          profile_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          profile_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_activation_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_activation_codes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          document_name: string
          file_url: string | null
          fulfilled_at: string | null
          id: string
          rejection_reason: string | null
          requested_by: string
          status: string
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          document_name: string
          file_url?: string | null
          fulfilled_at?: string | null
          id?: string
          rejection_reason?: string | null
          requested_by: string
          status?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          document_name?: string
          file_url?: string | null
          fulfilled_at?: string | null
          id?: string
          rejection_reason?: string | null
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_risk_factors: {
        Row: {
          audit_rate_per_1000: number
          created_at: string
          id: string
          state_code: string
          state_name: string
        }
        Insert: {
          audit_rate_per_1000: number
          created_at?: string
          id?: string
          state_code: string
          state_name: string
        }
        Update: {
          audit_rate_per_1000?: number
          created_at?: string
          id?: string
          state_code?: string
          state_name?: string
        }
        Relationships: []
      }
      industry_benchmarks: {
        Row: {
          avg_cogs_percentage: number | null
          avg_profit_margin: number
          created_at: string
          high_risk_expense_categories: string[] | null
          id: string
          industry_name: string
          naics_code: string
        }
        Insert: {
          avg_cogs_percentage?: number | null
          avg_profit_margin: number
          created_at?: string
          high_risk_expense_categories?: string[] | null
          id?: string
          industry_name: string
          naics_code: string
        }
        Update: {
          avg_cogs_percentage?: number | null
          avg_profit_margin?: number
          created_at?: string
          high_risk_expense_categories?: string[] | null
          id?: string
          industry_name?: string
          naics_code?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          target_role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          target_role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          target_role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      irs_benchmarks: {
        Row: {
          avg_charitable_deduction: number
          avg_medical_expense: number | null
          avg_mortgage_interest: number | null
          created_at: string
          id: string
          income_range_max: number | null
          income_range_min: number
          tax_year: number
        }
        Insert: {
          avg_charitable_deduction: number
          avg_medical_expense?: number | null
          avg_mortgage_interest?: number | null
          created_at?: string
          id?: string
          income_range_max?: number | null
          income_range_min: number
          tax_year: number
        }
        Update: {
          avg_charitable_deduction?: number
          avg_medical_expense?: number | null
          avg_mortgage_interest?: number | null
          created_at?: string
          id?: string
          income_range_max?: number | null
          income_range_min?: number
          tax_year?: number
        }
        Relationships: []
      }
      irs_transaction_codes: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string
          explanation: string | null
          id: string
          recommended_action: string | null
          severity: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description: string
          explanation?: string | null
          id?: string
          recommended_action?: string | null
          severity?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string
          explanation?: string | null
          id?: string
          recommended_action?: string | null
          severity?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      occupation_wages: {
        Row: {
          avg_annual_wage: number
          created_at: string
          id: string
          job_title_keyword: string
        }
        Insert: {
          avg_annual_wage: number
          created_at?: string
          id?: string
          job_title_keyword: string
        }
        Update: {
          avg_annual_wage?: number
          created_at?: string
          id?: string
          job_title_keyword?: string
        }
        Relationships: []
      }
      onboarding_steps: {
        Row: {
          action_url: string
          created_at: string
          id: string
          is_completed: boolean
          profile_id: string
          step_name: string
          updated_at: string
        }
        Insert: {
          action_url: string
          created_at?: string
          id?: string
          is_completed?: boolean
          profile_id: string
          step_name: string
          updated_at?: string
        }
        Update: {
          action_url?: string
          created_at?: string
          id?: string
          is_completed?: boolean
          profile_id?: string
          step_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leads: {
        Row: {
          annual_returns: string
          contact_person: string
          created_at: string
          email: string
          firm_name: string
          id: string
          status: string
          tax_software: string
        }
        Insert: {
          annual_returns: string
          contact_person: string
          created_at?: string
          email: string
          firm_name: string
          id?: string
          status?: string
          tax_software: string
        }
        Update: {
          annual_returns?: string
          contact_person?: string
          created_at?: string
          email?: string
          firm_name?: string
          id?: string
          status?: string
          tax_software?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          affiliate_status: string | null
          avatar_url: string | null
          brand_firm_name: string | null
          brand_logo_url: string | null
          brand_primary_color: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          managed_by: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          affiliate_status?: string | null
          avatar_url?: string | null
          brand_firm_name?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          managed_by?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          affiliate_status?: string | null
          avatar_url?: string | null
          brand_firm_name?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          managed_by?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_managed_by_fkey"
            columns: ["managed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_visits: {
        Row: {
          converted: boolean
          created_at: string
          id: string
          referral_code: string
          visitor_ip_hash: string
        }
        Insert: {
          converted?: boolean
          created_at?: string
          id?: string
          referral_code: string
          visitor_ip_hash: string
        }
        Update: {
          converted?: boolean
          created_at?: string
          id?: string
          referral_code?: string
          visitor_ip_hash?: string
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          analyzed_at: string
          created_at: string
          id: string
          profile_id: string
          red_flags: Json | null
          risk_score: number
        }
        Insert: {
          analyzed_at?: string
          created_at?: string
          id?: string
          profile_id: string
          red_flags?: Json | null
          risk_score: number
        }
        Update: {
          analyzed_at?: string
          created_at?: string
          id?: string
          profile_id?: string
          red_flags?: Json | null
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      valid_charities: {
        Row: {
          city: string | null
          created_at: string
          ein: string | null
          id: string
          organization_name: string
          state: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          ein?: string | null
          id?: string
          organization_name: string
          state?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          ein?: string | null
          id?: string
          organization_name?: string
          state?: string | null
        }
        Relationships: []
      }
      zip_code_economics: {
        Row: {
          created_at: string
          id: string
          median_household_income: number
          zip_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          median_household_income: number
          zip_code: string
        }
        Update: {
          created_at?: string
          id?: string
          median_household_income?: number
          zip_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_client_activation_code: { Args: never; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_activated: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "client"
        | "agent"
        | "enrolled_agent"
        | "tax_preparer"
        | "super_admin"
      notification_type: "info" | "warning" | "success"
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
      app_role: [
        "client",
        "agent",
        "enrolled_agent",
        "tax_preparer",
        "super_admin",
      ],
      notification_type: ["info", "warning", "success"],
    },
  },
} as const
