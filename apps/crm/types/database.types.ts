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
      appointments: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string
          date: string
          id: string
          notes: string | null
          phone: string | null
          time: string | null
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          date: string
          id?: string
          notes?: string | null
          phone?: string | null
          time?: string | null
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          date?: string
          id?: string
          notes?: string | null
          phone?: string | null
          time?: string | null
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          category: Database["public"]["Enums"]["article_category"]
          created_at: string | null
          default_purchase_price: number
          default_sale_price: number
          description: string | null
          id: string
          in_stock: boolean | null
          is_active: boolean | null
          manufacturer: string | null
          model_number: string | null
          name: string
          search_vector: unknown
          sku: string
          specifications: Json | null
          stock_quantity: number | null
          supplier_id: string | null
          tax_rate: Database["public"]["Enums"]["tax_rate"]
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["article_category"]
          created_at?: string | null
          default_purchase_price: number
          default_sale_price: number
          description?: string | null
          id?: string
          in_stock?: boolean | null
          is_active?: boolean | null
          manufacturer?: string | null
          model_number?: string | null
          name: string
          search_vector?: unknown
          sku: string
          specifications?: Json | null
          stock_quantity?: number | null
          supplier_id?: string | null
          tax_rate?: Database["public"]["Enums"]["tax_rate"]
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["article_category"]
          created_at?: string | null
          default_purchase_price?: number
          default_sale_price?: number
          description?: string | null
          id?: string
          in_stock?: boolean | null
          is_active?: boolean | null
          manufacturer?: string | null
          model_number?: string | null
          name?: string
          search_vector?: unknown
          sku?: string
          specifications?: Json | null
          stock_quantity?: number | null
          supplier_id?: string | null
          tax_rate?: Database["public"]["Enums"]["tax_rate"]
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          company_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          request_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          request_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          request_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_holder: string
          bank_name: string
          bic: string | null
          company_id: string | null
          created_at: string | null
          iban: string
          id: string
          is_default: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_holder: string
          bank_name: string
          bic?: string | null
          company_id?: string | null
          created_at?: string | null
          iban: string
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_holder?: string
          bank_name?: string
          bic?: string | null
          company_id?: string | null
          created_at?: string | null
          iban?: string
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          id: string
          company_id: string
          name: string
          email: string | null
          order_email: string | null
          phone: string | null
          contact_person: string | null
          contact_person_internal: string | null
          contact_person_internal_phone: string | null
          contact_person_internal_email: string | null
          contact_person_external: string | null
          contact_person_external_phone: string | null
          contact_person_external_email: string | null
          address: string | null
          street: string | null
          house_number: string | null
          postal_code: string | null
          city: string | null
          country: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          email?: string | null
          order_email?: string | null
          phone?: string | null
          contact_person?: string | null
          contact_person_internal?: string | null
          contact_person_internal_phone?: string | null
          contact_person_internal_email?: string | null
          contact_person_external?: string | null
          contact_person_external_phone?: string | null
          contact_person_external_email?: string | null
          address?: string | null
          street?: string | null
          house_number?: string | null
          postal_code?: string | null
          city?: string | null
          country?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          email?: string | null
          order_email?: string | null
          phone?: string | null
          contact_person?: string | null
          contact_person_internal?: string | null
          contact_person_internal_phone?: string | null
          contact_person_internal_email?: string | null
          contact_person_external?: string | null
          contact_person_external_phone?: string | null
          contact_person_external_email?: string | null
          address?: string | null
          street?: string | null
          house_number?: string | null
          postal_code?: string | null
          city?: string | null
          country?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          id: string
          user_id: string
          project_id: string
          supplier_id: string
          order_number: string
          status: string
          delivery_calendar_week: string | null
          installation_reference_date: string | null
          created_by_type: string
          approved_by_user_id: string | null
          approved_at: string | null
          sent_to_email: string | null
          sent_at: string | null
          booked_at: string | null
          idempotency_key: string | null
          template_version: string
          template_snapshot: Json | null
          ab_number: string | null
          ab_confirmed_delivery_date: string | null
          ab_deviations: Json
          ab_received_at: string | null
          supplier_delivery_note_id: string | null
          goods_receipt_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          supplier_id: string
          order_number: string
          status?: string
          delivery_calendar_week?: string | null
          installation_reference_date?: string | null
          created_by_type?: string
          approved_by_user_id?: string | null
          approved_at?: string | null
          sent_to_email?: string | null
          sent_at?: string | null
          booked_at?: string | null
          idempotency_key?: string | null
          template_version?: string
          template_snapshot?: Json | null
          ab_number?: string | null
          ab_confirmed_delivery_date?: string | null
          ab_deviations?: Json
          ab_received_at?: string | null
          supplier_delivery_note_id?: string | null
          goods_receipt_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          supplier_id?: string
          order_number?: string
          status?: string
          delivery_calendar_week?: string | null
          installation_reference_date?: string | null
          created_by_type?: string
          approved_by_user_id?: string | null
          approved_at?: string | null
          sent_to_email?: string | null
          sent_at?: string | null
          booked_at?: string | null
          idempotency_key?: string | null
          template_version?: string
          template_snapshot?: Json | null
          ab_number?: string | null
          ab_confirmed_delivery_date?: string | null
          ab_deviations?: Json
          ab_received_at?: string | null
          supplier_delivery_note_id?: string | null
          goods_receipt_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_delivery_note_id_fkey"
            columns: ["supplier_delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_order_items: {
        Row: {
          id: string
          supplier_order_id: string
          invoice_item_id: string | null
          article_id: string | null
          position_number: number
          description: string
          model_number: string | null
          manufacturer: string | null
          quantity: number
          quantity_confirmed: number | null
          unit: string
          expected_delivery_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_order_id: string
          invoice_item_id?: string | null
          article_id?: string | null
          position_number?: number
          description: string
          model_number?: string | null
          manufacturer?: string | null
          quantity: number
          quantity_confirmed?: number | null
          unit?: string
          expected_delivery_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_order_id?: string
          invoice_item_id?: string | null
          article_id?: string | null
          position_number?: number
          description?: string
          model_number?: string | null
          manufacturer?: string | null
          quantity?: number
          quantity_confirmed?: number | null
          unit?: string
          expected_delivery_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_order_items_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_items_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_order_dispatch_logs: {
        Row: {
          id: string
          supplier_order_id: string
          user_id: string
          sent_by_type: string
          to_email: string
          cc_emails: string[]
          subject: string
          template_version: string
          payload: Json
          message_id: string | null
          idempotency_key: string | null
          sent_at: string
          created_at: string
        }
        Insert: {
          id?: string
          supplier_order_id: string
          user_id: string
          sent_by_type?: string
          to_email: string
          cc_emails?: string[]
          subject: string
          template_version?: string
          payload?: Json
          message_id?: string | null
          idempotency_key?: string | null
          sent_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          supplier_order_id?: string
          user_id?: string
          sent_by_type?: string
          to_email?: string
          cc_emails?: string[]
          subject?: string
          template_version?: string
          payload?: Json
          message_id?: string | null
          idempotency_key?: string | null
          sent_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_order_dispatch_logs_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_dispatch_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          id: string
          user_id: string
          bank_account_id: string | null
          transaction_date: string
          amount: number
          reference: string | null
          counterparty_name: string | null
          counterparty_iban: string | null
          supplier_invoice_id: string | null
          invoice_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bank_account_id?: string | null
          transaction_date: string
          amount: number
          reference?: string | null
          counterparty_name?: string | null
          counterparty_iban?: string | null
          supplier_invoice_id?: string | null
          invoice_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bank_account_id?: string | null
          transaction_date?: string
          amount?: number
          reference?: string | null
          counterparty_name?: string | null
          counterparty_iban?: string | null
          supplier_invoice_id?: string | null
          invoice_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          function_calls: Json | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          function_calls?: Json | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          function_calls?: Json | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["company_role_new"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["company_role_new"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["company_role_new"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          agb_text: string | null
          city: string | null
          company_name: string
          company_register_number: string | null
          country: string | null
          court: string | null
          created_at: string | null
          default_payment_terms: number | null
          default_tax_rate: number | null
          display_name: string | null
          email: string | null
          fax: string | null
          house_number: string | null
          id: string
          invoice_footer_text: string | null
          invoice_prefix: string | null
          legal_form: string | null
          logo_base64: string | null
          logo_url: string | null
          next_invoice_number: number | null
          next_order_number: number | null
          next_delivery_note_number: number | null
          offer_prefix: string | null
          order_prefix: string | null
          delivery_note_prefix: string | null
          order_footer_templates: Json | null
          payment_terms_options: Json | null
          phone: string | null
          postal_code: string | null
          street: string | null
          tax_number: string | null
          uid: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          agb_text?: string | null
          city?: string | null
          company_name: string
          company_register_number?: string | null
          country?: string | null
          court?: string | null
          created_at?: string | null
          default_payment_terms?: number | null
          default_tax_rate?: number | null
          display_name?: string | null
          email?: string | null
          fax?: string | null
          house_number?: string | null
          id?: string
          invoice_footer_text?: string | null
          invoice_prefix?: string | null
          legal_form?: string | null
          logo_base64?: string | null
          logo_url?: string | null
          next_invoice_number?: number | null
          next_order_number?: number | null
          next_delivery_note_number?: number | null
          offer_prefix?: string | null
          order_prefix?: string | null
          delivery_note_prefix?: string | null
          order_footer_templates?: Json | null
          payment_terms_options?: Json | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          tax_number?: string | null
          uid?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          agb_text?: string | null
          city?: string | null
          company_name?: string
          company_register_number?: string | null
          country?: string | null
          court?: string | null
          created_at?: string | null
          default_payment_terms?: number | null
          default_tax_rate?: number | null
          display_name?: string | null
          email?: string | null
          fax?: string | null
          house_number?: string | null
          id?: string
          invoice_footer_text?: string | null
          invoice_prefix?: string | null
          legal_form?: string | null
          logo_base64?: string | null
          logo_url?: string | null
          next_invoice_number?: number | null
          next_order_number?: number | null
          next_delivery_note_number?: number | null
          offer_prefix?: string | null
          order_prefix?: string | null
          delivery_note_prefix?: string | null
          order_footer_templates?: Json | null
          payment_terms_options?: Json | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          tax_number?: string | null
          uid?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      complaints: {
        Row: {
          ab_confirmed_at: string | null
          ab_document_url: string | null
          affected_item_ids: string[] | null
          company_id: string
          complaint_order_number: string | null
          created_at: string | null
          created_by_user_id: string | null
          customer_notes: string | null
          delivered_at: string | null
          delivery_note_id: string | null
          description: string
          email_content: string | null
          email_sent_at: string | null
          id: string
          installation_appointment_id: string | null
          installed_at: string | null
          internal_notes: string | null
          original_order_number: string | null
          priority: string
          project_id: string | null
          reported_at: string | null
          resolution_notes: string | null
          resolved_at: string | null
          source_ticket_id: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          supplier_id: string | null
          supplier_name: string | null
          supplier_notes: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ab_confirmed_at?: string | null
          ab_document_url?: string | null
          affected_item_ids?: string[] | null
          company_id: string
          complaint_order_number?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_note_id?: string | null
          description: string
          email_content?: string | null
          email_sent_at?: string | null
          id?: string
          installation_appointment_id?: string | null
          installed_at?: string | null
          internal_notes?: string | null
          original_order_number?: string | null
          priority?: string
          project_id?: string | null
          reported_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          source_ticket_id?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ab_confirmed_at?: string | null
          ab_document_url?: string | null
          affected_item_ids?: string[] | null
          company_id?: string
          complaint_order_number?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_note_id?: string | null
          description?: string
          email_content?: string | null
          email_sent_at?: string | null
          id?: string
          installation_appointment_id?: string | null
          installed_at?: string | null
          internal_notes?: string | null
          original_order_number?: string | null
          priority?: string
          project_id?: string | null
          reported_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          source_ticket_id?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_installation_appointment_id_fkey"
            columns: ["installation_appointment_id"]
            isOneToOne: false
            referencedRelation: "planning_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_source_ticket_id_fkey"
            columns: ["source_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_delivery_notes: {
        Row: {
          created_at: string | null
          customer_signature: string | null
          customer_signature_date: string | null
          delivery_address: string | null
          delivery_date: string
          delivery_note_number: string
          id: string
          items: Json | null
          notes: string | null
          project_id: string
          signed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_signature?: string | null
          customer_signature_date?: string | null
          delivery_address?: string | null
          delivery_date: string
          delivery_note_number: string
          id?: string
          items?: Json | null
          notes?: string | null
          project_id: string
          signed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_signature?: string | null
          customer_signature_date?: string | null
          delivery_address?: string | null
          delivery_date?: string
          delivery_note_number?: string
          id?: string
          items?: Json | null
          notes?: string | null
          project_id?: string
          signed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_delivery_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          alternative_email: string | null
          city: string
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string
          first_name: string
          house_number: string | null
          id: string
          last_name: string
          mobile: string | null
          notes: string | null
          payment_terms: number | null
          phone: string
          postal_code: string
          salutation: Database["public"]["Enums"]["salutation_type"] | null
          search_vector: unknown
          street: string
          tax_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alternative_email?: string | null
          city: string
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          first_name: string
          house_number?: string | null
          id?: string
          last_name: string
          mobile?: string | null
          notes?: string | null
          payment_terms?: number | null
          phone: string
          postal_code: string
          salutation?: Database["public"]["Enums"]["salutation_type"] | null
          search_vector?: unknown
          street: string
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alternative_email?: string | null
          city?: string
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          house_number?: string | null
          id?: string
          last_name?: string
          mobile?: string | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string
          postal_code?: string
          salutation?: Database["public"]["Enums"]["salutation_type"] | null
          search_vector?: unknown
          street?: string
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      delivery_note_items: {
        Row: {
          ai_confidence: number | null
          ai_matched: boolean | null
          created_at: string | null
          delivery_note_id: string
          description: string
          id: string
          manufacturer: string | null
          matched_project_item_id: string | null
          model_number: string | null
          notes: string | null
          position_number: number | null
          quantity_ordered: number
          quantity_received: number
          status: string
          unit: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_matched?: boolean | null
          created_at?: string | null
          delivery_note_id: string
          description: string
          id?: string
          manufacturer?: string | null
          matched_project_item_id?: string | null
          model_number?: string | null
          notes?: string | null
          position_number?: number | null
          quantity_ordered: number
          quantity_received: number
          status?: string
          unit?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_matched?: boolean | null
          created_at?: string | null
          delivery_note_id?: string
          description?: string
          id?: string
          manufacturer?: string | null
          matched_project_item_id?: string | null
          model_number?: string | null
          notes?: string | null
          position_number?: number | null
          quantity_ordered?: number
          quantity_received?: number
          status?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_items_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_items_matched_project_item_id_fkey"
            columns: ["matched_project_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          ai_confidence: number | null
          ai_matched: boolean | null
          created_at: string | null
          delivery_date: string
          document_url: string | null
          id: string
          matched_at: string | null
          matched_by_user_id: string | null
          matched_project_id: string | null
          notes: string | null
          raw_text: string | null
          received_date: string | null
          status: string
          supplier_order_id: string | null
          supplier_delivery_note_number: string
          supplier_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_matched?: boolean | null
          created_at?: string | null
          delivery_date: string
          document_url?: string | null
          id?: string
          matched_at?: string | null
          matched_by_user_id?: string | null
          matched_project_id?: string | null
          notes?: string | null
          raw_text?: string | null
          received_date?: string | null
          status?: string
          supplier_order_id?: string | null
          supplier_delivery_note_number: string
          supplier_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_matched?: boolean | null
          created_at?: string | null
          delivery_date?: string
          document_url?: string | null
          id?: string
          matched_at?: string | null
          matched_by_user_id?: string | null
          matched_project_id?: string | null
          notes?: string | null
          raw_text?: string | null
          received_date?: string | null
          status?: string
          supplier_order_id?: string | null
          supplier_delivery_note_number?: string
          supplier_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_matched_project_id_fkey"
            columns: ["matched_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          file_path: string
          file_size: number | null
          id: string
          mime_type: string
          name: string
          project_id: string | null
          type: Database["public"]["Enums"]["document_type"] | null
          uploaded_at: string | null
          uploaded_by: string | null
          user_id: string | null
        }
        Insert: {
          file_path: string
          file_size?: number | null
          id?: string
          mime_type: string
          name: string
          project_id?: string | null
          type?: Database["public"]["Enums"]["document_type"] | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          user_id?: string | null
        }
        Update: {
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string
          name?: string
          project_id?: string | null
          type?: Database["public"]["Enums"]["document_type"] | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          commission_rate: number | null
          company_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["company_role_new"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          commission_rate?: number | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          notes?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["company_role_new"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          commission_rate?: number | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["company_role_new"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_items: {
        Row: {
          created_at: string | null
          delivery_note_item_id: string | null
          goods_receipt_id: string
          id: string
          notes: string | null
          project_item_id: string
          quantity_expected: number
          quantity_received: number
          status: string
        }
        Insert: {
          created_at?: string | null
          delivery_note_item_id?: string | null
          goods_receipt_id: string
          id?: string
          notes?: string | null
          project_item_id: string
          quantity_expected: number
          quantity_received: number
          status?: string
        }
        Update: {
          created_at?: string | null
          delivery_note_item_id?: string | null
          goods_receipt_id?: string
          id?: string
          notes?: string | null
          project_item_id?: string
          quantity_expected?: number
          quantity_received?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_items_delivery_note_item_id_fkey"
            columns: ["delivery_note_item_id"]
            isOneToOne: false
            referencedRelation: "delivery_note_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_project_item_id_fkey"
            columns: ["project_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          created_at: string | null
          delivery_note_id: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          project_id: string
          receipt_date: string | null
          receipt_type: string
          status: string
          supplier_order_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_note_id?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          project_id: string
          receipt_date?: string | null
          receipt_type: string
          status?: string
          supplier_order_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_note_id?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          project_id?: string
          receipt_date?: string | null
          receipt_type?: string
          status?: string
          supplier_order_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          actual_delivery_date: string | null
          appliance_category: string | null
          article_id: string | null
          created_at: string | null
          delivery_status: string | null
          description: string
          expected_delivery_date: string | null
          gross_price_per_unit: number | null
          gross_total: number
          id: string
          installation_date: string | null
          manufacturer: string | null
          manufacturer_support_email: string | null
          manufacturer_support_phone: string | null
          manufacturer_support_url: string | null
          model_number: string | null
          net_total: number
          position: number
          price_per_unit: number
          project_id: string | null
          purchase_price_per_unit: number | null
          quantity: number
          quantity_delivered: number | null
          quantity_ordered: number | null
          serial_number: string | null
          show_in_portal: boolean | null
          specifications: Json | null
          tax_amount: number
          tax_rate: string
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at: string | null
          warranty_until: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          appliance_category?: string | null
          article_id?: string | null
          created_at?: string | null
          delivery_status?: string | null
          description: string
          expected_delivery_date?: string | null
          gross_price_per_unit?: number | null
          gross_total: number
          id?: string
          installation_date?: string | null
          manufacturer?: string | null
          manufacturer_support_email?: string | null
          manufacturer_support_phone?: string | null
          manufacturer_support_url?: string | null
          model_number?: string | null
          net_total: number
          position: number
          price_per_unit: number
          project_id?: string | null
          purchase_price_per_unit?: number | null
          quantity: number
          quantity_delivered?: number | null
          quantity_ordered?: number | null
          serial_number?: string | null
          show_in_portal?: boolean | null
          specifications?: Json | null
          tax_amount: number
          tax_rate?: string
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string | null
          warranty_until?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          appliance_category?: string | null
          article_id?: string | null
          created_at?: string | null
          delivery_status?: string | null
          description?: string
          expected_delivery_date?: string | null
          gross_price_per_unit?: number | null
          gross_total?: number
          id?: string
          installation_date?: string | null
          manufacturer?: string | null
          manufacturer_support_email?: string | null
          manufacturer_support_phone?: string | null
          manufacturer_support_url?: string | null
          model_number?: string | null
          net_total?: number
          position?: number
          price_per_unit?: number
          project_id?: string | null
          purchase_price_per_unit?: number | null
          quantity?: number
          quantity_delivered?: number | null
          quantity_ordered?: number | null
          serial_number?: string | null
          show_in_portal?: boolean | null
          specifications?: Json | null
          tax_amount?: number
          tax_rate?: string
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string | null
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          is_paid: boolean | null
          net_amount: number | null
          notes: string | null
          paid_date: string | null
          project_id: string
          reminders: Json | null
          schedule_type: string | null
          tax_amount: number | null
          tax_rate: number | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          is_paid?: boolean | null
          net_amount?: number | null
          notes?: string | null
          paid_date?: string | null
          project_id: string
          reminders?: Json | null
          schedule_type?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_paid?: boolean | null
          net_amount?: number | null
          notes?: string | null
          paid_date?: string | null
          project_id?: string
          reminders?: Json | null
          schedule_type?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      order_sign_tokens: {
        Row: {
          id: string
          project_id: string
          token: string
          expires_at: string
          created_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          token: string
          expires_at: string
          created_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          token?: string
          expires_at?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_sign_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          agb_snapshot: string | null
          confirmed_at: string | null
          created_at: string | null
          footer_text: string | null
          id: string
          order_date: string | null
          order_number: string
          project_id: string
          sent_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agb_snapshot?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          footer_text?: string | null
          id?: string
          order_date?: string | null
          order_number: string
          project_id: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agb_snapshot?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          footer_text?: string | null
          id?: string
          order_date?: string | null
          order_number?: string
          project_id?: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      order_sign_audit: {
        Row: {
          id: string
          project_id: string
          signed_at: string
          signed_by: string
          ip_address: string | null
          user_agent: string | null
          geodata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          signed_at: string
          signed_by: string
          ip_address?: string | null
          user_agent?: string | null
          geodata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          signed_at?: string
          signed_by?: string
          ip_address?: string | null
          user_agent?: string | null
          geodata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_sign_audit_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invites: {
        Row: {
          company_id: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["company_role_new"] | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["company_role_new"] | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["company_role_new"] | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description: string | null
          label: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          label: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      planning_appointments: {
        Row: {
          assigned_user_id: string | null
          company_id: string
          created_at: string | null
          customer_id: string | null
          customer_name: string
          date: string
          id: string
          notes: string | null
          phone: string | null
          project_id: string | null
          time: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_user_id?: string | null
          company_id: string
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          date: string
          id?: string
          notes?: string | null
          phone?: string | null
          project_id?: string | null
          time?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_user_id?: string | null
          company_id?: string
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          date?: string
          id?: string
          notes?: string | null
          phone?: string | null
          project_id?: string | null
          time?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_appointments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminder_log: {
        Row: {
          id: string
          appointment_id: string
          reminder_type: string
          sent_at: string | null
        }
        Insert: {
          id?: string
          appointment_id: string
          reminder_type: string
          sent_at?: string | null
        }
        Update: {
          id?: string
          appointment_id?: string
          reminder_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminder_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "planning_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhooks: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payload: Json | null
          processed_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payload?: Json | null
          processed_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json | null
          processed_at?: string
        }
        Relationships: []
      }
      project_appliances: {
        Row: {
          article_id: string | null
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          installation_date: string | null
          manufacturer: string
          manufacturer_support_email: string | null
          manufacturer_support_phone: string | null
          manufacturer_support_url: string | null
          model: string
          notes: string | null
          project_id: string
          purchase_date: string | null
          serial_number: string | null
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          article_id?: string | null
          category: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          installation_date?: string | null
          manufacturer: string
          manufacturer_support_email?: string | null
          manufacturer_support_phone?: string | null
          manufacturer_support_url?: string | null
          model: string
          notes?: string | null
          project_id: string
          purchase_date?: string | null
          serial_number?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          article_id?: string | null
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          installation_date?: string | null
          manufacturer?: string
          manufacturer_support_email?: string | null
          manufacturer_support_phone?: string | null
          manufacturer_support_url?: string | null
          model?: string
          notes?: string | null
          project_id?: string
          purchase_date?: string | null
          serial_number?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_appliances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_appliances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          access_code: string | null
          all_items_delivered: boolean | null
          assigned_employee_id: string | null
          complaints: Json | null
          completion_date: string | null
          contract_number: string | null
          created_at: string | null
          customer_address: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_signature: string | null
          customer_signature_date: string | null
          deleted_at: string | null
          delivery_date: string | null
          delivery_note_number: string | null
          delivery_status: string | null
          delivery_time: string | null
          delivery_type: string | null
          deposit_amount: number | null
          documents: Json | null
          final_invoice: Json | null
          id: string
          installation_date: string | null
          installation_time: string | null
          invoice_number: string | null
          is_completed: boolean | null
          is_delivered: boolean | null
          is_deposit_paid: boolean | null
          is_final_paid: boolean | null
          is_installation_assigned: boolean | null
          is_measured: boolean | null
          is_ordered: boolean | null
          measurement_date: string | null
          measurement_time: string | null
          net_amount: number | null
          notes: string | null
          offer_date: string | null
          offer_number: string | null
          order_date: string | null
          order_footer_text: string | null
          order_number: string
          order_contract_signed_at: string | null
          order_contract_signed_by: string | null
          partial_payments: Json | null
          payment_schedule: Json | null
          ready_for_assembly_date: string | null
          salesperson_id: string | null
          salesperson_name: string | null
          second_payment_created: boolean | null
          status: Database["public"]["Enums"]["project_status"]
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_code?: string | null
          all_items_delivered?: boolean | null
          assigned_employee_id?: string | null
          complaints?: Json | null
          completion_date?: string | null
          contract_number?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_signature?: string | null
          customer_signature_date?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          delivery_note_number?: string | null
          delivery_status?: string | null
          delivery_time?: string | null
          delivery_type?: string | null
          deposit_amount?: number | null
          documents?: Json | null
          final_invoice?: Json | null
          id?: string
          installation_date?: string | null
          installation_time?: string | null
          invoice_number?: string | null
          is_completed?: boolean | null
          is_delivered?: boolean | null
          is_deposit_paid?: boolean | null
          is_final_paid?: boolean | null
          is_installation_assigned?: boolean | null
          is_measured?: boolean | null
          is_ordered?: boolean | null
          measurement_date?: string | null
          measurement_time?: string | null
          net_amount?: number | null
          notes?: string | null
          offer_date?: string | null
          offer_number?: string | null
          order_date?: string | null
          order_footer_text?: string | null
          order_number: string
          order_contract_signed_at?: string | null
          order_contract_signed_by?: string | null
          partial_payments?: Json | null
          payment_schedule?: Json | null
          ready_for_assembly_date?: string | null
          salesperson_id?: string | null
          salesperson_name?: string | null
          second_payment_created?: boolean | null
          status?: Database["public"]["Enums"]["project_status"]
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_code?: string | null
          all_items_delivered?: boolean | null
          assigned_employee_id?: string | null
          complaints?: Json | null
          completion_date?: string | null
          contract_number?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_signature?: string | null
          customer_signature_date?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          delivery_note_number?: string | null
          delivery_status?: string | null
          delivery_time?: string | null
          delivery_type?: string | null
          deposit_amount?: number | null
          documents?: Json | null
          final_invoice?: Json | null
          id?: string
          installation_date?: string | null
          installation_time?: string | null
          invoice_number?: string | null
          is_completed?: boolean | null
          is_delivered?: boolean | null
          is_deposit_paid?: boolean | null
          is_final_paid?: boolean | null
          is_installation_assigned?: boolean | null
          is_measured?: boolean | null
          is_ordered?: boolean | null
          measurement_date?: string | null
          measurement_time?: string | null
          net_amount?: number | null
          notes?: string | null
          offer_date?: string | null
          offer_number?: string | null
          order_date?: string | null
          order_footer_text?: string | null
          order_number?: string
          order_contract_signed_at?: string | null
          order_contract_signed_by?: string | null
          partial_payments?: Json | null
          payment_schedule?: Json | null
          ready_for_assembly_date?: string | null
          salesperson_id?: string | null
          salesperson_name?: string | null
          second_payment_created?: boolean | null
          status?: Database["public"]["Enums"]["project_status"]
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean
          company_id: string
          created_at: string | null
          id: string
          permission_code: string
          role: string
          updated_at: string | null
        }
        Insert: {
          allowed?: boolean
          company_id: string
          created_at?: string | null
          id?: string
          permission_code: string
          role: string
          updated_at?: string | null
        }
        Update: {
          allowed?: boolean
          company_id?: string
          created_at?: string | null
          id?: string
          permission_code?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
      }
      supplier_invoice_custom_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoice_custom_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          category: string
          cost_center: string | null
          created_at: string | null
          datev_account: string | null
          document_name: string | null
          document_url: string | null
          due_date: string | null
          gross_amount: number
          id: string
          invoice_date: string
          invoice_number: string
          is_paid: boolean | null
          net_amount: number
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          project_id: string | null
          supplier_address: string | null
          supplier_name: string
          supplier_uid: string | null
          tax_amount: number
          tax_rate: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string
          cost_center?: string | null
          created_at?: string | null
          datev_account?: string | null
          document_name?: string | null
          document_url?: string | null
          due_date?: string | null
          gross_amount: number
          id?: string
          invoice_date: string
          invoice_number: string
          is_paid?: boolean | null
          net_amount: number
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          project_id?: string | null
          supplier_address?: string | null
          supplier_name: string
          supplier_uid?: string | null
          tax_amount: number
          tax_rate?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          cost_center?: string | null
          created_at?: string | null
          datev_account?: string | null
          document_name?: string | null
          document_url?: string | null
          due_date?: string | null
          gross_amount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_paid?: boolean | null
          net_amount?: number
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          project_id?: string | null
          supplier_address?: string | null
          supplier_name?: string
          supplier_uid?: string | null
          tax_amount?: number
          tax_rate?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          author_id: string | null
          author_type: string | null
          created_at: string
          employee_id: string | null
          file_url: string | null
          id: string
          is_customer: boolean
          message: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          author_type?: string | null
          created_at?: string
          employee_id?: string | null
          file_url?: string | null
          id?: string
          is_customer?: boolean
          message: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          author_type?: string | null
          created_at?: string
          employee_id?: string | null
          file_url?: string | null
          id?: string
          is_customer?: boolean
          message?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          project_id: string
          status: string
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          status?: string
          subject: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          status?: string
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          allowed: boolean
          company_id: string
          created_at: string | null
          id: string
          permission_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed?: boolean
          company_id: string
          created_at?: string | null
          id?: string
          permission_code: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed?: boolean
          company_id?: string
          created_at?: string | null
          id?: string
          permission_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_existing_user_to_company: {
        Args: { p_company_id: string; p_role: string; p_user_id: string }
        Returns: undefined
      }
      admin_get_role: { Args: { p_user_id: string }; Returns: string }
      admin_is_geschaeftsfuehrer: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      can_manage_users: { Args: never; Returns: boolean }
      create_pending_invite: {
        Args: {
          p_company_id: string
          p_email: string
          p_invited_by: string
          p_role: string
        }
        Returns: string
      }
      current_company_id: { Args: never; Returns: string }
      delete_pending_invite: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      get_audit_logs: {
        Args: {
          p_action?: string
          p_end_date?: string
          p_entity_id?: string
          p_entity_type?: string
          p_limit?: number
          p_offset?: number
          p_start_date?: string
        }
        Returns: {
          action: string
          changes: Json
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string
          metadata: Json
          request_id: string
          user_agent: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_company_members: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: string
          user_id: string
        }[]
      }
      get_current_company_id: { Args: never; Returns: string }
      get_current_role: { Args: never; Returns: string }
      get_effective_permissions: {
        Args: never
        Returns: {
          allowed: boolean
          permission_code: string
        }[]
      }
      get_my_company_ids: { Args: never; Returns: string[] }
      get_pending_invites_for_company: {
        Args: never
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_name: string
          role: string
        }[]
      }
      has_permission: { Args: { p_permission_code: string }; Returns: boolean }
      is_current_user_geschaeftsfuehrer: { Args: never; Returns: boolean }
      is_user_company_member: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_changes?: Json
          p_entity_id?: string
          p_entity_type: string
          p_ip_address?: string
          p_metadata?: Json
          p_request_id?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      process_pending_invite: {
        Args: { p_email: string; p_user_id: string }
        Returns: boolean
      }
      remove_member: { Args: { p_member_id: string }; Returns: undefined }
      seed_default_permissions: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      seed_role_permissions_for_company: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      update_member_role: {
        Args: { p_is_active: boolean; p_member_id: string; p_role: string }
        Returns: undefined
      }
      upsert_role_permission: {
        Args: {
          p_allowed: boolean
          p_company_id: string
          p_permission_code: string
          p_role: string
        }
        Returns: undefined
      }
      write_audit_log: {
        Args: {
          actor_id: string
          details: Json
          event_type: string
          resource: string
        }
        Returns: undefined
      }
    }
    Enums: {
      appointment_type:
        | "Consultation"
        | "FirstMeeting"
        | "Measurement"
        | "Installation"
      article_category:
        | "Kitchen"
        | "Appliance"
        | "Accessory"
        | "Service"
        | "Material"
        | "Other"
      company_role_new:
        | "geschaeftsfuehrer"
        | "administration"
        | "buchhaltung"
        | "verkaeufer"
        | "monteur"
      complaint_status:
        | "Open"
        | "Resolved"
        | "draft"
        | "reported"
        | "ab_confirmed"
        | "delivered"
        | "installed"
        | "resolved"
      document_type:
        | "Invoice"
        | "Order"
        | "Offer"
        | "Contract"
        | "Other"
        | "PLANE"
        | "INSTALLATIONSPLANE"
        | "KAUFVERTRAG"
        | "RECHNUNGEN"
        | "LIEFERSCHEINE"
        | "AUSMESSBERICHT"
        | "KUNDEN_DOKUMENT"
      project_status:
        | "Lead"
        | "Planung"
        | "Aufmaß"
        | "Bestellt"
        | "Lieferung"
        | "Montage"
        | "Abgeschlossen"
        | "Reklamation"
      salutation_type: "Herr" | "Frau" | "Firma"
      tax_rate: "10" | "13" | "20"
      unit_type: "Stk" | "Pkg" | "Std" | "Paush" | "m" | "m²" | "lfm"
      user_role: "admin" | "manager" | "employee" | "viewer"
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
      appointment_type: [
        "Consultation",
        "FirstMeeting",
        "Measurement",
        "Installation",
      ],
      article_category: [
        "Kitchen",
        "Appliance",
        "Accessory",
        "Service",
        "Material",
        "Other",
      ],
      company_role_new: [
        "geschaeftsfuehrer",
        "administration",
        "buchhaltung",
        "verkaeufer",
        "monteur",
      ],
      complaint_status: [
        "Open",
        "Resolved",
        "draft",
        "reported",
        "ab_confirmed",
        "delivered",
        "installed",
        "resolved",
      ],
      document_type: [
        "Invoice",
        "Order",
        "Offer",
        "Contract",
        "Other",
        "PLANE",
        "INSTALLATIONSPLANE",
        "KAUFVERTRAG",
        "RECHNUNGEN",
        "LIEFERSCHEINE",
        "AUSMESSBERICHT",
        "KUNDEN_DOKUMENT",
      ],
      project_status: [
        "Lead",
        "Planung",
        "Aufmaß",
        "Bestellt",
        "Lieferung",
        "Montage",
        "Abgeschlossen",
        "Reklamation",
      ],
      salutation_type: ["Herr", "Frau", "Firma"],
      tax_rate: ["10", "13", "20"],
      unit_type: ["Stk", "Pkg", "Std", "Paush", "m", "m²", "lfm"],
      user_role: ["admin", "manager", "employee", "viewer"],
    },
  },
} as const
