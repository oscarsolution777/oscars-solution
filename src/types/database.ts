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
      appointment_items: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          price_cents: number
          service_id: string
          staff_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          price_cents?: number
          service_id: string
          staff_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          price_cents?: number
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          client_id: string
          created_at: string
          id: string
          notes: string | null
          request_id: string | null
          salon_id: string
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          appointment_date: string
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          request_id?: string | null
          salon_id: string
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          request_id?: string | null
          salon_id?: string
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_closures: {
        Row: {
          closed_at: string
          closed_by: string | null
          closure_date: string
          counted_cash_cents: number
          created_at: string
          difference_cents: number
          expected_cash_cents: number
          id: string
          notes: string | null
          opening_cash_cents: number
          salon_id: string
          updated_at: string
        }
        Insert: {
          closed_at?: string
          closed_by?: string | null
          closure_date: string
          counted_cash_cents?: number
          created_at?: string
          difference_cents?: number
          expected_cash_cents?: number
          id?: string
          notes?: string | null
          opening_cash_cents?: number
          salon_id: string
          updated_at?: string
        }
        Update: {
          closed_at?: string
          closed_by?: string | null
          closure_date?: string
          counted_cash_cents?: number
          created_at?: string
          difference_cents?: number
          expected_cash_cents?: number
          id?: string
          notes?: string | null
          opening_cash_cents?: number
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_closures_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          first_visit_at: string | null
          full_name: string
          id: string
          is_active: boolean
          last_visit_at: string | null
          notes: string | null
          phone: string
          preferences: Json
          salon_id: string
          total_spent_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_visit_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          last_visit_at?: string | null
          notes?: string | null
          phone: string
          preferences?: Json
          salon_id: string
          total_spent_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_visit_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_visit_at?: string | null
          notes?: string | null
          phone?: string
          preferences?: Json
          salon_id?: string
          total_spent_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_cents: number
          category: string
          created_at: string
          description: string | null
          id: string
          salon_id: string
          spent_at: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          salon_id: string
          spent_at?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          salon_id?: string
          spent_at?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: string
          salon_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role: string
          salon_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          salon_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          appointment_id: string | null
          client_id: string
          created_at: string
          id: string
          method: string
          paid_at: string
          reference: string | null
          salon_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          appointment_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          method: string
          paid_at?: string
          reference?: string | null
          salon_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          method?: string
          paid_at?: string
          reference?: string | null
          salon_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          cost_cents: number
          created_at: string
          id: string
          is_active: boolean
          min_stock: number
          name: string
          price_cents: number
          salon_id: string
          sku: string | null
          stock_qty: number
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          cost_cents?: number
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          price_cents?: number
          salon_id: string
          sku?: string | null
          stock_qty?: number
          supplier_id?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          cost_cents?: number
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          price_cents?: number
          salon_id?: string
          sku?: string | null
          stock_qty?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      request_items: {
        Row: {
          created_at: string
          id: string
          price_cents_snapshot: number
          request_id: string
          service_id: string
          service_name_snapshot: string
          staff_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          price_cents_snapshot?: number
          request_id: string
          service_id: string
          service_name_snapshot?: string
          staff_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          price_cents_snapshot?: number
          request_id?: string
          service_id?: string
          service_name_snapshot?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          id: string
          preferred_date: string | null
          public_code: string
          salon_id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          id?: string
          preferred_date?: string | null
          public_code?: string
          salon_id: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          id?: string
          preferred_date?: string | null
          public_code?: string
          salon_id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          default_locale: string
          demo_expires_at: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          subscription_status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency: string
          default_locale?: string
          demo_expires_at?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          subscription_status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          default_locale?: string
          demo_expires_at?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          subscription_status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salons_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          salon_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          salon_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          salon_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      service_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          qty: number
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          qty: number
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          qty?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_products_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_staff: {
        Row: {
          created_at: string
          id: string
          service_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_id: string
          staff_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_staff_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          duration_min: number
          features: string[]
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_cents: number
          salon_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          duration_min: number
          features?: string[]
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_cents?: number
          salon_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          duration_min?: number
          features?: string[]
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_cents?: number
          salon_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          base_salary_cents: number
          created_at: string
          full_name: string
          hired_at: string
          id: string
          is_active: boolean
          phone: string | null
          role_title: string
          salon_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_salary_cents?: number
          created_at?: string
          full_name: string
          hired_at?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role_title: string
          salon_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_salary_cents?: number
          created_at?: string
          full_name?: string
          hired_at?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role_title?: string
          salon_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payouts: {
        Row: {
          base_cents: number
          bonus_cents: number
          created_at: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          salon_id: string
          staff_id: string
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          base_cents?: number
          bonus_cents?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          salon_id: string
          staff_id: string
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          base_cents?: number
          bonus_cents?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          salon_id?: string
          staff_id?: string
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payouts_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payouts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          qty: number
          reason: string | null
          salon_id: string
          type: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          qty: number
          reason?: string | null
          salon_id: string
          type: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          qty?: number
          reason?: string | null
          salon_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_prices: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          is_active: boolean
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          id?: string
          is_active?: boolean
          price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_prices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          salon_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          salon_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_salon_ids: { Args: never; Returns: string[] }
      has_role_in_salon: {
        Args: { allowed_roles: string[]; target_salon_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
