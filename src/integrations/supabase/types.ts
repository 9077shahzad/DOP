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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_contacts: {
        Row: {
          account_id: string
          created_at: string
          email: string
          id: string
          is_billing: boolean
          is_primary: boolean
          name: string
          phone: string
          preferred_language: string
          role: string
          site_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          email?: string
          id?: string
          is_billing?: boolean
          is_primary?: boolean
          name: string
          phone?: string
          preferred_language?: string
          role?: string
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string
          id?: string
          is_billing?: boolean
          is_primary?: boolean
          name?: string
          phone?: string
          preferred_language?: string
          role?: string
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_contacts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "account_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      account_services: {
        Row: {
          account_id: string
          active: boolean
          agreed_price: number | null
          catalogue_id: string
          created_at: string
          frequency: Database["public"]["Enums"]["service_frequency"] | null
          id: string
          preferred_fulfilment:
            | Database["public"]["Enums"]["fulfilment_pref"]
            | null
          sla_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          active?: boolean
          agreed_price?: number | null
          catalogue_id: string
          created_at?: string
          frequency?: Database["public"]["Enums"]["service_frequency"] | null
          id?: string
          preferred_fulfilment?:
            | Database["public"]["Enums"]["fulfilment_pref"]
            | null
          sla_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          active?: boolean
          agreed_price?: number | null
          catalogue_id?: string
          created_at?: string
          frequency?: Database["public"]["Enums"]["service_frequency"] | null
          id?: string
          preferred_fulfilment?:
            | Database["public"]["Enums"]["fulfilment_pref"]
            | null
          sla_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_services_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_services_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "service_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_services_sla_fk"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "slas"
            referencedColumns: ["id"]
          },
        ]
      }
      account_sites: {
        Row: {
          access_notes: string
          account_id: string
          active: boolean
          address: string
          canton: string
          city: string
          created_at: string
          id: string
          name: string
          operating_hours: Json
          postcode: string
          site_reference: string
          updated_at: string
        }
        Insert: {
          access_notes?: string
          account_id: string
          active?: boolean
          address?: string
          canton?: string
          city?: string
          created_at?: string
          id?: string
          name: string
          operating_hours?: Json
          postcode?: string
          site_reference?: string
          updated_at?: string
        }
        Update: {
          access_notes?: string
          account_id?: string
          active?: boolean
          address?: string
          canton?: string
          city?: string
          created_at?: string
          id?: string
          name?: string
          operating_hours?: Json
          postcode?: string
          site_reference?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_sites_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_manager_id: string | null
          billing_address: string
          billing_email: string
          consolidated_invoicing: boolean
          country: string
          created_at: string
          id: string
          legal_name: string
          notes: string
          organization_id: string | null
          payment_terms_days: number
          status: Database["public"]["Enums"]["account_status"]
          trading_name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          vat_number: string
        }
        Insert: {
          account_manager_id?: string | null
          billing_address?: string
          billing_email?: string
          consolidated_invoicing?: boolean
          country?: string
          created_at?: string
          id?: string
          legal_name: string
          notes?: string
          organization_id?: string | null
          payment_terms_days?: number
          status?: Database["public"]["Enums"]["account_status"]
          trading_name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          vat_number?: string
        }
        Update: {
          account_manager_id?: string | null
          billing_address?: string
          billing_email?: string
          consolidated_invoicing?: boolean
          country?: string
          created_at?: string
          id?: string
          legal_name?: string
          notes?: string
          organization_id?: string | null
          payment_terms_days?: number
          status?: Database["public"]["Enums"]["account_status"]
          trading_name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          vat_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_country_fkey"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["country"]
          },
          {
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          feature: string
          monthly_budget_chf: number
          rollout_note: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature: string
          monthly_budget_chf?: number
          rollout_note?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature?: string
          monthly_budget_chf?: number
          rollout_note?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_media_consent: {
        Row: {
          consent_at: string | null
          consent_given: boolean
          consent_source: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          media_kind: string
          retain_until: string | null
          storage_bucket: string
          storage_path: string
          subject_id: string | null
          subject_type: string
          updated_at: string
        }
        Insert: {
          consent_at?: string | null
          consent_given?: boolean
          consent_source?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          media_kind: string
          retain_until?: string | null
          storage_bucket: string
          storage_path: string
          subject_id?: string | null
          subject_type?: string
          updated_at?: string
        }
        Update: {
          consent_at?: string | null
          consent_given?: boolean
          consent_source?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          media_kind?: string
          retain_until?: string | null
          storage_bucket?: string
          storage_path?: string
          subject_id?: string | null
          subject_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          confidence: number | null
          cost_estimate: number
          created_at: string
          created_by: string | null
          edited_payload: Json | null
          feature: string
          id: string
          input_summary: string
          language: string
          model: string
          model_version: string
          output_text: string
          payload: Json
          prompt_version: string
          provider: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subject_id: string | null
          subject_type: string
          tokens_in: number
          tokens_out: number
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          cost_estimate?: number
          created_at?: string
          created_by?: string | null
          edited_payload?: Json | null
          feature: string
          id?: string
          input_summary?: string
          language?: string
          model?: string
          model_version?: string
          output_text?: string
          payload?: Json
          prompt_version?: string
          provider?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject_id?: string | null
          subject_type: string
          tokens_in?: number
          tokens_out?: number
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          cost_estimate?: number
          created_at?: string
          created_by?: string | null
          edited_payload?: Json | null
          feature?: string
          id?: string
          input_summary?: string
          language?: string
          model?: string
          model_version?: string
          output_text?: string
          payload?: Json
          prompt_version?: string
          provider?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject_id?: string | null
          subject_type?: string
          tokens_in?: number
          tokens_out?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          blocked_count: number
          calls: number
          cost_estimate: number
          created_at: string
          day: string
          feature: string
          id: string
          tokens_in: number
          tokens_out: number
          updated_at: string
        }
        Insert: {
          blocked_count?: number
          calls?: number
          cost_estimate?: number
          created_at?: string
          day?: string
          feature: string
          id?: string
          tokens_in?: number
          tokens_out?: number
          updated_at?: string
        }
        Update: {
          blocked_count?: number
          calls?: number
          cost_estimate?: number
          created_at?: string
          day?: string
          feature?: string
          id?: string
          tokens_in?: number
          tokens_out?: number
          updated_at?: string
        }
        Relationships: []
      }
      allocation_exceptions: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          reason: Database["public"]["Enums"]["allocation_exception_reason"]
          resolution: string
          resolved_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          reason: Database["public"]["Enums"]["allocation_exception_reason"]
          resolution?: string
          resolved_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          reason?: Database["public"]["Enums"]["allocation_exception_reason"]
          resolution?: string
          resolved_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocation_exceptions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      allocation_rules: {
        Row: {
          active: boolean
          canton: string
          category_id: string | null
          created_at: string
          customer_type:
            | Database["public"]["Enums"]["lead_customer_type"]
            | null
          id: string
          method: Database["public"]["Enums"]["allocation_method"]
          name: string
          priority: number
          rfq_partner_count: number
          sla_minutes: number
          updated_at: string
          weights: Json
        }
        Insert: {
          active?: boolean
          canton?: string
          category_id?: string | null
          created_at?: string
          customer_type?:
            | Database["public"]["Enums"]["lead_customer_type"]
            | null
          id?: string
          method?: Database["public"]["Enums"]["allocation_method"]
          name: string
          priority?: number
          rfq_partner_count?: number
          sla_minutes?: number
          updated_at?: string
          weights?: Json
        }
        Update: {
          active?: boolean
          canton?: string
          category_id?: string | null
          created_at?: string
          customer_type?:
            | Database["public"]["Enums"]["lead_customer_type"]
            | null
          id?: string
          method?: Database["public"]["Enums"]["allocation_method"]
          name?: string
          priority?: number
          rfq_partner_count?: number
          sla_minutes?: number
          updated_at?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "allocation_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "partner_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          lead_id: string | null
          note: string
          payload: Json
          requested_by: string | null
          requested_value: number | null
          rule_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
          subject_id: string | null
          subject_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          lead_id?: string | null
          note?: string
          payload?: Json
          requested_by?: string | null
          requested_value?: number | null
          rule_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject_id?: string | null
          subject_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          lead_id?: string | null
          note?: string
          payload?: Json
          requested_by?: string | null
          requested_value?: number | null
          rule_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject_id?: string | null
          subject_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          active: boolean
          country: string
          created_at: string
          id: string
          required_role: string
          scope: Database["public"]["Enums"]["approval_scope"]
          threshold: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          country?: string
          created_at?: string
          id?: string
          required_role: string
          scope: Database["public"]["Enums"]["approval_scope"]
          threshold: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          country?: string
          created_at?: string
          id?: string
          required_role?: string
          scope?: Database["public"]["Enums"]["approval_scope"]
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_country_fkey"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["country"]
          },
        ]
      }
      bank_payment_events: {
        Row: {
          account_iban: string
          amount: number
          booked_on: string
          created_at: string
          currency: string
          detail: string
          external_id: string
          id: string
          invoice_id: string | null
          payer_name: string
          processed_at: string | null
          provider: string
          raw_payload: Json
          reference: string
          status: string
        }
        Insert: {
          account_iban?: string
          amount: number
          booked_on: string
          created_at?: string
          currency?: string
          detail?: string
          external_id: string
          id?: string
          invoice_id?: string | null
          payer_name?: string
          processed_at?: string | null
          provider: string
          raw_payload?: Json
          reference?: string
          status?: string
        }
        Update: {
          account_iban?: string
          amount?: number
          booked_on?: string
          created_at?: string
          currency?: string
          detail?: string
          external_id?: string
          id?: string
          invoice_id?: string | null
          payer_name?: string
          processed_at?: string | null
          provider?: string
          raw_payload?: Json
          reference?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_payment_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_rules: {
        Row: {
          active: boolean
          band_key: string
          charge_fixed: number
          charge_pct: number
          country: string
          created_at: string
          hours_before: number | null
          id: string
          job_state: string | null
          note: string
          partner_compensation_pct: number
          sort_order: number
          updated_at: string
          who: Database["public"]["Enums"]["cancel_actor"]
        }
        Insert: {
          active?: boolean
          band_key: string
          charge_fixed?: number
          charge_pct?: number
          country?: string
          created_at?: string
          hours_before?: number | null
          id?: string
          job_state?: string | null
          note?: string
          partner_compensation_pct?: number
          sort_order?: number
          updated_at?: string
          who: Database["public"]["Enums"]["cancel_actor"]
        }
        Update: {
          active?: boolean
          band_key?: string
          charge_fixed?: number
          charge_pct?: number
          country?: string
          created_at?: string
          hours_before?: number | null
          id?: string
          job_state?: string | null
          note?: string
          partner_compensation_pct?: number
          sort_order?: number
          updated_at?: string
          who?: Database["public"]["Enums"]["cancel_actor"]
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_rules_country_fkey"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["country"]
          },
        ]
      }
      change_orders: {
        Row: {
          approval_request_id: string | null
          created_at: string
          currency: string
          customer_decided_at: string | null
          customer_price: number | null
          decided_name: string
          decision_channel: string
          description: string
          estimated_hours: number | null
          estimated_materials: number | null
          id: string
          job_id: string | null
          lead_id: string | null
          partner_cost: number | null
          public_token: string
          reason: string
          reference: string
          requested_by: string | null
          requested_kind: Database["public"]["Enums"]["lead_actor_kind"]
          status: Database["public"]["Enums"]["change_order_status"]
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          approval_request_id?: string | null
          created_at?: string
          currency?: string
          customer_decided_at?: string | null
          customer_price?: number | null
          decided_name?: string
          decision_channel?: string
          description?: string
          estimated_hours?: number | null
          estimated_materials?: number | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          partner_cost?: number | null
          public_token?: string
          reason?: string
          reference?: string
          requested_by?: string | null
          requested_kind?: Database["public"]["Enums"]["lead_actor_kind"]
          status?: Database["public"]["Enums"]["change_order_status"]
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          approval_request_id?: string | null
          created_at?: string
          currency?: string
          customer_decided_at?: string | null
          customer_price?: number | null
          decided_name?: string
          decision_channel?: string
          description?: string
          estimated_hours?: number | null
          estimated_materials?: number | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          partner_cost?: number | null
          public_token?: string
          reason?: string
          reference?: string
          requested_by?: string | null
          requested_kind?: Database["public"]["Enums"]["lead_actor_kind"]
          status?: Database["public"]["Enums"]["change_order_status"]
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_execution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          block_reason: string
          blocked: boolean
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          block_reason?: string
          blocked?: boolean
          content?: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          block_reason?: string
          blocked?: boolean
          content?: string
          created_at?: string
          id?: string
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
          blocked_count: number
          closed: boolean
          consent_at: string | null
          created_at: string
          id: string
          ip_hash: string
          language: string
          lead_id: string | null
          message_count: number
          model: string
          updated_at: string
        }
        Insert: {
          blocked_count?: number
          closed?: boolean
          consent_at?: string | null
          created_at?: string
          id?: string
          ip_hash?: string
          language?: string
          lead_id?: string | null
          message_count?: number
          model?: string
          updated_at?: string
        }
        Update: {
          blocked_count?: number
          closed?: boolean
          consent_at?: string | null
          created_at?: string
          id?: string
          ip_hash?: string
          language?: string
          lead_id?: string | null
          message_count?: number
          model?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          booking_reference: string
          consent_kind: Database["public"]["Enums"]["consent_kind"]
          country: string
          created_at: string
          created_by: string | null
          document_type: string
          document_version: number | null
          id: string
          legal_entity_id: string | null
          partner_reference: string
          subject_ref: string
          subject_type: Database["public"]["Enums"]["consent_subject_type"]
          user_agent_hash: string
          value: boolean
        }
        Insert: {
          booking_reference?: string
          consent_kind: Database["public"]["Enums"]["consent_kind"]
          country: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          document_version?: number | null
          id?: string
          legal_entity_id?: string | null
          partner_reference?: string
          subject_ref?: string
          subject_type: Database["public"]["Enums"]["consent_subject_type"]
          user_agent_hash?: string
          value: boolean
        }
        Update: {
          booking_reference?: string
          consent_kind?: Database["public"]["Enums"]["consent_kind"]
          country?: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          document_version?: number | null
          id?: string
          legal_entity_id?: string | null
          partner_reference?: string
          subject_ref?: string
          subject_type?: Database["public"]["Enums"]["consent_subject_type"]
          user_agent_hash?: string
          value?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_sites: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          site_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          site_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_sites_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "account_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          account_id: string
          auto_renew: boolean
          created_at: string
          ends_on: string | null
          id: string
          notice_period_days: number
          price_list_scope: string
          reference: string
          signed_at: string | null
          signed_by: string
          sla_id: string | null
          starts_on: string
          status: Database["public"]["Enums"]["contract_status"]
          terms_document_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          account_id: string
          auto_renew?: boolean
          created_at?: string
          ends_on?: string | null
          id?: string
          notice_period_days?: number
          price_list_scope?: string
          reference?: string
          signed_at?: string | null
          signed_by?: string
          sla_id?: string | null
          starts_on?: string
          status?: Database["public"]["Enums"]["contract_status"]
          terms_document_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          auto_renew?: boolean
          created_at?: string
          ends_on?: string | null
          id?: string
          notice_period_days?: number
          price_list_scope?: string
          reference?: string
          signed_at?: string | null
          signed_by?: string
          sla_id?: string | null
          starts_on?: string
          status?: Database["public"]["Enums"]["contract_status"]
          terms_document_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "slas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_terms_document_id_fkey"
            columns: ["terms_document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          created_at: string
          crew_role: string
          employee_id: string
          id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crew_role?: string
          employee_id: string
          id?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crew_role?: string
          employee_id?: string
          id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "internal_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_automation: {
        Row: {
          created_at: string
          enabled: boolean
          id: boolean
          interval_minutes: number
          last_duration_ms: number
          last_error: string
          last_escalated: number
          last_exceptions: number
          last_run_at: string | null
          last_skipped: boolean
          last_timed_out: number
          last_trigger: string
          scheduler: string
          updated_at: string
          wo_enabled: boolean
          wo_horizon_days: number
          wo_last_created: number
          wo_last_run_at: string | null
          wo_last_skipped: boolean
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: boolean
          interval_minutes?: number
          last_duration_ms?: number
          last_error?: string
          last_escalated?: number
          last_exceptions?: number
          last_run_at?: string | null
          last_skipped?: boolean
          last_timed_out?: number
          last_trigger?: string
          scheduler?: string
          updated_at?: string
          wo_enabled?: boolean
          wo_horizon_days?: number
          wo_last_created?: number
          wo_last_run_at?: string | null
          wo_last_skipped?: boolean
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: boolean
          interval_minutes?: number
          last_duration_ms?: number
          last_error?: string
          last_escalated?: number
          last_exceptions?: number
          last_run_at?: string | null
          last_skipped?: boolean
          last_timed_out?: number
          last_trigger?: string
          scheduler?: string
          updated_at?: string
          wo_enabled?: boolean
          wo_horizon_days?: number
          wo_last_created?: number
          wo_last_run_at?: string | null
          wo_last_skipped?: boolean
        }
        Relationships: []
      }
      dispatch_runs: {
        Row: {
          created_at: string
          duration_ms: number
          error: string
          errors: Json
          escalated: number
          exceptions: number
          finished_at: string | null
          id: string
          job: string
          leads_processed: number
          partners_notified: number
          skip_reason: string
          skipped: boolean
          started_at: string
          timed_out: number
          trigger: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          error?: string
          errors?: Json
          escalated?: number
          exceptions?: number
          finished_at?: string | null
          id?: string
          job?: string
          leads_processed?: number
          partners_notified?: number
          skip_reason?: string
          skipped?: boolean
          started_at?: string
          timed_out?: number
          trigger?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error?: string
          errors?: Json
          escalated?: number
          exceptions?: number
          finished_at?: string | null
          id?: string
          job?: string
          leads_processed?: number
          partners_notified?: number
          skip_reason?: string
          skipped?: boolean
          started_at?: string
          timed_out?: number
          trigger?: string
        }
        Relationships: []
      }
      email_accounts: {
        Row: {
          active: boolean
          address: string
          created_at: string
          display_name: string
          dkim_selector: string
          domain: string
          id: string
          inbound_address: string
          inbound_mode: string
          is_default: boolean
          notes: string
          outbound_ready: boolean
          provider: string
          reply_to: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          created_at?: string
          display_name?: string
          dkim_selector?: string
          domain?: string
          id?: string
          inbound_address?: string
          inbound_mode?: string
          is_default?: boolean
          notes?: string
          outbound_ready?: boolean
          provider?: string
          reply_to?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          created_at?: string
          display_name?: string
          dkim_selector?: string
          domain?: string
          id?: string
          inbound_address?: string
          inbound_mode?: string
          is_default?: boolean
          notes?: string
          outbound_ready?: boolean
          provider?: string
          reply_to?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_assignments: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          created_at: string
          id: string
          note: string
          thread_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          note?: string
          thread_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          note?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_assignments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_attachments: {
        Row: {
          content_id: string
          created_at: string
          filename: string
          id: string
          message_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          content_id?: string
          created_at?: string
          filename?: string
          id?: string
          message_id: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
        }
        Update: {
          content_id?: string
          created_at?: string
          filename?: string
          id?: string
          message_id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_links: {
        Row: {
          confidence: string
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["email_link_entity"]
          id: string
          linked_by: string | null
          matched_on: string
          thread_id: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["email_link_entity"]
          id?: string
          linked_by?: string | null
          matched_on?: string
          thread_id: string
        }
        Update: {
          confidence?: string
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["email_link_entity"]
          id?: string
          linked_by?: string | null
          matched_on?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_links_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          bcc_addresses: string[]
          body_html: string
          body_text: string
          cc_addresses: string[]
          created_at: string
          created_by: string | null
          delivery_reason: string
          delivery_status: Database["public"]["Enums"]["email_delivery_status"]
          direction: Database["public"]["Enums"]["email_direction"]
          folder: Database["public"]["Enums"]["email_folder"]
          from_address: string
          from_name: string
          id: string
          in_reply_to: string
          ingest_source: Database["public"]["Enums"]["email_ingest_source"]
          message_id: string
          provider_message_id: string
          raw_headers: Json
          read_at: string | null
          received_at: string
          references: string[]
          subject: string
          thread_id: string
          to_addresses: string[]
        }
        Insert: {
          bcc_addresses?: string[]
          body_html?: string
          body_text?: string
          cc_addresses?: string[]
          created_at?: string
          created_by?: string | null
          delivery_reason?: string
          delivery_status?: Database["public"]["Enums"]["email_delivery_status"]
          direction: Database["public"]["Enums"]["email_direction"]
          folder?: Database["public"]["Enums"]["email_folder"]
          from_address?: string
          from_name?: string
          id?: string
          in_reply_to?: string
          ingest_source?: Database["public"]["Enums"]["email_ingest_source"]
          message_id?: string
          provider_message_id?: string
          raw_headers?: Json
          read_at?: string | null
          received_at?: string
          references?: string[]
          subject?: string
          thread_id: string
          to_addresses?: string[]
        }
        Update: {
          bcc_addresses?: string[]
          body_html?: string
          body_text?: string
          cc_addresses?: string[]
          created_at?: string
          created_by?: string | null
          delivery_reason?: string
          delivery_status?: Database["public"]["Enums"]["email_delivery_status"]
          direction?: Database["public"]["Enums"]["email_direction"]
          folder?: Database["public"]["Enums"]["email_folder"]
          from_address?: string
          from_name?: string
          id?: string
          in_reply_to?: string
          ingest_source?: Database["public"]["Enums"]["email_ingest_source"]
          message_id?: string
          provider_message_id?: string
          raw_headers?: Json
          read_at?: string | null
          received_at?: string
          references?: string[]
          subject?: string
          thread_id?: string
          to_addresses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_tags: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          tag: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          tag: string
          thread_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          tag?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_tags_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          created_at: string
          folder: Database["public"]["Enums"]["email_folder"]
          id: string
          last_direction: Database["public"]["Enums"]["email_direction"]
          last_message_at: string
          message_count: number
          normalized_subject: string
          participants: string[]
          snippet: string
          subject: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          created_at?: string
          folder?: Database["public"]["Enums"]["email_folder"]
          id?: string
          last_direction?: Database["public"]["Enums"]["email_direction"]
          last_message_at?: string
          message_count?: number
          normalized_subject?: string
          participants?: string[]
          snippet?: string
          subject?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          created_at?: string
          folder?: Database["public"]["Enums"]["email_folder"]
          id?: string
          last_direction?: Database["public"]["Enums"]["email_direction"]
          last_message_at?: string
          message_count?: number
          normalized_subject?: string
          participants?: string[]
          snippet?: string
          subject?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          created_at: string
          email: string
          employment: string
          full_name: string
          id: string
          note: string
          phone: string
          role: string
          skills: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string
          employment?: string
          full_name: string
          id?: string
          note?: string
          phone?: string
          role?: string
          skills?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          employment?: string
          full_name?: string
          id?: string
          note?: string
          phone?: string
          role?: string
          skills?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          email: string | null
          from_text: string | null
          id: string
          is_test: boolean
          language: string
          message: string | null
          name: string | null
          phone: string | null
          preferred_date: string | null
          to_text: string | null
          workflow_stage: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          email?: string | null
          from_text?: string | null
          id?: string
          is_test?: boolean
          language?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          preferred_date?: string | null
          to_text?: string | null
          workflow_stage?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          email?: string | null
          from_text?: string | null
          id?: string
          is_test?: boolean
          language?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          preferred_date?: string | null
          to_text?: string | null
          workflow_stage?: string
        }
        Relationships: []
      }
      exception_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          label: string
          note: string
          severity: string
          sort_order: number
          threshold_unit: string
          threshold_value: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          label?: string
          note?: string
          severity?: string
          sort_order?: number
          threshold_unit?: string
          threshold_value?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          label?: string
          note?: string
          severity?: string
          sort_order?: number
          threshold_unit?: string
          threshold_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      fairness_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          label: string
          note: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          label?: string
          note?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          label?: string
          note?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      incidents: {
        Row: {
          created_at: string
          description: string
          id: string
          job_id: string | null
          kind: string
          photo_paths: string[]
          reported_by: string | null
          resolution: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          job_id?: string | null
          kind?: string
          photo_paths?: string[]
          reported_by?: string | null
          resolution?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          job_id?: string | null
          kind?: string
          photo_paths?: string[]
          reported_by?: string | null
          resolution?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_execution"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_teams: {
        Row: {
          active: boolean
          canton: string
          capacity_per_day: number
          category_ids: string[]
          city: string
          country: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          canton?: string
          capacity_per_day?: number
          category_ids?: string[]
          city?: string
          country?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          canton?: string
          capacity_per_day?: number
          category_ids?: string[]
          city?: string
          country?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_catalogue: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          key: string
          label_i18n: Json
          m3: number
          name_de: string
          sort_order: number
          special: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          key: string
          label_i18n?: Json
          m3?: number
          name_de: string
          sort_order?: number
          special?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          key?: string
          label_i18n?: Json
          m3?: number
          name_de?: string
          sort_order?: number
          special?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      invoice_events: {
        Row: {
          actor: string | null
          created_at: string
          detail: Json
          id: string
          invoice_id: string
          kind: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          detail?: Json
          id?: string
          invoice_id: string
          kind: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          detail?: Json
          id?: string
          invoice_id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          net: number
          quantity: number
          site_id: string | null
          unit_price: number
          vat_rate: number
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          invoice_id: string
          net?: number
          quantity?: number
          site_id?: string | null
          unit_price?: number
          vat_rate?: number
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          net?: number
          quantity?: number
          site_id?: string | null
          unit_price?: number
          vat_rate?: number
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "account_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          access_token: string
          account_id: string | null
          amount_paid: number
          cancellation_reason: string
          cancelled_at: string | null
          country: string
          created_at: string
          currency: string
          customer_address: Json
          customer_email: string
          customer_language: string
          customer_name: string
          due_on: string | null
          id: string
          is_test: boolean
          issued_at: string | null
          issued_by: string | null
          job_id: string | null
          lead_id: string | null
          net: number
          notes: string
          paid_at: string | null
          paid_on: string | null
          payment_method: string
          payment_note: string
          payment_reference: string
          payment_terms_days: number
          period_end: string
          period_start: string
          price_list_version_id: string | null
          qr_reference: string
          quote_id: string | null
          reference: string
          skipped: Json
          status: Database["public"]["Enums"]["invoice_status"]
          total: number
          updated_at: string
          vat: number
          vat_treatment: string
        }
        Insert: {
          access_token?: string
          account_id?: string | null
          amount_paid?: number
          cancellation_reason?: string
          cancelled_at?: string | null
          country?: string
          created_at?: string
          currency?: string
          customer_address?: Json
          customer_email?: string
          customer_language?: string
          customer_name?: string
          due_on?: string | null
          id?: string
          is_test?: boolean
          issued_at?: string | null
          issued_by?: string | null
          job_id?: string | null
          lead_id?: string | null
          net?: number
          notes?: string
          paid_at?: string | null
          paid_on?: string | null
          payment_method?: string
          payment_note?: string
          payment_reference?: string
          payment_terms_days?: number
          period_end: string
          period_start: string
          price_list_version_id?: string | null
          qr_reference?: string
          quote_id?: string | null
          reference?: string
          skipped?: Json
          status?: Database["public"]["Enums"]["invoice_status"]
          total?: number
          updated_at?: string
          vat?: number
          vat_treatment?: string
        }
        Update: {
          access_token?: string
          account_id?: string | null
          amount_paid?: number
          cancellation_reason?: string
          cancelled_at?: string | null
          country?: string
          created_at?: string
          currency?: string
          customer_address?: Json
          customer_email?: string
          customer_language?: string
          customer_name?: string
          due_on?: string | null
          id?: string
          is_test?: boolean
          issued_at?: string | null
          issued_by?: string | null
          job_id?: string | null
          lead_id?: string | null
          net?: number
          notes?: string
          paid_at?: string | null
          paid_on?: string | null
          payment_method?: string
          payment_note?: string
          payment_reference?: string
          payment_terms_days?: number
          period_end?: string
          period_start?: string
          price_list_version_id?: string | null
          qr_reference?: string
          quote_id?: string | null
          reference?: string
          skipped?: Json
          status?: Database["public"]["Enums"]["invoice_status"]
          total?: number
          updated_at?: string
          vat?: number
          vat_treatment?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_country_fkey"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["country"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_execution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_price_list_version_id_fkey"
            columns: ["price_list_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          job_id: string
          note: string
          organization_id: string
          stage: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          job_id: string
          note?: string
          organization_id: string
          stage: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          job_id?: string
          note?: string
          organization_id?: string
          stage?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events_exec: {
        Row: {
          actor_id: string | null
          actor_kind: Database["public"]["Enums"]["lead_actor_kind"]
          body: string
          created_at: string
          id: string
          job_id: string
          kind: Database["public"]["Enums"]["job_exec_event_kind"]
          meta: Json
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: Database["public"]["Enums"]["lead_actor_kind"]
          body?: string
          created_at?: string
          id?: string
          job_id: string
          kind: Database["public"]["Enums"]["job_exec_event_kind"]
          meta?: Json
        }
        Update: {
          actor_id?: string | null
          actor_kind?: Database["public"]["Enums"]["lead_actor_kind"]
          body?: string
          created_at?: string
          id?: string
          job_id?: string
          kind?: Database["public"]["Enums"]["job_exec_event_kind"]
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "job_events_exec_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_execution"
            referencedColumns: ["id"]
          },
        ]
      }
      job_materials: {
        Row: {
          approval_request_id: string | null
          change_order_id: string | null
          created_at: string
          created_by: string | null
          customer_price: number | null
          description: string
          id: string
          job_id: string
          photo_path: string
          quantity: number
          status: Database["public"]["Enums"]["job_material_status"]
          supplier_cost: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          approval_request_id?: string | null
          change_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_price?: number | null
          description: string
          id?: string
          job_id: string
          photo_path?: string
          quantity?: number
          status?: Database["public"]["Enums"]["job_material_status"]
          supplier_cost?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          approval_request_id?: string | null
          change_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_price?: number | null
          description?: string
          id?: string
          job_id?: string
          photo_path?: string
          quantity?: number
          status?: Database["public"]["Enums"]["job_material_status"]
          supplier_cost?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_materials_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_execution"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          caption: string
          created_at: string
          id: string
          job_id: string
          phase: Database["public"]["Enums"]["job_photo_phase"]
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          job_id: string
          phase: Database["public"]["Enums"]["job_photo_phase"]
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          job_id?: string
          phase?: Database["public"]["Enums"]["job_photo_phase"]
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_execution"
            referencedColumns: ["id"]
          },
        ]
      }
      job_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          job_id: string
          rating: number | null
          requested_at: string
          submitted_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          job_id: string
          rating?: number | null
          requested_at?: string
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          job_id?: string
          rating?: number | null
          requested_at?: string
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_execution"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          amount: number
          created_at: string
          crew_size: number
          document_language: string
          id: string
          move_out_date: string | null
          notes: string
          organization_id: string
          price_stage: Database["public"]["Enums"]["price_stage"]
          quote_id: string | null
          reference: string
          scheduled_date: string | null
          services: Json
          status: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          unit_id: string | null
          updated_at: string
          vehicle: string
        }
        Insert: {
          amount?: number
          created_at?: string
          crew_size?: number
          document_language?: string
          id?: string
          move_out_date?: string | null
          notes?: string
          organization_id: string
          price_stage?: Database["public"]["Enums"]["price_stage"]
          quote_id?: string | null
          reference: string
          scheduled_date?: string | null
          services?: Json
          status?: Database["public"]["Enums"]["job_status"]
          type?: Database["public"]["Enums"]["job_type"]
          unit_id?: string | null
          updated_at?: string
          vehicle?: string
        }
        Update: {
          amount?: number
          created_at?: string
          crew_size?: number
          document_language?: string
          id?: string
          move_out_date?: string | null
          notes?: string
          organization_id?: string
          price_stage?: Database["public"]["Enums"]["price_stage"]
          quote_id?: string | null
          reference?: string
          scheduled_date?: string | null
          services?: Json
          status?: Database["public"]["Enums"]["job_status"]
          type?: Database["public"]["Enums"]["job_type"]
          unit_id?: string | null
          updated_at?: string
          vehicle?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs_execution: {
        Row: {
          accepted_snapshot: Json | null
          archived_at: string | null
          archived_by: string | null
          arrived_at: string | null
          attachments: Json
          billing_status: string
          booked_at: string | null
          booked_by: string | null
          booking_notes: string
          calendar_event_id: string | null
          calendar_synced_at: string | null
          cancellation_customer_charge: number | null
          cancellation_manual_review: boolean
          cancellation_partner_compensation: number | null
          cancellation_reason: string
          cancellation_rule_id: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["cancel_actor"] | null
          completed_at: string | null
          confirmation_code: string
          created_at: string
          crew_note: string
          customer_confirmation: Database["public"]["Enums"]["job_confirmation_kind"]
          customer_email: string
          customer_language: string
          customer_name: string
          customer_phone: string
          destination: Json
          extras: Json
          id: string
          inventory: Json
          is_test: boolean
          job_value: number | null
          lead_id: string
          lead_reference: string
          location_evidence: Json
          opportunity_id: string | null
          origin: Json
          partner_id: string | null
          paused_at: string | null
          quote_id: string | null
          quote_reference: string
          reference: string
          scheduled_end: string | null
          scheduled_start: string | null
          service_key: string
          signature_path: string
          signed_at: string | null
          signed_by_name: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_exec_status"]
          team_id: string | null
          total_pause_minutes: number
          tracking_token: string | null
          updated_at: string
          vehicle_id: string | null
          verified_at: string | null
        }
        Insert: {
          accepted_snapshot?: Json | null
          archived_at?: string | null
          archived_by?: string | null
          arrived_at?: string | null
          attachments?: Json
          billing_status?: string
          booked_at?: string | null
          booked_by?: string | null
          booking_notes?: string
          calendar_event_id?: string | null
          calendar_synced_at?: string | null
          cancellation_customer_charge?: number | null
          cancellation_manual_review?: boolean
          cancellation_partner_compensation?: number | null
          cancellation_reason?: string
          cancellation_rule_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: Database["public"]["Enums"]["cancel_actor"] | null
          completed_at?: string | null
          confirmation_code?: string
          created_at?: string
          crew_note?: string
          customer_confirmation?: Database["public"]["Enums"]["job_confirmation_kind"]
          customer_email?: string
          customer_language?: string
          customer_name?: string
          customer_phone?: string
          destination?: Json
          extras?: Json
          id?: string
          inventory?: Json
          is_test?: boolean
          job_value?: number | null
          lead_id: string
          lead_reference?: string
          location_evidence?: Json
          opportunity_id?: string | null
          origin?: Json
          partner_id?: string | null
          paused_at?: string | null
          quote_id?: string | null
          quote_reference?: string
          reference?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_key?: string
          signature_path?: string
          signed_at?: string | null
          signed_by_name?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_exec_status"]
          team_id?: string | null
          total_pause_minutes?: number
          tracking_token?: string | null
          updated_at?: string
          vehicle_id?: string | null
          verified_at?: string | null
        }
        Update: {
          accepted_snapshot?: Json | null
          archived_at?: string | null
          archived_by?: string | null
          arrived_at?: string | null
          attachments?: Json
          billing_status?: string
          booked_at?: string | null
          booked_by?: string | null
          booking_notes?: string
          calendar_event_id?: string | null
          calendar_synced_at?: string | null
          cancellation_customer_charge?: number | null
          cancellation_manual_review?: boolean
          cancellation_partner_compensation?: number | null
          cancellation_reason?: string
          cancellation_rule_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: Database["public"]["Enums"]["cancel_actor"] | null
          completed_at?: string | null
          confirmation_code?: string
          created_at?: string
          crew_note?: string
          customer_confirmation?: Database["public"]["Enums"]["job_confirmation_kind"]
          customer_email?: string
          customer_language?: string
          customer_name?: string
          customer_phone?: string
          destination?: Json
          extras?: Json
          id?: string
          inventory?: Json
          is_test?: boolean
          job_value?: number | null
          lead_id?: string
          lead_reference?: string
          location_evidence?: Json
          opportunity_id?: string | null
          origin?: Json
          partner_id?: string | null
          paused_at?: string | null
          quote_id?: string | null
          quote_reference?: string
          reference?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_key?: string
          signature_path?: string
          signed_at?: string | null
          signed_by_name?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_exec_status"]
          team_id?: string | null
          total_pause_minutes?: number
          tracking_token?: string | null
          updated_at?: string
          vehicle_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_execution_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_execution_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_execution_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_execution_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_execution_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "internal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_execution_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          actor_id: string | null
          actor_kind: Database["public"]["Enums"]["lead_actor_kind"]
          body: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["lead_activity_kind"]
          lead_id: string
          meta: Json
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: Database["public"]["Enums"]["lead_actor_kind"]
          body?: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["lead_activity_kind"]
          lead_id: string
          meta?: Json
        }
        Update: {
          actor_id?: string | null
          actor_kind?: Database["public"]["Enums"]["lead_actor_kind"]
          body?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["lead_activity_kind"]
          lead_id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          lead_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string
          id?: string
          lead_id: string
          mime_type?: string
          size_bytes?: number
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          lead_id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_duplicates: {
        Row: {
          created_at: string
          existing_lead_id: string
          id: string
          lead_id: string
          matched_on: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          existing_lead_id: string
          id?: string
          lead_id: string
          matched_on?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          existing_lead_id?: string
          id?: string
          lead_id?: string
          matched_on?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_duplicates_existing_lead_id_fkey"
            columns: ["existing_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_duplicates_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_followups: {
        Row: {
          actor_id: string | null
          channel: string
          created_at: string
          due_at: string
          id: string
          lead_id: string
          status: Database["public"]["Enums"]["lead_followup_status"]
          template_key: string
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          channel?: string
          created_at?: string
          due_at: string
          id?: string
          lead_id: string
          status?: Database["public"]["Enums"]["lead_followup_status"]
          template_key?: string
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          channel?: string
          created_at?: string
          due_at?: string
          id?: string
          lead_id?: string
          status?: Database["public"]["Enums"]["lead_followup_status"]
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_loss_reasons: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          label_de: string
          label_en: string
          label_fr: string
          label_i18n: Json
          label_it: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          label_de?: string
          label_en?: string
          label_fr?: string
          label_i18n?: Json
          label_it?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          label_de?: string
          label_en?: string
          label_fr?: string
          label_i18n?: Json
          label_it?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_queues: {
        Row: {
          active: boolean
          created_at: string
          default_owner_id: string | null
          default_team_id: string | null
          id: string
          key: string
          label_de: string
          label_en: string
          label_fr: string
          label_i18n: Json
          label_it: string
          note: string
          sla_awaiting_customer_minutes: number
          sla_awaiting_partner_minutes: number
          sla_first_contact_minutes: number
          sla_first_review_minutes: number
          sla_quote_minutes: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_owner_id?: string | null
          default_team_id?: string | null
          id?: string
          key: string
          label_de?: string
          label_en?: string
          label_fr?: string
          label_i18n?: Json
          label_it?: string
          note?: string
          sla_awaiting_customer_minutes?: number
          sla_awaiting_partner_minutes?: number
          sla_first_contact_minutes?: number
          sla_first_review_minutes?: number
          sla_quote_minutes?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_owner_id?: string | null
          default_team_id?: string | null
          id?: string
          key?: string
          label_de?: string
          label_en?: string
          label_fr?: string
          label_i18n?: Json
          label_it?: string
          note?: string
          sla_awaiting_customer_minutes?: number
          sla_awaiting_partner_minutes?: number
          sla_first_contact_minutes?: number
          sla_first_review_minutes?: number
          sla_quote_minutes?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_queues_default_team_id_fkey"
            columns: ["default_team_id"]
            isOneToOne: false
            referencedRelation: "internal_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_risk_signals: {
        Row: {
          created_at: string
          detail: string
          id: string
          lead_id: string
          signal: string
          weight: number
        }
        Insert: {
          created_at?: string
          detail?: string
          id?: string
          lead_id: string
          signal: string
          weight?: number
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          lead_id?: string
          signal?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_risk_signals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_routing_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          match_customer_type:
            | Database["public"]["Enums"]["lead_customer_type"]
            | null
          match_flag: string
          match_source_key: string
          match_urgency: string
          note: string
          priority: number
          queue_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          match_customer_type?:
            | Database["public"]["Enums"]["lead_customer_type"]
            | null
          match_flag?: string
          match_source_key?: string
          match_urgency?: string
          note?: string
          priority?: number
          queue_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          match_customer_type?:
            | Database["public"]["Enums"]["lead_customer_type"]
            | null
          match_flag?: string
          match_source_key?: string
          match_urgency?: string
          note?: string
          priority?: number
          queue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_routing_rules_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "lead_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          active: boolean
          attribution: Json
          created_at: string
          group: Database["public"]["Enums"]["lead_source_group"]
          id: string
          key: string
          label_de: string
          label_en: string
          label_fr: string
          label_i18n: Json
          label_it: string
          sort_order: number
          tracking_number: string
          tracking_provider: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          attribution?: Json
          created_at?: string
          group: Database["public"]["Enums"]["lead_source_group"]
          id?: string
          key: string
          label_de?: string
          label_en?: string
          label_fr?: string
          label_i18n?: Json
          label_it?: string
          sort_order?: number
          tracking_number?: string
          tracking_provider?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          attribution?: Json
          created_at?: string
          group?: Database["public"]["Enums"]["lead_source_group"]
          id?: string
          key?: string
          label_de?: string
          label_en?: string
          label_fr?: string
          label_i18n?: Json
          label_it?: string
          sort_order?: number
          tracking_number?: string
          tracking_provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          acquisition_cost: number | null
          archived_at: string | null
          archived_by: string | null
          assigned_partner_id: string | null
          assigned_team_id: string | null
          awaiting_since: string | null
          campaign: string
          canton: string
          category_id: string | null
          city: string
          country: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_type: Database["public"]["Enums"]["lead_customer_type"]
          description: string
          economics_flags: string[]
          estimated_value: number | null
          expected_cost: number | null
          expected_margin: number | null
          expected_margin_pct: number | null
          expected_sell: number | null
          first_contact_at: string | null
          first_review_at: string | null
          fulfilment_type:
            | Database["public"]["Enums"]["lead_fulfilment_type"]
            | null
          gclid: string
          id: string
          ip_hash: string
          is_test: boolean
          landing_page: string
          language: string
          last_activity_at: string
          lead_owner_id: string | null
          locked_at: string | null
          locked_by: string | null
          lost_reason_id: string | null
          min_margin_pct: number | null
          next_action_at: string | null
          postcode: string
          preferred_contact: string
          preferred_date: string | null
          preferred_time: string
          priority: Database["public"]["Enums"]["lead_priority"]
          property_type: string
          queue_id: string | null
          quoted_at: string | null
          reference: string
          referred_by_partner_id: string | null
          referrer: string
          risk_reviewed: boolean
          risk_score: number
          service_address: string
          service_details: Json
          source_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          temperature: Database["public"]["Enums"]["lead_temperature"]
          travel_cost: number | null
          updated_at: string
          urgency: string
          utm_campaign: string
          utm_content: string
          utm_medium: string
          utm_source: string
          utm_term: string
          workflow_stage: string
        }
        Insert: {
          acquisition_cost?: number | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_partner_id?: string | null
          assigned_team_id?: string | null
          awaiting_since?: string | null
          campaign?: string
          canton?: string
          category_id?: string | null
          city?: string
          country?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          customer_type?: Database["public"]["Enums"]["lead_customer_type"]
          description?: string
          economics_flags?: string[]
          estimated_value?: number | null
          expected_cost?: number | null
          expected_margin?: number | null
          expected_margin_pct?: number | null
          expected_sell?: number | null
          first_contact_at?: string | null
          first_review_at?: string | null
          fulfilment_type?:
            | Database["public"]["Enums"]["lead_fulfilment_type"]
            | null
          gclid?: string
          id?: string
          ip_hash?: string
          is_test?: boolean
          landing_page?: string
          language?: string
          last_activity_at?: string
          lead_owner_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          lost_reason_id?: string | null
          min_margin_pct?: number | null
          next_action_at?: string | null
          postcode?: string
          preferred_contact?: string
          preferred_date?: string | null
          preferred_time?: string
          priority?: Database["public"]["Enums"]["lead_priority"]
          property_type?: string
          queue_id?: string | null
          quoted_at?: string | null
          reference?: string
          referred_by_partner_id?: string | null
          referrer?: string
          risk_reviewed?: boolean
          risk_score?: number
          service_address?: string
          service_details?: Json
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          travel_cost?: number | null
          updated_at?: string
          urgency?: string
          utm_campaign?: string
          utm_content?: string
          utm_medium?: string
          utm_source?: string
          utm_term?: string
          workflow_stage?: string
        }
        Update: {
          acquisition_cost?: number | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_partner_id?: string | null
          assigned_team_id?: string | null
          awaiting_since?: string | null
          campaign?: string
          canton?: string
          category_id?: string | null
          city?: string
          country?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          customer_type?: Database["public"]["Enums"]["lead_customer_type"]
          description?: string
          economics_flags?: string[]
          estimated_value?: number | null
          expected_cost?: number | null
          expected_margin?: number | null
          expected_margin_pct?: number | null
          expected_sell?: number | null
          first_contact_at?: string | null
          first_review_at?: string | null
          fulfilment_type?:
            | Database["public"]["Enums"]["lead_fulfilment_type"]
            | null
          gclid?: string
          id?: string
          ip_hash?: string
          is_test?: boolean
          landing_page?: string
          language?: string
          last_activity_at?: string
          lead_owner_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          lost_reason_id?: string | null
          min_margin_pct?: number | null
          next_action_at?: string | null
          postcode?: string
          preferred_contact?: string
          preferred_date?: string | null
          preferred_time?: string
          priority?: Database["public"]["Enums"]["lead_priority"]
          property_type?: string
          queue_id?: string | null
          quoted_at?: string | null
          reference?: string
          referred_by_partner_id?: string | null
          referrer?: string
          risk_reviewed?: boolean
          risk_score?: number
          service_address?: string
          service_details?: Json
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          travel_cost?: number | null
          updated_at?: string
          urgency?: string
          utm_campaign?: string
          utm_content?: string
          utm_medium?: string
          utm_source?: string
          utm_term?: string
          workflow_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_partner_id_fkey"
            columns: ["assigned_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "internal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "partner_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lost_reason_id_fkey"
            columns: ["lost_reason_id"]
            isOneToOne: false
            referencedRelation: "lead_loss_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "lead_queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          body: string
          country: string
          created_at: string
          doc_type: string
          effective_date: string | null
          id: string
          language: string
          status: Database["public"]["Enums"]["legal_doc_status"]
          updated_at: string
          version: number
        }
        Insert: {
          body?: string
          country: string
          created_at?: string
          doc_type: string
          effective_date?: string | null
          id?: string
          language: string
          status?: Database["public"]["Enums"]["legal_doc_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string
          country?: string
          created_at?: string
          doc_type?: string
          effective_date?: string | null
          id?: string
          language?: string
          status?: Database["public"]["Enums"]["legal_doc_status"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      legal_entities: {
        Row: {
          address_line: string
          bank_name: string
          canton: string
          city: string
          country: string
          created_at: string
          currency: string
          email: string
          iban: string
          id: string
          legal_name: string
          mobile_phone: string
          opening_hours: Json
          phone: string
          postal_code: string
          qr_iban: string
          register_number: string
          status: string
          updated_at: string
          vat_number: string
          website: string
        }
        Insert: {
          address_line?: string
          bank_name?: string
          canton?: string
          city?: string
          country: string
          created_at?: string
          currency: string
          email?: string
          iban?: string
          id?: string
          legal_name?: string
          mobile_phone?: string
          opening_hours?: Json
          phone?: string
          postal_code?: string
          qr_iban?: string
          register_number?: string
          status?: string
          updated_at?: string
          vat_number?: string
          website?: string
        }
        Update: {
          address_line?: string
          bank_name?: string
          canton?: string
          city?: string
          country?: string
          created_at?: string
          currency?: string
          email?: string
          iban?: string
          id?: string
          legal_name?: string
          mobile_phone?: string
          opening_hours?: Json
          phone?: string
          postal_code?: string
          qr_iban?: string
          register_number?: string
          status?: string
          updated_at?: string
          vat_number?: string
          website?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          activated_at: string | null
          active: boolean
          consumer_regime: string
          country: string
          created_at: string
          currency: string
          entity_ready: boolean
          legal_ready: boolean
          note: string
          tax_ready: boolean
          updated_at: string
          vat_rate: number
        }
        Insert: {
          activated_at?: string | null
          active?: boolean
          consumer_regime: string
          country: string
          created_at?: string
          currency: string
          entity_ready?: boolean
          legal_ready?: boolean
          note?: string
          tax_ready?: boolean
          updated_at?: string
          vat_rate: number
        }
        Update: {
          activated_at?: string | null
          active?: boolean
          consumer_regime?: string
          country?: string
          created_at?: string
          currency?: string
          entity_ready?: boolean
          legal_ready?: boolean
          note?: string
          tax_ready?: boolean
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      minimum_billing_policy: {
        Row: {
          approved_by: string
          approved_on: string
          basis: string
          created_at: string
          effective_from: string
          id: string
          min_hours: number
          note: string
          status: string
        }
        Insert: {
          approved_by: string
          approved_on?: string
          basis: string
          created_at?: string
          effective_from?: string
          id?: string
          min_hours: number
          note?: string
          status?: string
        }
        Update: {
          approved_by?: string
          approved_on?: string
          basis?: string
          created_at?: string
          effective_from?: string
          id?: string
          min_hours?: number
          note?: string
          status?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          details: Json
          error: string
          event_at: string
          id: string
          language: string
          lead_id: string | null
          partner_id: string | null
          provider: string
          provider_message_id: string
          recipient: string
          status: string
          subject: string
          subject_id: string | null
          subject_type: string
          template: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel?: string
          created_at?: string
          details?: Json
          error?: string
          event_at?: string
          id?: string
          language?: string
          lead_id?: string | null
          partner_id?: string | null
          provider?: string
          provider_message_id?: string
          recipient?: string
          status?: string
          subject?: string
          subject_id?: string | null
          subject_type?: string
          template?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          details?: Json
          error?: string
          event_at?: string
          id?: string
          language?: string
          lead_id?: string | null
          partner_id?: string | null
          provider?: string
          provider_message_id?: string
          recipient?: string
          status?: string
          subject?: string
          subject_id?: string | null
          subject_type?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          api_key: string
          enabled: boolean
          from_email: string
          from_name: string
          id: string
          provider: string
          reply_to: string
          test_recipient: string
          updated_at: string
          updated_by: string | null
          webhook_secret: string
        }
        Insert: {
          api_key?: string
          enabled?: boolean
          from_email?: string
          from_name?: string
          id?: string
          provider?: string
          reply_to?: string
          test_recipient?: string
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string
        }
        Update: {
          api_key?: string
          enabled?: boolean
          from_email?: string
          from_name?: string
          id?: string
          provider?: string
          reply_to?: string
          test_recipient?: string
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          document_language: string
          framework_discount: number
          id: string
          name: string
          ui_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_language?: string
          framework_discount?: number
          id?: string
          name: string
          ui_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_language?: string
          framework_discount?: number
          id?: string
          name?: string
          ui_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_allocation_stats: {
        Row: {
          accepted: number
          canton: string
          category_id: string | null
          created_at: string
          explored: number
          id: string
          offered: number
          partner_id: string
          period_end: string
          period_start: string
          saturated_out: number
          skipped: number
          updated_at: string
        }
        Insert: {
          accepted?: number
          canton?: string
          category_id?: string | null
          created_at?: string
          explored?: number
          id?: string
          offered?: number
          partner_id: string
          period_end: string
          period_start: string
          saturated_out?: number
          skipped?: number
          updated_at?: string
        }
        Update: {
          accepted?: number
          canton?: string
          category_id?: string | null
          created_at?: string
          explored?: number
          id?: string
          offered?: number
          partner_id?: string
          period_end?: string
          period_start?: string
          saturated_out?: number
          skipped?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_allocation_stats_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "partner_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_allocation_stats_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_categories: {
        Row: {
          active: boolean
          created_at: string
          group: Database["public"]["Enums"]["partner_category_group"]
          id: string
          key: string
          label_de: string
          label_en: string
          label_fr: string
          label_i18n: Json
          label_it: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          group: Database["public"]["Enums"]["partner_category_group"]
          id?: string
          key: string
          label_de: string
          label_en: string
          label_fr: string
          label_i18n?: Json
          label_it: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          group?: Database["public"]["Enums"]["partner_category_group"]
          id?: string
          key?: string
          label_de?: string
          label_en?: string
          label_fr?: string
          label_i18n?: Json
          label_it?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      partner_contacts: {
        Row: {
          alternative_contact: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          mobile: string | null
          partner_id: string
          position: string
          preferred_language: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          alternative_contact?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          mobile?: string | null
          partner_id: string
          position?: string
          preferred_language?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          alternative_contact?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          mobile?: string | null
          partner_id?: string
          position?: string
          preferred_language?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_coverage: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          partner_id: string
          postcode_prefix: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          partner_id: string
          postcode_prefix?: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          partner_id?: string
          postcode_prefix?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_coverage_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "partner_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_coverage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_coverage_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "service_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_documents: {
        Row: {
          created_at: string
          doc_type: string
          expires_on: string | null
          file_name: string
          id: string
          mime_type: string
          partner_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number
          status: Database["public"]["Enums"]["partner_document_status"]
          storage_path: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          expires_on?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          partner_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["partner_document_status"]
          storage_path: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          expires_on?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          partner_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["partner_document_status"]
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_documents_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_fleet: {
        Row: {
          available_24_7: boolean
          capacity: string | null
          coverage_area: string
          created_at: string
          driver_included: boolean
          gps_tracking: boolean
          id: string
          intercity: boolean
          model_year_from: number | null
          model_year_to: number | null
          ownership: Database["public"]["Enums"]["partner_ownership"]
          partner_id: string
          updated_at: string
          vehicle_count: number
          vehicle_type: string
        }
        Insert: {
          available_24_7?: boolean
          capacity?: string | null
          coverage_area?: string
          created_at?: string
          driver_included?: boolean
          gps_tracking?: boolean
          id?: string
          intercity?: boolean
          model_year_from?: number | null
          model_year_to?: number | null
          ownership?: Database["public"]["Enums"]["partner_ownership"]
          partner_id: string
          updated_at?: string
          vehicle_count?: number
          vehicle_type?: string
        }
        Update: {
          available_24_7?: boolean
          capacity?: string | null
          coverage_area?: string
          created_at?: string
          driver_included?: boolean
          gps_tracking?: boolean
          id?: string
          intercity?: boolean
          model_year_from?: number | null
          model_year_to?: number | null
          ownership?: Database["public"]["Enums"]["partner_ownership"]
          partner_id?: string
          updated_at?: string
          vehicle_count?: number
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_fleet_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_internal: {
        Row: {
          account_manager_id: string | null
          classification: string | null
          created_at: string
          internal_score: number | null
          partner_id: string
          updated_at: string
        }
        Insert: {
          account_manager_id?: string | null
          classification?: string | null
          created_at?: string
          internal_score?: number | null
          partner_id: string
          updated_at?: string
        }
        Update: {
          account_manager_id?: string | null
          classification?: string | null
          created_at?: string
          internal_score?: number | null
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_internal_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_notes: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          id: string
          partner_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          partner_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_notes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_opportunities: {
        Row: {
          allocation_kind: string
          allocation_reason: string
          amount: number | null
          created_at: string
          currency: string
          decline_reason: string
          description: string
          ends_on: string | null
          id: string
          is_backup: boolean
          lead_id: string | null
          match_reasons: Json
          match_score: number | null
          partner_id: string | null
          reference: string
          respond_by: string | null
          responded_at: string | null
          sent_at: string | null
          starts_on: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          allocation_kind?: string
          allocation_reason?: string
          amount?: number | null
          created_at?: string
          currency?: string
          decline_reason?: string
          description?: string
          ends_on?: string | null
          id?: string
          is_backup?: boolean
          lead_id?: string | null
          match_reasons?: Json
          match_score?: number | null
          partner_id?: string | null
          reference?: string
          respond_by?: string | null
          responded_at?: string | null
          sent_at?: string | null
          starts_on?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          allocation_kind?: string
          allocation_reason?: string
          amount?: number | null
          created_at?: string
          currency?: string
          decline_reason?: string
          description?: string
          ends_on?: string | null
          id?: string
          is_backup?: boolean
          lead_id?: string | null
          match_reasons?: Json
          match_score?: number | null
          partner_id?: string | null
          reference?: string
          respond_by?: string | null
          responded_at?: string | null
          sent_at?: string | null
          starts_on?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_opportunities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_performance: {
        Row: {
          avg_customer_rating: number
          avg_response_minutes: number
          cancellations: number
          complaints: number
          computed_at: string
          created_at: string
          jobs_completed: number
          jobs_on_time: number
          jobs_won: number
          opportunities_accepted: number
          opportunities_declined: number
          opportunities_sent: number
          opportunities_timed_out: number
          partner_id: string
          quotes_submitted: number
          score: number
          updated_at: string
        }
        Insert: {
          avg_customer_rating?: number
          avg_response_minutes?: number
          cancellations?: number
          complaints?: number
          computed_at?: string
          created_at?: string
          jobs_completed?: number
          jobs_on_time?: number
          jobs_won?: number
          opportunities_accepted?: number
          opportunities_declined?: number
          opportunities_sent?: number
          opportunities_timed_out?: number
          partner_id: string
          quotes_submitted?: number
          score?: number
          updated_at?: string
        }
        Update: {
          avg_customer_rating?: number
          avg_response_minutes?: number
          cancellations?: number
          complaints?: number
          computed_at?: string
          created_at?: string
          jobs_completed?: number
          jobs_on_time?: number
          jobs_won?: number
          opportunities_accepted?: number
          opportunities_declined?: number
          opportunities_sent?: number
          opportunities_timed_out?: number
          partner_id?: string
          quotes_submitted?: number
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_performance_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_quotations: {
        Row: {
          amount_net: number | null
          amount_total: number | null
          created_at: string
          currency: string
          description: string
          id: string
          opportunity_id: string | null
          partner_id: string | null
          reference: string
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          amount_net?: number | null
          amount_total?: number | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          opportunity_id?: string | null
          partner_id?: string | null
          reference?: string
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          amount_net?: number | null
          amount_total?: number | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          opportunity_id?: string | null
          partner_id?: string | null
          reference?: string
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_quotations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_quotations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_quotes: {
        Row: {
          availability_date: string | null
          completion_days: number | null
          conditions: string
          created_at: string
          currency: string
          id: string
          lead_id: string | null
          notes: string
          opportunity_id: string | null
          partner_cost: number
          partner_id: string
          status: Database["public"]["Enums"]["partner_quote_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          availability_date?: string | null
          completion_days?: number | null
          conditions?: string
          created_at?: string
          currency?: string
          id?: string
          lead_id?: string | null
          notes?: string
          opportunity_id?: string | null
          partner_cost?: number
          partner_id: string
          status?: Database["public"]["Enums"]["partner_quote_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          availability_date?: string | null
          completion_days?: number | null
          conditions?: string
          created_at?: string
          currency?: string
          id?: string
          lead_id?: string | null
          notes?: string
          opportunity_id?: string | null
          partner_cost?: number
          partner_id?: string
          status?: Database["public"]["Enums"]["partner_quote_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_quotes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_quotes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_ratings: {
        Row: {
          actor_id: string | null
          created_at: string
          criterion: string
          id: string
          max_score: number
          note: string
          partner_id: string
          score: number
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          criterion?: string
          id?: string
          max_score?: number
          note?: string
          partner_id: string
          score?: number
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          criterion?: string
          id?: string
          max_score?: number
          note?: string
          partner_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_ratings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_services: {
        Row: {
          approved: boolean
          approved_cities: string[]
          available_24_7: boolean
          available_manpower: number | null
          callout_charge: number | null
          category_id: string
          coverage_cities: string[]
          created_at: string
          daily_rate: number | null
          emergency_available: boolean
          hourly_rate: number | null
          id: string
          monthly_rate: number | null
          notes: string
          partner_id: string
          pricing_method: Database["public"]["Enums"]["partner_pricing_method"]
          transport_rate: number | null
          updated_at: string
        }
        Insert: {
          approved?: boolean
          approved_cities?: string[]
          available_24_7?: boolean
          available_manpower?: number | null
          callout_charge?: number | null
          category_id: string
          coverage_cities?: string[]
          created_at?: string
          daily_rate?: number | null
          emergency_available?: boolean
          hourly_rate?: number | null
          id?: string
          monthly_rate?: number | null
          notes?: string
          partner_id: string
          pricing_method?: Database["public"]["Enums"]["partner_pricing_method"]
          transport_rate?: number | null
          updated_at?: string
        }
        Update: {
          approved?: boolean
          approved_cities?: string[]
          available_24_7?: boolean
          available_manpower?: number | null
          callout_charge?: number | null
          category_id?: string
          coverage_cities?: string[]
          created_at?: string
          daily_rate?: number | null
          emergency_available?: boolean
          hourly_rate?: number | null
          id?: string
          monthly_rate?: number | null
          notes?: string
          partner_id?: string
          pricing_method?: Database["public"]["Enums"]["partner_pricing_method"]
          transport_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "partner_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_services_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["partner_status"] | null
          id: string
          note: string
          partner_id: string
          to_status: Database["public"]["Enums"]["partner_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["partner_status"] | null
          id?: string
          note?: string
          partner_id: string
          to_status: Database["public"]["Enums"]["partner_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["partner_status"] | null
          id?: string
          note?: string
          partner_id?: string
          to_status?: Database["public"]["Enums"]["partner_status"]
        }
        Relationships: [
          {
            foreignKeyName: "partner_status_history_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_users: {
        Row: {
          created_at: string
          id: string
          partner_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_work_orders: {
        Row: {
          amount_total: number | null
          completed_date: string | null
          created_at: string
          currency: string
          description: string
          id: string
          partner_id: string | null
          quotation_id: string | null
          reference: string
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount_total?: number | null
          completed_date?: string | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          partner_id?: string | null
          quotation_id?: string | null
          reference?: string
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          amount_total?: number | null
          completed_date?: string | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          partner_id?: string | null
          quotation_id?: string | null
          reference?: string
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_work_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_work_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "partner_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_workforce: {
        Row: {
          accommodation_provided: boolean
          category: string
          created_at: string
          id: string
          mobilisation_days: number | null
          partner_id: string
          ppe_provided: boolean
          skill_level: Database["public"]["Enums"]["partner_skill_level"]
          transport_provided: boolean
          updated_at: string
          worker_count: number
        }
        Insert: {
          accommodation_provided?: boolean
          category?: string
          created_at?: string
          id?: string
          mobilisation_days?: number | null
          partner_id: string
          ppe_provided?: boolean
          skill_level?: Database["public"]["Enums"]["partner_skill_level"]
          transport_provided?: boolean
          updated_at?: string
          worker_count?: number
        }
        Update: {
          accommodation_provided?: boolean
          category?: string
          created_at?: string
          id?: string
          mobilisation_days?: number | null
          partner_id?: string
          ppe_provided?: boolean
          skill_level?: Database["public"]["Enums"]["partner_skill_level"]
          transport_provided?: boolean
          updated_at?: string
          worker_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_workforce_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string
          areas_served: string[]
          city: string
          company_size: string | null
          country: string
          created_at: string
          created_by: string
          employee_count: number | null
          entity_type: Database["public"]["Enums"]["partner_entity_type"]
          id: string
          legal_name: string
          reference: string
          registration_number: string | null
          status: Database["public"]["Enums"]["partner_status"]
          technician_count: number | null
          trading_name: string
          updated_at: string
          vat_number: string | null
          vehicle_count: number | null
          website: string | null
          workforce_notes: string
          year_established: number | null
        }
        Insert: {
          address?: string
          areas_served?: string[]
          city?: string
          company_size?: string | null
          country?: string
          created_at?: string
          created_by: string
          employee_count?: number | null
          entity_type?: Database["public"]["Enums"]["partner_entity_type"]
          id?: string
          legal_name?: string
          reference?: string
          registration_number?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          technician_count?: number | null
          trading_name?: string
          updated_at?: string
          vat_number?: string | null
          vehicle_count?: number | null
          website?: string | null
          workforce_notes?: string
          year_established?: number | null
        }
        Update: {
          address?: string
          areas_served?: string[]
          city?: string
          company_size?: string | null
          country?: string
          created_at?: string
          created_by?: string
          employee_count?: number | null
          entity_type?: Database["public"]["Enums"]["partner_entity_type"]
          id?: string
          legal_name?: string
          reference?: string
          registration_number?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          technician_count?: number | null
          trading_name?: string
          updated_at?: string
          vat_number?: string | null
          vehicle_count?: number | null
          website?: string | null
          workforce_notes?: string
          year_established?: number | null
        }
        Relationships: []
      }
      portfolio_price_overrides: {
        Row: {
          archived: boolean
          created_at: string
          currency: string
          id: string
          note: string
          organization_id: string
          price: number
          property_id: string | null
          service: string
          unit_id: string | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          currency?: string
          id?: string
          note?: string
          organization_id: string
          price: number
          property_id?: string | null
          service: string
          unit_id?: string | null
          unit_type?: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          currency?: string
          id?: string
          note?: string
          organization_id?: string
          price?: number
          property_id?: string | null
          service?: string
          unit_id?: string | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_price_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_price_overrides_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_price_overrides_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_configurations: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          market: string
          min_hours: number | null
          min_hours_basis: string | null
          name: string
          notes: string
          operational_number: number | null
          published_at: string | null
          published_by: string | null
          status: Database["public"]["Enums"]["pricing_config_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          effective_from?: string
          id?: string
          market?: string
          min_hours?: number | null
          min_hours_basis?: string | null
          name?: string
          notes?: string
          operational_number?: number | null
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["pricing_config_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          market?: string
          min_hours?: number | null
          min_hours_basis?: string | null
          name?: string
          notes?: string
          operational_number?: number | null
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["pricing_config_status"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          band_id: string
          configuration_id: string
          created_at: string
          currency: string
          gap_after_intentional: boolean
          id: string
          price: number
          property_type: string
          requires_commercial_review: boolean
          room_max: number | null
          room_min: number | null
          service: string
          sort_order: number
          unit_type: string
          updated_at: string
        }
        Insert: {
          band_id?: string
          configuration_id: string
          created_at?: string
          currency?: string
          gap_after_intentional?: boolean
          id?: string
          price?: number
          property_type?: string
          requires_commercial_review?: boolean
          room_max?: number | null
          room_min?: number | null
          service: string
          sort_order?: number
          unit_type?: string
          updated_at?: string
        }
        Update: {
          band_id?: string
          configuration_id?: string
          created_at?: string
          currency?: string
          gap_after_intentional?: boolean
          id?: string
          price?: number
          property_type?: string
          requires_commercial_review?: boolean
          room_max?: number | null
          room_min?: number | null
          service?: string
          sort_order?: number
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "pricing_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["portal_role"]
          ui_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["portal_role"]
          ui_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["portal_role"]
          ui_language?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          archived: boolean
          canton: string
          city: string
          created_at: string
          id: string
          notes: string
          organization_id: string
          reference: string
          unit_count: number
          updated_at: string
          zip: string
        }
        Insert: {
          address: string
          archived?: boolean
          canton?: string
          city?: string
          created_at?: string
          id?: string
          notes?: string
          organization_id: string
          reference?: string
          unit_count?: number
          updated_at?: string
          zip?: string
        }
        Update: {
          address?: string
          archived?: boolean
          canton?: string
          city?: string
          created_at?: string
          id?: string
          notes?: string
          organization_id?: string
          reference?: string
          unit_count?: number
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: string
          mime_type: string
          quote_id: string
          size_bytes: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          mime_type?: string
          quote_id: string
          size_bytes?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          mime_type?: string
          quote_id?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_attachments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_price_overrides: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          new_total: number
          old_total: number
          quote_id: string
          reason: string
          version: number
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          new_total: number
          old_total: number
          quote_id: string
          reason?: string
          version: number
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          new_total?: number
          old_total?: number
          quote_id?: string
          reason?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_price_overrides_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_versions: {
        Row: {
          billing_basis: Json | null
          created_at: string
          currency: string
          discount: number
          id: string
          line_items: Json
          minimum_billing: Json | null
          net: number
          options: Json
          price_list_number: number | null
          pricing_configuration_id: string | null
          pricing_mode: string
          quote_id: string
          subtotal: number
          total: number
          vat: number
          vat_rate: number
          version: number
        }
        Insert: {
          billing_basis?: Json | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          line_items?: Json
          minimum_billing?: Json | null
          net?: number
          options?: Json
          price_list_number?: number | null
          pricing_configuration_id?: string | null
          pricing_mode?: string
          quote_id: string
          subtotal?: number
          total?: number
          vat?: number
          vat_rate?: number
          version: number
        }
        Update: {
          billing_basis?: Json | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          line_items?: Json
          minimum_billing?: Json | null
          net?: number
          options?: Json
          price_list_number?: number | null
          pricing_configuration_id?: string | null
          pricing_mode?: string
          quote_id?: string
          subtotal?: number
          total?: number
          vat?: number
          vat_rate?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_versions_pricing_configuration_id_fkey"
            columns: ["pricing_configuration_id"]
            isOneToOne: false
            referencedRelation: "pricing_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_versions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          accepted_by_name: string | null
          accepted_options: Json | null
          accepted_snapshot: Json | null
          accepted_version: number | null
          access_score: number | null
          archived_at: string | null
          archived_by: string | null
          billing_basis: Json | null
          boxes: number | null
          calculated_total: number | null
          carry: number | null
          created_at: string
          crew: number | null
          customer_city: string | null
          customer_company: string | null
          customer_country: string | null
          customer_email: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_notified_at: string | null
          customer_notify_error: string
          customer_phone: string | null
          customer_street: string | null
          customer_zip: string | null
          discount_rate: number | null
          distance_confirmed_at: string | null
          distance_confirmed_by: string | null
          distance_km: number | null
          distance_source: string
          enquiry_id: string | null
          floor_in: number | null
          floor_out: number | null
          from_address: string | null
          from_zip: string | null
          hoist: boolean | null
          id: string
          internal_notified_at: string | null
          internal_notify_error: string
          is_test: boolean
          items: Json | null
          job_id: string | null
          language: string
          lead_id: string | null
          lift: string | null
          load_hours: number | null
          manual_adjustment: number
          manual_adjustment_at: string | null
          manual_adjustment_by: string
          manual_adjustment_customer_note: string | null
          manual_adjustment_reason: string
          min_hours_attested_at: string | null
          min_hours_attested_by: string | null
          min_hours_note: string
          min_hours_people: number | null
          move_date: string | null
          narrow_stairs: boolean | null
          options: Json
          parking: number | null
          permit: boolean | null
          price_high: number | null
          price_list_number: number | null
          price_low: number | null
          price_net: number | null
          price_stage: Database["public"]["Enums"]["price_stage"]
          price_total: number | null
          price_vat: number | null
          pricing_configuration_id: string | null
          pricing_mode: string
          property_type: string | null
          reference: string
          review_status: string
          review_submitted_at: string | null
          room_units: number | null
          score_label: string | null
          sent_at: string | null
          sent_version: number | null
          services: Json | null
          source: string
          status: string
          to_address: string | null
          to_zip: string | null
          total_hours: number | null
          updated_at: string
          vans: number | null
          version: number
          volume_m3: number | null
          workflow_stage: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_name?: string | null
          accepted_options?: Json | null
          accepted_snapshot?: Json | null
          accepted_version?: number | null
          access_score?: number | null
          archived_at?: string | null
          archived_by?: string | null
          billing_basis?: Json | null
          boxes?: number | null
          calculated_total?: number | null
          carry?: number | null
          created_at?: string
          crew?: number | null
          customer_city?: string | null
          customer_company?: string | null
          customer_country?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_notified_at?: string | null
          customer_notify_error?: string
          customer_phone?: string | null
          customer_street?: string | null
          customer_zip?: string | null
          discount_rate?: number | null
          distance_confirmed_at?: string | null
          distance_confirmed_by?: string | null
          distance_km?: number | null
          distance_source?: string
          enquiry_id?: string | null
          floor_in?: number | null
          floor_out?: number | null
          from_address?: string | null
          from_zip?: string | null
          hoist?: boolean | null
          id?: string
          internal_notified_at?: string | null
          internal_notify_error?: string
          is_test?: boolean
          items?: Json | null
          job_id?: string | null
          language?: string
          lead_id?: string | null
          lift?: string | null
          load_hours?: number | null
          manual_adjustment?: number
          manual_adjustment_at?: string | null
          manual_adjustment_by?: string
          manual_adjustment_customer_note?: string | null
          manual_adjustment_reason?: string
          min_hours_attested_at?: string | null
          min_hours_attested_by?: string | null
          min_hours_note?: string
          min_hours_people?: number | null
          move_date?: string | null
          narrow_stairs?: boolean | null
          options?: Json
          parking?: number | null
          permit?: boolean | null
          price_high?: number | null
          price_list_number?: number | null
          price_low?: number | null
          price_net?: number | null
          price_stage?: Database["public"]["Enums"]["price_stage"]
          price_total?: number | null
          price_vat?: number | null
          pricing_configuration_id?: string | null
          pricing_mode?: string
          property_type?: string | null
          reference: string
          review_status?: string
          review_submitted_at?: string | null
          room_units?: number | null
          score_label?: string | null
          sent_at?: string | null
          sent_version?: number | null
          services?: Json | null
          source?: string
          status?: string
          to_address?: string | null
          to_zip?: string | null
          total_hours?: number | null
          updated_at?: string
          vans?: number | null
          version?: number
          volume_m3?: number | null
          workflow_stage?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_name?: string | null
          accepted_options?: Json | null
          accepted_snapshot?: Json | null
          accepted_version?: number | null
          access_score?: number | null
          archived_at?: string | null
          archived_by?: string | null
          billing_basis?: Json | null
          boxes?: number | null
          calculated_total?: number | null
          carry?: number | null
          created_at?: string
          crew?: number | null
          customer_city?: string | null
          customer_company?: string | null
          customer_country?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_notified_at?: string | null
          customer_notify_error?: string
          customer_phone?: string | null
          customer_street?: string | null
          customer_zip?: string | null
          discount_rate?: number | null
          distance_confirmed_at?: string | null
          distance_confirmed_by?: string | null
          distance_km?: number | null
          distance_source?: string
          enquiry_id?: string | null
          floor_in?: number | null
          floor_out?: number | null
          from_address?: string | null
          from_zip?: string | null
          hoist?: boolean | null
          id?: string
          internal_notified_at?: string | null
          internal_notify_error?: string
          is_test?: boolean
          items?: Json | null
          job_id?: string | null
          language?: string
          lead_id?: string | null
          lift?: string | null
          load_hours?: number | null
          manual_adjustment?: number
          manual_adjustment_at?: string | null
          manual_adjustment_by?: string
          manual_adjustment_customer_note?: string | null
          manual_adjustment_reason?: string
          min_hours_attested_at?: string | null
          min_hours_attested_by?: string | null
          min_hours_note?: string
          min_hours_people?: number | null
          move_date?: string | null
          narrow_stairs?: boolean | null
          options?: Json
          parking?: number | null
          permit?: boolean | null
          price_high?: number | null
          price_list_number?: number | null
          price_low?: number | null
          price_net?: number | null
          price_stage?: Database["public"]["Enums"]["price_stage"]
          price_total?: number | null
          price_vat?: number | null
          pricing_configuration_id?: string | null
          pricing_mode?: string
          property_type?: string | null
          reference?: string
          review_status?: string
          review_submitted_at?: string | null
          room_units?: number | null
          score_label?: string | null
          sent_at?: string | null
          sent_version?: number | null
          services?: Json | null
          source?: string
          status?: string
          to_address?: string | null
          to_zip?: string | null
          total_hours?: number | null
          updated_at?: string
          vans?: number | null
          version?: number
          volume_m3?: number | null
          workflow_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_execution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_pricing_configuration_id_fkey"
            columns: ["pricing_configuration_id"]
            isOneToOne: false
            referencedRelation: "pricing_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes_customer: {
        Row: {
          accepted_at: string | null
          created_at: string
          currency: string
          discount: number
          disposal: number
          equipment: number
          id: string
          labour: number
          language: string
          lead_id: string | null
          line_items: Json
          materials: number
          min_hours_attested_at: string | null
          min_hours_attested_by: string | null
          min_hours_note: string
          min_hours_people: number | null
          min_hours_rate: number | null
          price_list_version_id: string | null
          price_stage: Database["public"]["Enums"]["price_stage"]
          reference: string
          sent_at: string | null
          source_quote_id: string | null
          status: Database["public"]["Enums"]["customer_quote_status"]
          terms: string
          total: number
          transport: number
          updated_at: string
          valid_until: string | null
          vat: number
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          currency?: string
          discount?: number
          disposal?: number
          equipment?: number
          id?: string
          labour?: number
          language?: string
          lead_id?: string | null
          line_items?: Json
          materials?: number
          min_hours_attested_at?: string | null
          min_hours_attested_by?: string | null
          min_hours_note?: string
          min_hours_people?: number | null
          min_hours_rate?: number | null
          price_list_version_id?: string | null
          price_stage?: Database["public"]["Enums"]["price_stage"]
          reference?: string
          sent_at?: string | null
          source_quote_id?: string | null
          status?: Database["public"]["Enums"]["customer_quote_status"]
          terms?: string
          total?: number
          transport?: number
          updated_at?: string
          valid_until?: string | null
          vat?: number
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          currency?: string
          discount?: number
          disposal?: number
          equipment?: number
          id?: string
          labour?: number
          language?: string
          lead_id?: string | null
          line_items?: Json
          materials?: number
          min_hours_attested_at?: string | null
          min_hours_attested_by?: string | null
          min_hours_note?: string
          min_hours_people?: number | null
          min_hours_rate?: number | null
          price_list_version_id?: string | null
          price_stage?: Database["public"]["Enums"]["price_stage"]
          reference?: string
          sent_at?: string | null
          source_quote_id?: string | null
          status?: Database["public"]["Enums"]["customer_quote_status"]
          terms?: string
          total?: number
          transport?: number
          updated_at?: string
          valid_until?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_price_list_version_id_fkey"
            columns: ["price_list_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_source_quote_id_fkey"
            columns: ["source_quote_id"]
            isOneToOne: false
            referencedRelation: "partner_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      readiness_attestations: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_name: string
          created_at: string
          id: string
          key: string
          note: string
          updated_at: string
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_name?: string
          created_at?: string
          id?: string
          key: string
          note?: string
          updated_at?: string
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_name?: string
          created_at?: string
          id?: string
          key?: string
          note?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_availability: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string
          resource_id: string
          resource_kind: Database["public"]["Enums"]["resource_kind"]
          state: Database["public"]["Enums"]["availability_state"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          note?: string
          resource_id: string
          resource_kind: Database["public"]["Enums"]["resource_kind"]
          state?: Database["public"]["Enums"]["availability_state"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string
          resource_id?: string
          resource_kind?: Database["public"]["Enums"]["resource_kind"]
          state?: Database["public"]["Enums"]["availability_state"]
          updated_at?: string
        }
        Relationships: []
      }
      retention_rules: {
        Row: {
          action: string
          active: boolean
          condition: string
          created_at: string
          entity: string
          id: string
          label: string
          note: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          action?: string
          active?: boolean
          condition?: string
          created_at?: string
          entity: string
          id?: string
          label?: string
          note?: string
          retention_days?: number
          updated_at?: string
        }
        Update: {
          action?: string
          active?: boolean
          condition?: string
          created_at?: string
          entity?: string
          id?: string
          label?: string
          note?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      retention_runs: {
        Row: {
          actor_id: string | null
          created_at: string
          dry_run: boolean
          id: string
          ran_at: string
          summary: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          dry_run?: boolean
          id?: string
          ran_at?: string
          summary?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          dry_run?: boolean
          id?: string
          ran_at?: string
          summary?: Json
        }
        Relationships: []
      }
      review_settings: {
        Row: {
          enabled: boolean
          google_review_url: string
          id: string
          low_rating_threshold: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          google_review_url?: string
          id?: string
          low_rating_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          google_review_url?: string
          id?: string
          low_rating_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      risk_email_domains: {
        Row: {
          active: boolean
          created_at: string
          domain: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          domain: string
        }
        Update: {
          active?: boolean
          created_at?: string
          domain?: string
        }
        Relationships: []
      }
      risk_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          note: string
          signal: string
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          note?: string
          signal: string
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          note?: string
          signal?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      role_change_audit: {
        Row: {
          actor_id: string | null
          created_at: string
          from_role: string | null
          id: string
          note: string
          subject_id: string
          to_role: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_role?: string | null
          id?: string
          note?: string
          subject_id: string
          to_role?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_role?: string | null
          id?: string
          note?: string
          subject_id?: string
          to_role?: string | null
        }
        Relationships: []
      }
      service_catalogue: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          id: string
          key: string
          label_de: string
          label_en: string
          label_fr: string
          label_i18n: Json
          label_it: string
          sort_order: number
          unit: Database["public"]["Enums"]["service_unit"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          key: string
          label_de?: string
          label_en?: string
          label_fr?: string
          label_i18n?: Json
          label_it?: string
          sort_order?: number
          unit: Database["public"]["Enums"]["service_unit"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          key?: string
          label_de?: string
          label_en?: string
          label_fr?: string
          label_i18n?: Json
          label_it?: string
          sort_order?: number
          unit?: Database["public"]["Enums"]["service_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalogue_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "partner_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_rates: {
        Row: {
          catalogue_id: string
          cost_price: number | null
          country: string
          created_at: string
          currency: string
          id: string
          min_margin_pct: number | null
          scope: Database["public"]["Enums"]["rate_scope"]
          scope_ref: string
          sell_price: number | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          catalogue_id: string
          cost_price?: number | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          min_margin_pct?: number | null
          scope?: Database["public"]["Enums"]["rate_scope"]
          scope_ref?: string
          sell_price?: number | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          catalogue_id?: string
          cost_price?: number | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          min_margin_pct?: number | null
          scope?: Database["public"]["Enums"]["rate_scope"]
          scope_ref?: string
          sell_price?: number | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_rates_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "service_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_rates_country_fkey"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["country"]
          },
        ]
      }
      service_schedules: {
        Row: {
          active: boolean
          created_at: string
          custom_cron: string
          day_of_month: number | null
          frequency: Database["public"]["Enums"]["service_frequency"]
          id: string
          last_generated_on: string | null
          lead_time_days: number
          month_offset: number
          next_due_on: string
          paused_until: string | null
          site_service_id: string
          updated_at: string
          weekday: number | null
          window_end_time: string
          window_start_time: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          custom_cron?: string
          day_of_month?: number | null
          frequency?: Database["public"]["Enums"]["service_frequency"]
          id?: string
          last_generated_on?: string | null
          lead_time_days?: number
          month_offset?: number
          next_due_on?: string
          paused_until?: string | null
          site_service_id: string
          updated_at?: string
          weekday?: number | null
          window_end_time?: string
          window_start_time?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          custom_cron?: string
          day_of_month?: number | null
          frequency?: Database["public"]["Enums"]["service_frequency"]
          id?: string
          last_generated_on?: string | null
          lead_time_days?: number
          month_offset?: number
          next_due_on?: string
          paused_until?: string | null
          site_service_id?: string
          updated_at?: string
          weekday?: number | null
          window_end_time?: string
          window_start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_schedules_site_service_id_fkey"
            columns: ["site_service_id"]
            isOneToOne: false
            referencedRelation: "site_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_zones: {
        Row: {
          active: boolean
          canton: string
          city: string
          country: string
          created_at: string
          id: string
          postcode_prefix: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          canton?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          postcode_prefix?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          canton?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          postcode_prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_services: {
        Row: {
          active: boolean
          agreed_price: number | null
          catalogue_id: string
          created_at: string
          frequency: Database["public"]["Enums"]["service_frequency"]
          id: string
          preferred_fulfilment: Database["public"]["Enums"]["fulfilment_pref"]
          preferred_partner_id: string | null
          preferred_team_id: string | null
          site_id: string
          sla_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          agreed_price?: number | null
          catalogue_id: string
          created_at?: string
          frequency?: Database["public"]["Enums"]["service_frequency"]
          id?: string
          preferred_fulfilment?: Database["public"]["Enums"]["fulfilment_pref"]
          preferred_partner_id?: string | null
          preferred_team_id?: string | null
          site_id: string
          sla_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          agreed_price?: number | null
          catalogue_id?: string
          created_at?: string
          frequency?: Database["public"]["Enums"]["service_frequency"]
          id?: string
          preferred_fulfilment?: Database["public"]["Enums"]["fulfilment_pref"]
          preferred_partner_id?: string | null
          preferred_team_id?: string | null
          site_id?: string
          sla_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_services_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "service_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_services_preferred_partner_id_fkey"
            columns: ["preferred_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_services_preferred_team_id_fkey"
            columns: ["preferred_team_id"]
            isOneToOne: false
            referencedRelation: "internal_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_services_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "account_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_services_sla_fk"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "slas"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          assigned_id: string | null
          assigned_kind: Database["public"]["Enums"]["resource_kind"] | null
          completed_at: string | null
          created_at: string
          id: string
          lead_id: string
          measurements: Json
          notes: string
          photos: Json
          scheduled_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_id?: string | null
          assigned_kind?: Database["public"]["Enums"]["resource_kind"] | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id: string
          measurements?: Json
          notes?: string
          photos?: Json
          scheduled_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_id?: string | null
          assigned_kind?: Database["public"]["Enums"]["resource_kind"] | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          measurements?: Json
          notes?: string
          photos?: Json
          scheduled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      slas: {
        Row: {
          active: boolean
          business_hours: Json
          country: string
          coverage: Database["public"]["Enums"]["sla_coverage"]
          created_at: string
          emergency_rate_multiplier: number
          id: string
          name: string
          penalty_type: Database["public"]["Enums"]["sla_penalty_type"]
          penalty_value: number
          resolution_hours: number
          response_minutes: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_hours?: Json
          country?: string
          coverage?: Database["public"]["Enums"]["sla_coverage"]
          created_at?: string
          emergency_rate_multiplier?: number
          id?: string
          name: string
          penalty_type?: Database["public"]["Enums"]["sla_penalty_type"]
          penalty_value?: number
          resolution_hours: number
          response_minutes: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_hours?: Json
          country?: string
          coverage?: Database["public"]["Enums"]["sla_coverage"]
          created_at?: string
          emergency_rate_multiplier?: number
          id?: string
          name?: string
          penalty_type?: Database["public"]["Enums"]["sla_penalty_type"]
          penalty_value?: number
          resolution_hours?: number
          response_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slas_country_fkey"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["country"]
          },
        ]
      }
      source_costs: {
        Row: {
          created_at: string
          currency: string
          id: string
          note: string
          period_end: string
          period_start: string
          source_id: string
          spend: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          note?: string
          period_end: string
          period_start: string
          source_id: string
          spend?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          note?: string
          period_end?: string
          period_start?: string
          source_id?: string
          spend?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_costs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      swiss_postcodes: {
        Row: {
          bfs_nr: number | null
          canton: string
          created_at: string
          dataset_version: string
          id: string
          language: string | null
          locality: string
          municipality: string | null
          plz: number
          source: string
          updated_at: string
        }
        Insert: {
          bfs_nr?: number | null
          canton: string
          created_at?: string
          dataset_version: string
          id?: string
          language?: string | null
          locality: string
          municipality?: string | null
          plz: number
          source: string
          updated_at?: string
        }
        Update: {
          bfs_nr?: number | null
          canton?: string
          created_at?: string
          dataset_version?: string
          id?: string
          language?: string | null
          locality?: string
          municipality?: string | null
          plz?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string
          employee_id: string
          ended_at: string | null
          id: string
          job_id: string | null
          minutes: number | null
          note: string
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          ended_at?: string | null
          id?: string
          job_id?: string | null
          minutes?: number | null
          note?: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          ended_at?: string | null
          id?: string
          job_id?: string | null
          minutes?: number | null
          note?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_execution"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_occupants: {
        Row: {
          archived: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          moves_out_on: string | null
          notes: string
          organization_id: string
          phone: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          email?: string
          full_name: string
          id?: string
          moves_out_on?: string | null
          notes?: string
          organization_id: string
          phone?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          moves_out_on?: string | null
          notes?: string
          organization_id?: string
          phone?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_occupants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_occupants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          archived: boolean
          created_at: string
          floor: number
          has_lift: boolean
          id: string
          label: string
          notes: string
          organization_id: string
          property_id: string
          rooms: number | null
          size_m2: number | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          floor?: number
          has_lift?: boolean
          id?: string
          label: string
          notes?: string
          organization_id: string
          property_id: string
          rooms?: number | null
          size_m2?: number | null
          unit_type?: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          floor?: number
          has_lift?: boolean
          id?: string
          label?: string
          notes?: string
          organization_id?: string
          property_id?: string
          rooms?: number | null
          size_m2?: number | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          capacity_m3: number
          created_at: string
          id: string
          inspection_due: string | null
          insurance_expiry: string | null
          label: string
          note: string
          plate: string
          service_due: string | null
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          active?: boolean
          capacity_m3?: number
          created_at?: string
          id?: string
          inspection_due?: string | null
          insurance_expiry?: string | null
          label?: string
          note?: string
          plate: string
          service_due?: string | null
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          active?: boolean
          capacity_m3?: number
          created_at?: string
          id?: string
          inspection_due?: string | null
          insurance_expiry?: string | null
          label?: string
          note?: string
          plate?: string
          service_due?: string | null
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          account_id: string
          catalogue_id: string | null
          contract_id: string | null
          cost: number | null
          created_at: string
          due_on: string
          id: string
          invoice_id: string | null
          job_execution_id: string | null
          lead_id: string | null
          note: string
          opportunity_id: string | null
          partner_id: string | null
          preferred_fulfilment: Database["public"]["Enums"]["fulfilment_pref"]
          reference: string
          reported_at: string
          resolution_due_at: string | null
          resolved_at: string | null
          responded_at: string | null
          response_due_at: string | null
          schedule_id: string | null
          service: string
          site_id: string
          sla_id: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          team_id: string | null
          updated_at: string
          value: number | null
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          account_id: string
          catalogue_id?: string | null
          contract_id?: string | null
          cost?: number | null
          created_at?: string
          due_on?: string
          id?: string
          invoice_id?: string | null
          job_execution_id?: string | null
          lead_id?: string | null
          note?: string
          opportunity_id?: string | null
          partner_id?: string | null
          preferred_fulfilment?: Database["public"]["Enums"]["fulfilment_pref"]
          reference?: string
          reported_at?: string
          resolution_due_at?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          response_due_at?: string | null
          schedule_id?: string | null
          service?: string
          site_id: string
          sla_id?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          team_id?: string | null
          updated_at?: string
          value?: number | null
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          account_id?: string
          catalogue_id?: string | null
          contract_id?: string | null
          cost?: number | null
          created_at?: string
          due_on?: string
          id?: string
          invoice_id?: string | null
          job_execution_id?: string | null
          lead_id?: string | null
          note?: string
          opportunity_id?: string | null
          partner_id?: string | null
          preferred_fulfilment?: Database["public"]["Enums"]["fulfilment_pref"]
          reference?: string
          reported_at?: string
          resolution_due_at?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          response_due_at?: string | null
          schedule_id?: string | null
          service?: string
          site_id?: string
          sla_id?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          team_id?: string | null
          updated_at?: string
          value?: number | null
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "service_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_invoice_fk"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_job_execution_id_fkey"
            columns: ["job_execution_id"]
            isOneToOne: false
            referencedRelation: "jobs_execution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "service_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "account_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "slas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "internal_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          entity: string
          entity_id: string
          id: string
          reference: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity: string
          entity_id: string
          id?: string
          reference?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string
          id?: string
          reference?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_partner_quote: {
        Args: { _note?: string; _quote_id: string }
        Returns: string
      }
      accept_public_quote: {
        Args: {
          _accepted_by_name?: string
          _contact: string
          _reference: string
          _total: number
          _version: number
        }
        Returns: {
          accepted_at: string
          accepted_version: number
          reference: string
          total: number
        }[]
      }
      accept_quote_version: {
        Args: {
          _accepted_by_name: string
          _options: Json
          _quote_id: string
          _total: number
          _version: number
        }
        Returns: {
          accepted_at: string | null
          accepted_by_name: string | null
          accepted_options: Json | null
          accepted_snapshot: Json | null
          accepted_version: number | null
          access_score: number | null
          archived_at: string | null
          archived_by: string | null
          billing_basis: Json | null
          boxes: number | null
          calculated_total: number | null
          carry: number | null
          created_at: string
          crew: number | null
          customer_city: string | null
          customer_company: string | null
          customer_country: string | null
          customer_email: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_notified_at: string | null
          customer_notify_error: string
          customer_phone: string | null
          customer_street: string | null
          customer_zip: string | null
          discount_rate: number | null
          distance_confirmed_at: string | null
          distance_confirmed_by: string | null
          distance_km: number | null
          distance_source: string
          enquiry_id: string | null
          floor_in: number | null
          floor_out: number | null
          from_address: string | null
          from_zip: string | null
          hoist: boolean | null
          id: string
          internal_notified_at: string | null
          internal_notify_error: string
          is_test: boolean
          items: Json | null
          job_id: string | null
          language: string
          lead_id: string | null
          lift: string | null
          load_hours: number | null
          manual_adjustment: number
          manual_adjustment_at: string | null
          manual_adjustment_by: string
          manual_adjustment_customer_note: string | null
          manual_adjustment_reason: string
          min_hours_attested_at: string | null
          min_hours_attested_by: string | null
          min_hours_note: string
          min_hours_people: number | null
          move_date: string | null
          narrow_stairs: boolean | null
          options: Json
          parking: number | null
          permit: boolean | null
          price_high: number | null
          price_list_number: number | null
          price_low: number | null
          price_net: number | null
          price_stage: Database["public"]["Enums"]["price_stage"]
          price_total: number | null
          price_vat: number | null
          pricing_configuration_id: string | null
          pricing_mode: string
          property_type: string | null
          reference: string
          review_status: string
          review_submitted_at: string | null
          room_units: number | null
          score_label: string | null
          sent_at: string | null
          sent_version: number | null
          services: Json | null
          source: string
          status: string
          to_address: string | null
          to_zip: string | null
          total_hours: number | null
          updated_at: string
          vans: number | null
          version: number
          volume_m3: number | null
          workflow_stage: string
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      account_visible: { Args: { _account_id: string }; Returns: boolean }
      active_markets: {
        Args: never
        Returns: {
          consumer_regime: string
          country: string
          currency: string
          vat_rate: number
        }[]
      }
      active_pricing_configuration: {
        Args: { _market?: string }
        Returns: string
      }
      add_coverage_minutes: {
        Args: {
          _always: boolean
          _from: string
          _hours: Json
          _minutes: number
        }
        Returns: string
      }
      advance_due_date: {
        Args: {
          _dom: number
          _freq: Database["public"]["Enums"]["service_frequency"]
          _from: string
          _month_offset: number
          _weekday: number
        }
        Returns: string
      }
      apply_change_order_decision: {
        Args: {
          _approve: boolean
          _channel: string
          _id: string
          _name: string
        }
        Returns: {
          approval_request_id: string | null
          created_at: string
          currency: string
          customer_decided_at: string | null
          customer_price: number | null
          decided_name: string
          decision_channel: string
          description: string
          estimated_hours: number | null
          estimated_materials: number | null
          id: string
          job_id: string | null
          lead_id: string | null
          partner_cost: number | null
          public_token: string
          reason: string
          reference: string
          requested_by: string | null
          requested_kind: Database["public"]["Enums"]["lead_actor_kind"]
          status: Database["public"]["Enums"]["change_order_status"]
          token_expires_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "change_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_invoice_payment: {
        Args: {
          _amount: number
          _id: string
          _method?: string
          _note?: string
          _paid_on?: string
          _reference?: string
        }
        Returns: Json
      }
      apply_retention: { Args: { _dry_run?: boolean }; Returns: Json }
      approval_role_for: {
        Args: {
          _scope: Database["public"]["Enums"]["approval_scope"]
          _value: number
        }
        Returns: string
      }
      assign_job_resources: {
        Args: {
          _job_id: string
          _scheduled_end?: string
          _scheduled_start?: string
          _team_id: string
          _vehicle_id: string
        }
        Returns: {
          accepted_snapshot: Json | null
          archived_at: string | null
          archived_by: string | null
          arrived_at: string | null
          attachments: Json
          billing_status: string
          booked_at: string | null
          booked_by: string | null
          booking_notes: string
          calendar_event_id: string | null
          calendar_synced_at: string | null
          cancellation_customer_charge: number | null
          cancellation_manual_review: boolean
          cancellation_partner_compensation: number | null
          cancellation_reason: string
          cancellation_rule_id: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["cancel_actor"] | null
          completed_at: string | null
          confirmation_code: string
          created_at: string
          crew_note: string
          customer_confirmation: Database["public"]["Enums"]["job_confirmation_kind"]
          customer_email: string
          customer_language: string
          customer_name: string
          customer_phone: string
          destination: Json
          extras: Json
          id: string
          inventory: Json
          is_test: boolean
          job_value: number | null
          lead_id: string
          lead_reference: string
          location_evidence: Json
          opportunity_id: string | null
          origin: Json
          partner_id: string | null
          paused_at: string | null
          quote_id: string | null
          quote_reference: string
          reference: string
          scheduled_end: string | null
          scheduled_start: string | null
          service_key: string
          signature_path: string
          signed_at: string | null
          signed_by_name: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_exec_status"]
          team_id: string | null
          total_pause_minutes: number
          tracking_token: string | null
          updated_at: string
          vehicle_id: string | null
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs_execution"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_lead: {
        Args: {
          _fulfilment: Database["public"]["Enums"]["lead_fulfilment_type"]
          _lead_id: string
          _note?: string
          _partner_id?: string
          _team_id?: string
        }
        Returns: string
      }
      attach_lead_files: {
        Args: { _draft: string; _files: Json; _reference: string }
        Returns: number
      }
      attach_quote_files: {
        Args: {
          _contact: string
          _draft: string
          _files: Json
          _reference: string
        }
        Returns: number
      }
      attest_minimum_hours: {
        Args: { _id: string; _kind: string; _note?: string }
        Returns: boolean
      }
      build_consolidated_invoice: {
        Args: {
          _account_id: string
          _period_end: string
          _period_start: string
        }
        Returns: Json
      }
      build_qr_reference: { Args: { _seed: string }; Returns: string }
      bump_allocation_stat: {
        Args: {
          _canton: string
          _category_id: string
          _field: string
          _n?: number
          _partner_id: string
        }
        Returns: undefined
      }
      caller_role: { Args: never; Returns: string }
      can_access_job: { Args: { _job_id: string }; Returns: boolean }
      can_access_job_folder: { Args: { _folder: string }; Returns: boolean }
      can_see_costs: { Args: never; Returns: boolean }
      can_view_fleet: { Args: never; Returns: boolean }
      cancel_invoice: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      cancel_job: {
        Args: {
          _job_id: string
          _reason: string
          _who: Database["public"]["Enums"]["cancel_actor"]
        }
        Returns: Json
      }
      change_order_by_token: {
        Args: { _token: string }
        Returns: {
          currency: string
          customer_price: number
          decided_at: string
          description: string
          expires_at: string
          job_reference: string
          reason: string
          reference: string
          status: Database["public"]["Enums"]["change_order_status"]
        }[]
      }
      change_orders_for: {
        Args: { _job_id: string }
        Returns: {
          approval_request_id: string
          costs_visible: boolean
          created_at: string
          customer_decided_at: string
          customer_price: number
          decided_name: string
          decision_channel: string
          description: string
          estimated_hours: number
          estimated_materials: number
          id: string
          partner_cost: number
          public_token: string
          reason: string
          reference: string
          status: Database["public"]["Enums"]["change_order_status"]
          token_expires_at: string
        }[]
      }
      clear_lead_risk: {
        Args: { _lead_id: string; _note?: string }
        Returns: undefined
      }
      company_contact: {
        Args: { _country?: string }
        Returns: {
          address_line: string
          canton: string
          city: string
          country: string
          email: string
          legal_name: string
          legal_ready: boolean
          mobile_phone: string
          opening_hours: Json
          phone: string
          postal_code: string
          register_number: string
          status: string
          vat_number: string
          website: string
        }[]
      }
      compute_lead_economics: { Args: { _lead_id: string }; Returns: Json }
      confirm_price_list_publisher: {
        Args: { _id: string }
        Returns: {
          created_at: string
          effective_from: string
          id: string
          market: string
          min_hours: number | null
          min_hours_basis: string | null
          name: string
          notes: string
          operational_number: number | null
          published_at: string | null
          published_by: string | null
          status: Database["public"]["Enums"]["pricing_config_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "pricing_configurations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consent_reference_contact_matches: {
        Args: { _contact: string; _ref: string }
        Returns: boolean
      }
      consent_reference_exists: { Args: { _ref: string }; Returns: boolean }
      create_booking_from_quote: {
        Args: {
          _notes?: string
          _quote_id: string
          _scheduled_end?: string
          _scheduled_start?: string
          _team_id?: string
          _vehicle_id?: string
        }
        Returns: {
          accepted_snapshot: Json | null
          archived_at: string | null
          archived_by: string | null
          arrived_at: string | null
          attachments: Json
          billing_status: string
          booked_at: string | null
          booked_by: string | null
          booking_notes: string
          calendar_event_id: string | null
          calendar_synced_at: string | null
          cancellation_customer_charge: number | null
          cancellation_manual_review: boolean
          cancellation_partner_compensation: number | null
          cancellation_reason: string
          cancellation_rule_id: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["cancel_actor"] | null
          completed_at: string | null
          confirmation_code: string
          created_at: string
          crew_note: string
          customer_confirmation: Database["public"]["Enums"]["job_confirmation_kind"]
          customer_email: string
          customer_language: string
          customer_name: string
          customer_phone: string
          destination: Json
          extras: Json
          id: string
          inventory: Json
          is_test: boolean
          job_value: number | null
          lead_id: string
          lead_reference: string
          location_evidence: Json
          opportunity_id: string | null
          origin: Json
          partner_id: string | null
          paused_at: string | null
          quote_id: string | null
          quote_reference: string
          reference: string
          scheduled_end: string | null
          scheduled_start: string | null
          service_key: string
          signature_path: string
          signed_at: string | null
          signed_by_name: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_exec_status"]
          team_id: string | null
          total_pause_minutes: number
          tracking_token: string | null
          updated_at: string
          vehicle_id: string | null
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs_execution"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_change_order: {
        Args: {
          _customer_price?: number
          _description: string
          _estimated_hours?: number
          _estimated_materials?: number
          _job_id: string
          _partner_cost?: number
          _reason?: string
        }
        Returns: {
          approval_request_id: string | null
          created_at: string
          currency: string
          customer_decided_at: string | null
          customer_price: number | null
          decided_name: string
          decision_channel: string
          description: string
          estimated_hours: number | null
          estimated_materials: number | null
          id: string
          job_id: string | null
          lead_id: string | null
          partner_cost: number | null
          public_token: string
          reason: string
          reference: string
          requested_by: string | null
          requested_kind: Database["public"]["Enums"]["lead_actor_kind"]
          status: Database["public"]["Enums"]["change_order_status"]
          token_expires_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "change_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_customer_quote: {
        Args: {
          _approval?: string
          _discount_pct?: number
          _disposal?: number
          _equipment?: number
          _labour?: number
          _lead_id: string
          _line_items: Json
          _materials?: number
          _terms?: string
          _transport?: number
        }
        Returns: Json
      }
      create_enquiry: { Args: { payload: Json }; Returns: string }
      create_invoice_from_job: { Args: { _job_id: string }; Returns: string }
      create_job_from_lead: {
        Args: {
          _lead_id: string
          _opportunity_id?: string
          _scheduled_start?: string
        }
        Returns: {
          accepted_snapshot: Json | null
          archived_at: string | null
          archived_by: string | null
          arrived_at: string | null
          attachments: Json
          billing_status: string
          booked_at: string | null
          booked_by: string | null
          booking_notes: string
          calendar_event_id: string | null
          calendar_synced_at: string | null
          cancellation_customer_charge: number | null
          cancellation_manual_review: boolean
          cancellation_partner_compensation: number | null
          cancellation_reason: string
          cancellation_rule_id: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["cancel_actor"] | null
          completed_at: string | null
          confirmation_code: string
          created_at: string
          crew_note: string
          customer_confirmation: Database["public"]["Enums"]["job_confirmation_kind"]
          customer_email: string
          customer_language: string
          customer_name: string
          customer_phone: string
          destination: Json
          extras: Json
          id: string
          inventory: Json
          is_test: boolean
          job_value: number | null
          lead_id: string
          lead_reference: string
          location_evidence: Json
          opportunity_id: string | null
          origin: Json
          partner_id: string | null
          paused_at: string | null
          quote_id: string | null
          quote_reference: string
          reference: string
          scheduled_end: string | null
          scheduled_start: string | null
          service_key: string
          signature_path: string
          signed_at: string | null
          signed_by_name: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_exec_status"]
          team_id: string | null
          total_pause_minutes: number
          tracking_token: string | null
          updated_at: string
          vehicle_id: string | null
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs_execution"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_lead: { Args: { payload: Json }; Returns: string }
      create_quote: { Args: { payload: Json }; Returns: string }
      create_review_request: { Args: { _job_id: string }; Returns: Json }
      cron_health: {
        Args: never
        Returns: {
          active: boolean
          failures_24h: number
          job_name: string
          last_message: string
          last_run: string
          last_status: string
          last_success: string
          runs_24h: number
          schedule: string
        }[]
      }
      current_org_id: { Args: never; Returns: string }
      current_partner_editable: { Args: never; Returns: boolean }
      current_partner_id: { Args: never; Returns: string }
      customer_facing_status: {
        Args: { _status: Database["public"]["Enums"]["lead_status"] }
        Returns: string
      }
      customer_value: {
        Args: never
        Returns: {
          average_ticket: number
          complaints: number
          contact_key: string
          customer_email: string
          customer_name: string
          customer_phone: string
          first_job: string
          gross_margin: number
          jobs: number
          last_job: string
          repeat_customer: boolean
          revenue: number
        }[]
      }
      decide_approval: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          lead_id: string | null
          note: string
          payload: Json
          requested_by: string | null
          requested_value: number | null
          rule_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
          subject_id: string | null
          subject_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "approval_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_change_order_staff: {
        Args: {
          _approve: boolean
          _channel?: string
          _id: string
          _name?: string
        }
        Returns: {
          approval_request_id: string | null
          created_at: string
          currency: string
          customer_decided_at: string | null
          customer_price: number | null
          decided_name: string
          decision_channel: string
          description: string
          estimated_hours: number | null
          estimated_materials: number | null
          id: string
          job_id: string | null
          lead_id: string | null
          partner_cost: number | null
          public_token: string
          reason: string
          reference: string
          requested_by: string | null
          requested_kind: Database["public"]["Enums"]["lead_actor_kind"]
          status: Database["public"]["Enums"]["change_order_status"]
          token_expires_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "change_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      detect_lead_risk: { Args: { _lead_id: string }; Returns: number }
      dop_adjust_price:
        | {
            Args: { _delta: number; _quote_id: string; _reason: string }
            Returns: number
          }
        | {
            Args: {
              _customer_note: string
              _delta: number
              _quote_id: string
              _reason: string
            }
            Returns: number
          }
      dop_archive: {
        Args: { _id: string; _kind: string; _restore?: boolean }
        Returns: undefined
      }
      dop_attach_offer_file: {
        Args: {
          _file_name: string
          _mime: string
          _quote_id: string
          _size: number
          _storage_path: string
        }
        Returns: string
      }
      dop_confirm_distance: {
        Args: {
          _km: number
          _payload: Json
          _planning_km?: number
          _quote_id: string
          _source: string
        }
        Returns: number
      }
      dop_correct_customer: {
        Args: { _payload: Json; _quote_id: string; _reason: string }
        Returns: number
      }
      dop_log: {
        Args: {
          _action: string
          _detail?: Json
          _entity: string
          _id: string
          _ref: string
        }
        Returns: undefined
      }
      dop_log_order_send: {
        Args: {
          _detail?: Json
          _job_id: string
          _recipient: string
          _status: string
        }
        Returns: undefined
      }
      dop_log_send: {
        Args: { _quote_id: string; _recipient: string; _status: string }
        Returns: undefined
      }
      dop_offer_to_order: { Args: { _quote_id: string }; Returns: string }
      dop_offer_to_order_checked: {
        Args: { _override_reason?: string; _quote_id: string }
        Returns: string
      }
      dop_override_price: {
        Args: { _new_total: number; _quote_id: string; _reason: string }
        Returns: number
      }
      dop_reject_offer: {
        Args: { _quote_id: string; _reason: string }
        Returns: undefined
      }
      dop_request_to_offer: {
        Args: { _id: string; _kind: string }
        Returns: string
      }
      dop_set_offer_stage: {
        Args: { _quote_id: string; _reason?: string; _stage: string }
        Returns: undefined
      }
      dop_set_test_flag: {
        Args: { _id: string; _is_test: boolean; _kind: string }
        Returns: undefined
      }
      dop_update_offer: {
        Args: { _payload: Json; _quote_id: string; _reason: string }
        Returns: number
      }
      email_ingest: { Args: { payload: Json }; Returns: Json }
      email_is_generic_address: { Args: { _addr: string }; Returns: boolean }
      email_match_sender: {
        Args: { _addr: string }
        Returns: {
          entity_id: string
          entity_type: Database["public"]["Enums"]["email_link_entity"]
          label: string
          matched_on: string
        }[]
      }
      email_normalize_subject: { Args: { _subject: string }; Returns: string }
      evaluate_fulfilment: {
        Args: { _lead_id: string }
        Returns: {
          candidate_id: string
          candidate_kind: string
          candidate_name: string
          commercial_note: string
          costs_visible: boolean
          customer_price: number
          earliest_availability: string
          expected_cost: number
          expected_margin: number
          expected_margin_pct: number
          rating: number
          reasons: Json
          score: number
          travel_estimate: number
        }[]
      }
      exception_threshold: {
        Args: { _fallback: number; _key: string }
        Returns: number
      }
      fairness_pick: {
        Args: { _lead_id: string }
        Returns: {
          kind: string
          partner_id: string
          reason_text: string
          reasons: Json
          score: number
        }[]
      }
      fairness_value: {
        Args: { _fallback: number; _key: string }
        Returns: number
      }
      flag_lead_duplicate: { Args: { _lead_id: string }; Returns: string }
      generate_due_work_orders: {
        Args: { _horizon_days?: number }
        Returns: Json
      }
      generate_opportunity_reference: { Args: never; Returns: string }
      generate_quote_reference: { Args: never; Returns: string }
      get_public_quote: {
        Args: { _contact?: string; _reference: string }
        Returns: {
          access_score: number
          boxes: number
          calculated_total: number
          carry: number
          created_at: string
          crew: number
          discount_rate: number
          distance_km: number
          floor_in: number
          floor_out: number
          from_zip: string
          hoist: boolean
          items: Json
          language: string
          lift: string
          load_hours: number
          manual_adjustment: number
          manual_adjustment_customer_note: string
          move_date: string
          narrow_stairs: boolean
          parking: number
          permit: boolean
          price_high: number
          price_low: number
          price_net: number
          price_total: number
          price_vat: number
          pricing_effective_from: string
          pricing_version: number
          property_type: string
          reference: string
          room_units: number
          score_label: string
          services: Json
          status: string
          to_zip: string
          total_hours: number
          vans: number
          volume_m3: number
        }[]
      }
      get_quote_customer: {
        Args: { _contact: string; _reference: string }
        Returns: {
          customer_city: string
          customer_company: string
          customer_country: string
          customer_email: string
          customer_name: string
          customer_notes: string
          customer_phone: string
          customer_street: string
          customer_zip: string
          from_address: string
          to_address: string
        }[]
      }
      handle_sla_timeouts: {
        Args: never
        Returns: {
          escalated: number
          exceptions: number
          timed_out: number
        }[]
      }
      handle_sla_timeouts_detailed: { Args: never; Returns: Json }
      has_role: { Args: { _role: string }; Returns: boolean }
      identity_candidates: {
        Args: { _email: string; _exclude?: string; _phone: string }
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          lead_id: string
          matched_on: string
          reference: string
        }[]
      }
      import_bank_payment: {
        Args: {
          _account_iban: string
          _amount: number
          _booked_on: string
          _currency: string
          _external_id: string
          _payer_name: string
          _provider: string
          _raw_payload: Json
          _reference: string
        }
        Returns: Json
      }
      import_units: {
        Args: { _property_id: string; _rows: Json }
        Returns: number
      }
      inquiry_sla_exceptions: {
        Args: never
        Returns: {
          detail: string
          entity: string
          entity_id: string
          link: string
          metric: number
          occurred_at: string
          reference: string
          rule_key: string
          severity: string
          unit: string
        }[]
      }
      invoice_billing_address: { Args: { _job_id: string }; Returns: Json }
      invoice_by_token: { Args: { _token: string }; Returns: Json }
      invoice_config_state: { Args: never; Returns: Json }
      is_crew_of_job: { Args: { _job_id: string }; Returns: boolean }
      is_dispatcher: { Args: never; Returns: boolean }
      is_finance: { Args: never; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_zw_admin: { Args: never; Returns: boolean }
      issue_invoice: { Args: { _id: string }; Returns: Json }
      job_is_test: { Args: { _id: string }; Returns: boolean }
      job_materials_for: {
        Args: { _job_id: string }
        Returns: {
          change_order_id: string
          costs_visible: boolean
          created_at: string
          customer_price: number
          description: string
          id: string
          photo_path: string
          quantity: number
          status: Database["public"]["Enums"]["job_material_status"]
          supplier_cost: number
          unit: string
        }[]
      }
      job_tracking_by_token: { Args: { _token: string }; Returns: Json }
      lead_economics: { Args: { _lead_id: string }; Returns: Json }
      lead_is_test: { Args: { _id: string }; Returns: boolean }
      lead_sla_minutes: { Args: { _lead_id: string }; Returns: number }
      lead_status_for_customer: {
        Args: { _reference: string }
        Returns: {
          reference: string
          status: string
          updated_at: string
        }[]
      }
      lead_tracker: {
        Args: { _contact: string; _reference: string }
        Returns: {
          contact_due_at: string
          created_at: string
          first_contact_at: string
          first_review_at: string
          label_de: string
          label_en: string
          label_fr: string
          label_it: string
          language: string
          queue_key: string
          quote_due_at: string
          quoted_at: string
          reference: string
          review_due_at: string
          source_key: string
          stage: string
          updated_at: string
        }[]
      }
      log_allocation_exception: {
        Args: {
          _lead_id: string
          _reason: Database["public"]["Enums"]["allocation_exception_reason"]
          _resolution?: string
        }
        Returns: string
      }
      management_exceptions: {
        Args: never
        Returns: {
          detail: string
          entity: string
          entity_id: string
          link: string
          metric: number
          occurred_at: string
          reference: string
          rule_key: string
          severity: string
          unit: string
        }[]
      }
      management_kpis: {
        Args: { _from: string; _include_test?: boolean; _to: string }
        Returns: Json
      }
      mark_overdue_invoices: { Args: never; Returns: number }
      material_approval_threshold: { Args: never; Returns: number }
      merge_leads: {
        Args: { _note?: string; _source: string; _target: string }
        Returns: string
      }
      minimum_gate_state:
        | {
            Args: { _accepted: string; _people: number; _total: number }
            Returns: Json
          }
        | {
            Args: {
              _accepted: string
              _people: number
              _rate: number
              _total: number
            }
            Returns: Json
          }
      my_partner_quotes: {
        Args: never
        Returns: {
          created_at: string
          currency: string
          lead_id: string
          opportunity_id: string
          partner_cost: number
          quote_id: string
          status: Database["public"]["Enums"]["partner_quote_status"]
          submitted_at: string
        }[]
      }
      next_invoice_reference: { Args: never; Returns: string }
      partner_fairness: {
        Args: { _lead_id: string }
        Returns: {
          cold_start: boolean
          completed: number
          partner_id: string
          probation: boolean
          provisional: boolean
          saturated: boolean
          window_share: number
        }[]
      }
      partner_opportunity_feed: {
        Args: never
        Returns: {
          approx_value: number
          canton: string
          category_id: string
          city: string
          customer_email: string
          customer_name: string
          customer_phone: string
          date_window: string
          description: string
          lead_reference: string
          match_reasons: Json
          match_score: number
          opportunity_id: string
          postcode_prefix: string
          respond_by: string
          sent_at: string
          service_address: string
          status: string
        }[]
      }
      partner_quotes_without_cost: {
        Args: { _lead_id?: string }
        Returns: {
          availability_date: string
          completion_days: number
          conditions: string
          created_at: string
          currency: string
          id: string
          lead_id: string
          opportunity_id: string
          partner_id: string
          status: Database["public"]["Enums"]["partner_quote_status"]
          submitted_at: string
        }[]
      }
      phone_key: { Args: { _phone: string }; Returns: string }
      process_inquiry_sla: { Args: never; Returns: number }
      public_legal_entity: {
        Args: { _country?: string }
        Returns: {
          address_line: string
          canton: string
          city: string
          country: string
          currency: string
          email: string
          id: string
          legal_name: string
          phone: string
          postal_code: string
          register_number: string
          status: string
          vat_number: string
        }[]
      }
      public_markets: {
        Args: never
        Returns: {
          active: boolean
          country: string
          currency: string
        }[]
      }
      public_minimum_billing: {
        Args: { _market?: string }
        Returns: {
          effective_from: string
          min_hours: number
          min_hours_basis: string
          version: number
        }[]
      }
      public_planner_pricing: {
        Args: { _market?: string }
        Returns: {
          currency: string
          effective_from: string
          price: number
          service: string
          unit_type: string
          version: number
        }[]
      }
      public_quote_snapshot: {
        Args: { _contact: string; _reference: string }
        Returns: {
          acceptable: boolean
          accepted_at: string
          options: Json
          total: number
          version: number
        }[]
      }
      public_route_distance: {
        Args: { _destination: string; _origin: string }
        Returns: Json
      }
      publish_legal_document: {
        Args: { _effective_date?: string; _id: string }
        Returns: {
          body: string
          country: string
          created_at: string
          doc_type: string
          effective_date: string | null
          id: string
          language: string
          status: Database["public"]["Enums"]["legal_doc_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "legal_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_pricing_configuration: {
        Args: { _id: string }
        Returns: {
          created_at: string
          effective_from: string
          id: string
          market: string
          min_hours: number | null
          min_hours_basis: string | null
          name: string
          notes: string
          operational_number: number | null
          published_at: string | null
          published_by: string | null
          status: Database["public"]["Enums"]["pricing_config_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "pricing_configurations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      published_pricing: {
        Args: { _market?: string }
        Returns: {
          band_id: string
          configuration_id: string
          currency: string
          effective_from: string
          price: number
          property_type: string
          room_max: number
          room_min: number
          service: string
          unit_type: string
          version: number
        }[]
      }
      qr_reference_check_digit: { Args: { _digits: string }; Returns: number }
      quote_contact_matches: {
        Args: { _contact: string; _quote_id: string }
        Returns: boolean
      }
      quote_costs_for_lead: {
        Args: { _lead_id: string }
        Returns: {
          availability_date: string
          completion_days: number
          conditions: string
          currency: string
          notes: string
          opportunity_id: string
          partner_cost: number
          partner_id: string
          quote_id: string
          status: Database["public"]["Enums"]["partner_quote_status"]
          submitted_at: string
        }[]
      }
      quote_minimum_rate: { Args: { _services: Json }; Returns: number }
      recalc_partner_performance: {
        Args: { _partner_id: string }
        Returns: number
      }
      recompute_lead_economics: { Args: { _lead_id: string }; Returns: Json }
      record_job_confirmation: {
        Args: {
          _code?: string
          _job_id: string
          _kind: Database["public"]["Enums"]["job_confirmation_kind"]
          _name?: string
          _signature_path?: string
        }
        Returns: {
          accepted_snapshot: Json | null
          archived_at: string | null
          archived_by: string | null
          arrived_at: string | null
          attachments: Json
          billing_status: string
          booked_at: string | null
          booked_by: string | null
          booking_notes: string
          calendar_event_id: string | null
          calendar_synced_at: string | null
          cancellation_customer_charge: number | null
          cancellation_manual_review: boolean
          cancellation_partner_compensation: number | null
          cancellation_reason: string
          cancellation_rule_id: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["cancel_actor"] | null
          completed_at: string | null
          confirmation_code: string
          created_at: string
          crew_note: string
          customer_confirmation: Database["public"]["Enums"]["job_confirmation_kind"]
          customer_email: string
          customer_language: string
          customer_name: string
          customer_phone: string
          destination: Json
          extras: Json
          id: string
          inventory: Json
          is_test: boolean
          job_value: number | null
          lead_id: string
          lead_reference: string
          location_evidence: Json
          opportunity_id: string | null
          origin: Json
          partner_id: string | null
          paused_at: string | null
          quote_id: string | null
          quote_reference: string
          reference: string
          scheduled_end: string | null
          scheduled_start: string | null
          service_key: string
          signature_path: string
          signed_at: string | null
          signed_by_name: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_exec_status"]
          team_id: string | null
          total_pause_minutes: number
          tracking_token: string | null
          updated_at: string
          vehicle_id: string | null
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs_execution"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_job_material: {
        Args: {
          _customer_price?: number
          _description: string
          _job_id: string
          _photo_path?: string
          _quantity: number
          _supplier_cost?: number
          _unit: string
        }
        Returns: Json
      }
      record_partner_response: {
        Args: { _opportunity_id: string; _reason?: string; _response: string }
        Returns: string
      }
      request_approval: {
        Args: {
          _lead_id?: string
          _note?: string
          _payload?: Json
          _scope: Database["public"]["Enums"]["approval_scope"]
          _subject_id: string
          _subject_type: string
          _value: number
        }
        Returns: string
      }
      resolve_allocation_exception: {
        Args: { _id: string; _resolution?: string }
        Returns: string
      }
      resolve_lead_duplicate: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      resolve_rate: {
        Args: {
          _canton?: string
          _catalogue_id: string
          _city?: string
          _partner_id?: string
        }
        Returns: {
          catalogue_id: string
          cost_price: number
          currency: string
          min_margin_pct: number
          rate_id: string
          scope: string
          scope_ref: string
          sell_price: number
        }[]
      }
      resolve_route_distance: {
        Args: { _destination: string; _origin: string }
        Returns: Json
      }
      resolve_site_service: {
        Args: { _catalogue_id: string; _site_id: string }
        Returns: {
          currency: string
          frequency: Database["public"]["Enums"]["service_frequency"]
          frequency_level: string
          fulfilment_level: string
          level: string
          preferred_fulfilment: Database["public"]["Enums"]["fulfilment_pref"]
          preferred_partner_id: string
          preferred_team_id: string
          price: number
          price_level: string
          sla_id: string
          sla_level: string
        }[]
      }
      resource_busy: {
        Args: { _end: string; _exclude_job?: string; _start: string }
        Returns: {
          job_reference: string
          resource_id: string
          resource_kind: string
        }[]
      }
      respond_change_order_token: {
        Args: { _accept: boolean; _name?: string; _token: string }
        Returns: Json
      }
      review_by_token: {
        Args: { _token: string }
        Returns: {
          comment: string
          job_reference: string
          rating: number
          submitted_at: string
        }[]
      }
      review_partner_document: {
        Args: {
          _document_id: string
          _expires_on?: string
          _reason?: string
          _status: Database["public"]["Enums"]["partner_document_status"]
        }
        Returns: {
          created_at: string
          doc_type: string
          expires_on: string | null
          file_name: string
          id: string
          mime_type: string
          partner_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number
          status: Database["public"]["Enums"]["partner_document_status"]
          storage_path: string
          updated_at: string
          uploaded_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      role_rank: { Args: { _role: string }; Returns: number }
      rollback_pricing_configuration: {
        Args: { _id: string }
        Returns: {
          created_at: string
          effective_from: string
          id: string
          market: string
          min_hours: number | null
          min_hours_basis: string | null
          name: string
          notes: string
          operational_number: number | null
          published_at: string | null
          published_by: string | null
          status: Database["public"]["Enums"]["pricing_config_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "pricing_configurations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      route_lead_queue: {
        Args: {
          _customer_type: Database["public"]["Enums"]["lead_customer_type"]
          _flag: string
          _source_key: string
          _urgency: string
        }
        Returns: string
      }
      run_sla_timeouts_job: { Args: { _trigger?: string }; Returns: Json }
      run_work_order_job: {
        Args: { _horizon_days?: number; _trigger?: string }
        Returns: Json
      }
      score_candidates: {
        Args: { _lead_id: string }
        Returns: {
          candidate_id: string
          candidate_kind: string
          candidate_name: string
          flags: Json
          reasons: Json
          score: number
        }[]
      }
      security_definer_findings: {
        Args: never
        Returns: {
          caller: string
          fn_name: string
        }[]
      }
      send_change_order: {
        Args: { _approval?: string; _customer_price?: number; _id: string }
        Returns: Json
      }
      send_lead_opportunities: {
        Args: { _candidates: Json; _lead_id: string; _note?: string }
        Returns: number
      }
      send_quote: { Args: { _reference: string }; Returns: Json }
      set_job_status: {
        Args: {
          _job_id: string
          _note?: string
          _status: Database["public"]["Enums"]["job_exec_status"]
        }
        Returns: {
          accepted_snapshot: Json | null
          archived_at: string | null
          archived_by: string | null
          arrived_at: string | null
          attachments: Json
          billing_status: string
          booked_at: string | null
          booked_by: string | null
          booking_notes: string
          calendar_event_id: string | null
          calendar_synced_at: string | null
          cancellation_customer_charge: number | null
          cancellation_manual_review: boolean
          cancellation_partner_compensation: number | null
          cancellation_reason: string
          cancellation_rule_id: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["cancel_actor"] | null
          completed_at: string | null
          confirmation_code: string
          created_at: string
          crew_note: string
          customer_confirmation: Database["public"]["Enums"]["job_confirmation_kind"]
          customer_email: string
          customer_language: string
          customer_name: string
          customer_phone: string
          destination: Json
          extras: Json
          id: string
          inventory: Json
          is_test: boolean
          job_value: number | null
          lead_id: string
          lead_reference: string
          location_evidence: Json
          opportunity_id: string | null
          origin: Json
          partner_id: string | null
          paused_at: string | null
          quote_id: string | null
          quote_reference: string
          reference: string
          scheduled_end: string | null
          scheduled_start: string | null
          service_key: string
          signature_path: string
          signed_at: string | null
          signed_by_name: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_exec_status"]
          team_id: string | null
          total_pause_minutes: number
          tracking_token: string | null
          updated_at: string
          vehicle_id: string | null
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs_execution"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_lead_owner: {
        Args: { _lead_id: string; _note?: string; _owner_id: string }
        Returns: string
      }
      set_lead_status: {
        Args: {
          _lead_id: string
          _new_status: Database["public"]["Enums"]["lead_status"]
          _note?: string
        }
        Returns: Database["public"]["Enums"]["lead_status"]
      }
      set_market_active: {
        Args: { _active: boolean; _country: string }
        Returns: {
          activated_at: string | null
          active: boolean
          consumer_regime: string
          country: string
          created_at: string
          currency: string
          entity_ready: boolean
          legal_ready: boolean
          note: string
          tax_ready: boolean
          updated_at: string
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "markets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_market_readiness: {
        Args: {
          _country: string
          _entity: boolean
          _legal: boolean
          _tax: boolean
        }
        Returns: {
          activated_at: string | null
          active: boolean
          consumer_regime: string
          country: string
          created_at: string
          currency: string
          entity_ready: boolean
          legal_ready: boolean
          note: string
          tax_ready: boolean
          updated_at: string
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "markets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_partner_account_manager: {
        Args: { _manager_id: string; _partner_id: string }
        Returns: string
      }
      set_partner_assessment: {
        Args: { _classification: string; _partner_id: string; _ratings: Json }
        Returns: number
      }
      set_partner_service_approval: {
        Args: { _approved: boolean; _cities?: string[]; _service_id: string }
        Returns: boolean
      }
      set_partner_status: {
        Args: {
          _new_status: Database["public"]["Enums"]["partner_status"]
          _note?: string
          _partner_id: string
        }
        Returns: Database["public"]["Enums"]["partner_status"]
      }
      set_quote_distance: {
        Args: { _km: number; _quote_id: string; _source?: string }
        Returns: {
          accepted_at: string | null
          accepted_by_name: string | null
          accepted_options: Json | null
          accepted_snapshot: Json | null
          accepted_version: number | null
          access_score: number | null
          archived_at: string | null
          archived_by: string | null
          billing_basis: Json | null
          boxes: number | null
          calculated_total: number | null
          carry: number | null
          created_at: string
          crew: number | null
          customer_city: string | null
          customer_company: string | null
          customer_country: string | null
          customer_email: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_notified_at: string | null
          customer_notify_error: string
          customer_phone: string | null
          customer_street: string | null
          customer_zip: string | null
          discount_rate: number | null
          distance_confirmed_at: string | null
          distance_confirmed_by: string | null
          distance_km: number | null
          distance_source: string
          enquiry_id: string | null
          floor_in: number | null
          floor_out: number | null
          from_address: string | null
          from_zip: string | null
          hoist: boolean | null
          id: string
          internal_notified_at: string | null
          internal_notify_error: string
          is_test: boolean
          items: Json | null
          job_id: string | null
          language: string
          lead_id: string | null
          lift: string | null
          load_hours: number | null
          manual_adjustment: number
          manual_adjustment_at: string | null
          manual_adjustment_by: string
          manual_adjustment_customer_note: string | null
          manual_adjustment_reason: string
          min_hours_attested_at: string | null
          min_hours_attested_by: string | null
          min_hours_note: string
          min_hours_people: number | null
          move_date: string | null
          narrow_stairs: boolean | null
          options: Json
          parking: number | null
          permit: boolean | null
          price_high: number | null
          price_list_number: number | null
          price_low: number | null
          price_net: number | null
          price_stage: Database["public"]["Enums"]["price_stage"]
          price_total: number | null
          price_vat: number | null
          pricing_configuration_id: string | null
          pricing_mode: string
          property_type: string | null
          reference: string
          review_status: string
          review_submitted_at: string | null
          room_units: number | null
          score_label: string | null
          sent_at: string | null
          sent_version: number | null
          services: Json | null
          source: string
          status: string
          to_address: string | null
          to_zip: string | null
          total_hours: number | null
          updated_at: string
          vans: number | null
          version: number
          volume_m3: number | null
          workflow_stage: string
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_sla_automation: {
        Args: { _enabled: boolean; _minutes?: number }
        Returns: {
          created_at: string
          enabled: boolean
          id: boolean
          interval_minutes: number
          last_duration_ms: number
          last_error: string
          last_escalated: number
          last_exceptions: number
          last_run_at: string | null
          last_skipped: boolean
          last_timed_out: number
          last_trigger: string
          scheduler: string
          updated_at: string
          wo_enabled: boolean
          wo_horizon_days: number
          wo_last_created: number
          wo_last_run_at: string | null
          wo_last_skipped: boolean
        }
        SetofOptions: {
          from: "*"
          to: "dispatch_automation"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_user_role: {
        Args: {
          _note?: string
          _role: Database["public"]["Enums"]["portal_role"]
          _user_id: string
        }
        Returns: Database["public"]["Enums"]["portal_role"]
      }
      sla_target: {
        Args: { _work_order_id: string }
        Returns: {
          coverage: Database["public"]["Enums"]["sla_coverage"]
          hours_source: string
          resolution_due_at: string
          response_due_at: string
          sla_id: string
          sla_name: string
        }[]
      }
      source_performance: {
        Args: { _from: string; _to: string }
        Returns: {
          cac: number
          conversion: number
          cost_per_lead: number
          cost_per_qualified: number
          gross_margin: number
          leads: number
          qualified: number
          revenue: number
          roas: number
          source_id: string
          source_key: string
          spend: number
          won: number
        }[]
      }
      submit_partner_application: {
        Args: { _note?: string }
        Returns: Database["public"]["Enums"]["partner_status"]
      }
      submit_review: {
        Args: { _comment: string; _rating: number; _token: string }
        Returns: boolean
      }
      valid_iban: { Args: { _value: string }; Returns: boolean }
      valid_qr_iban: { Args: { _value: string }; Returns: boolean }
    }
    Enums: {
      account_status: "prospect" | "active" | "on_hold" | "closed"
      account_type:
        | "property_manager"
        | "hotel"
        | "real_estate"
        | "facility_manager"
        | "corporate"
        | "other"
      allocation_exception_reason:
        | "no_eligible_partner"
        | "all_declined"
        | "sla_exhausted"
        | "outside_coverage"
      allocation_method:
        | "direct"
        | "auto"
        | "round_robin"
        | "weighted"
        | "broadcast_rfq"
        | "territory"
        | "preferred"
        | "internal_first"
      approval_scope:
        | "discount_pct"
        | "margin_pct"
        | "quote_total"
        | "refund_amount"
        | "material_cost"
      approval_status: "pending" | "approved" | "rejected"
      availability_state:
        | "available"
        | "limited"
        | "full"
        | "unavailable"
        | "holiday"
      cancel_actor: "customer" | "partner" | "multifagro"
      change_order_status:
        | "draft"
        | "awaiting_customer"
        | "approved"
        | "rejected"
        | "cancelled"
      consent_kind:
        | "accepted_terms"
        | "privacy_notice_shown"
        | "cancellation_policy_shown"
        | "marketing_optin"
      consent_subject_type: "customer" | "partner"
      contract_status:
        | "draft"
        | "active"
        | "expiring"
        | "expired"
        | "terminated"
      customer_quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
      email_delivery_status:
        | "pending"
        | "queued"
        | "sent"
        | "failed"
        | "received"
      email_direction: "inbound" | "outbound"
      email_folder: "inbox" | "sent" | "drafts" | "archived" | "unassigned"
      email_ingest_source:
        | "webhook"
        | "import_eml"
        | "manual_forward"
        | "gmail_poll"
        | "outbound"
      email_link_entity:
        | "lead"
        | "account"
        | "site"
        | "unit"
        | "job"
        | "work_order"
        | "partner"
        | "contract"
      fulfilment_pref: "internal" | "partner" | "either"
      invoice_status: "draft" | "issued" | "paid" | "overdue" | "cancelled"
      job_confirmation_kind: "signature" | "code" | "none"
      job_exec_event_kind:
        | "arrive"
        | "start"
        | "pause"
        | "resume"
        | "complete"
        | "note"
        | "photo"
        | "material"
        | "signature"
        | "status"
        | "cancel"
        | "change_order"
      job_exec_status:
        | "scheduled"
        | "assigned"
        | "en_route"
        | "on_site"
        | "in_progress"
        | "loading"
        | "in_transit"
        | "unloading"
        | "paused"
        | "completed"
        | "verified"
        | "cancelled"
      job_material_status:
        | "proposed"
        | "approval_required"
        | "approved"
        | "rejected"
        | "purchased"
        | "installed"
        | "cancelled"
      job_photo_phase: "before" | "during" | "after" | "damage"
      job_status:
        | "received"
        | "survey"
        | "quote_approved"
        | "scheduled"
        | "crew_assigned"
        | "clearance"
        | "cleaning"
        | "handover_done"
      job_type: "changeover" | "move" | "clean" | "clearance"
      lead_activity_kind:
        | "created"
        | "status_change"
        | "assignment"
        | "note"
        | "communication"
        | "quote"
        | "system"
      lead_actor_kind: "staff" | "partner" | "customer" | "system"
      lead_customer_type: "private" | "b2b"
      lead_followup_status: "pending" | "sent" | "done" | "skipped"
      lead_fulfilment_type: "internal" | "partner" | "rfq" | "mixed"
      lead_priority: "critical" | "high" | "normal" | "low"
      lead_source_group:
        | "web"
        | "phone"
        | "messaging"
        | "paid"
        | "referral"
        | "b2b"
        | "manual"
        | "api"
      lead_status:
        | "new"
        | "qualified"
        | "quote_required"
        | "quote_sent"
        | "negotiation"
        | "won"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "lost"
        | "cancelled"
        | "unqualified"
        | "site_visit_required"
        | "awaiting_customer"
        | "ready_for_allocation"
        | "assigned_internal"
        | "sent_to_partners"
        | "spam_review"
      lead_temperature: "hot" | "warm" | "cold"
      legal_doc_status: "draft" | "published" | "superseded"
      partner_category_group:
        | "manpower"
        | "maintenance"
        | "cleaning"
        | "transport"
        | "specialist"
      partner_document_status:
        | "uploaded"
        | "under_review"
        | "approved"
        | "rejected"
        | "expired"
      partner_entity_type: "company" | "individual"
      partner_ownership: "owned" | "leased"
      partner_pricing_method:
        | "fixed"
        | "hourly"
        | "daily"
        | "monthly"
        | "per_job"
        | "per_trip"
        | "per_km"
        | "quotation"
      partner_quote_status:
        | "draft"
        | "submitted"
        | "withdrawn"
        | "accepted"
        | "rejected"
      partner_skill_level: "skilled" | "semi_skilled" | "unskilled"
      partner_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "more_info_required"
        | "approved"
        | "suspended"
        | "rejected"
      portal_role:
        | "owner"
        | "manager"
        | "staff"
        | "zuegelwerk_admin"
        | "ops_manager"
        | "sales"
        | "partner_manager"
        | "finance"
        | "super_admin"
        | "management"
        | "dispatcher"
        | "surveyor"
        | "crew_leader"
        | "driver"
        | "mover"
        | "cleaner"
        | "partner"
        | "customer"
      price_stage: "richtwert" | "offerte" | "vertragspreis" | "rechnung"
      pricing_config_status: "draft" | "published" | "archived"
      rate_scope: "default" | "canton" | "city" | "partner" | "organization"
      resource_kind: "partner" | "internal_team"
      service_frequency:
        | "one_off"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "semiannual"
        | "annual"
        | "custom_cron"
      service_unit:
        | "hourly"
        | "per_visit"
        | "per_m2"
        | "per_m3"
        | "per_room"
        | "per_trip"
        | "per_km"
        | "fixed"
        | "quotation"
      sla_coverage: "business_hours" | "extended" | "24_7"
      sla_penalty_type: "none" | "service_credit" | "fixed"
      work_order_status:
        | "planned"
        | "dispatched"
        | "in_progress"
        | "completed"
        | "verified"
        | "cancelled"
        | "on_hold"
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
    Enums: {
      account_status: ["prospect", "active", "on_hold", "closed"],
      account_type: [
        "property_manager",
        "hotel",
        "real_estate",
        "facility_manager",
        "corporate",
        "other",
      ],
      allocation_exception_reason: [
        "no_eligible_partner",
        "all_declined",
        "sla_exhausted",
        "outside_coverage",
      ],
      allocation_method: [
        "direct",
        "auto",
        "round_robin",
        "weighted",
        "broadcast_rfq",
        "territory",
        "preferred",
        "internal_first",
      ],
      approval_scope: [
        "discount_pct",
        "margin_pct",
        "quote_total",
        "refund_amount",
        "material_cost",
      ],
      approval_status: ["pending", "approved", "rejected"],
      availability_state: [
        "available",
        "limited",
        "full",
        "unavailable",
        "holiday",
      ],
      cancel_actor: ["customer", "partner", "multifagro"],
      change_order_status: [
        "draft",
        "awaiting_customer",
        "approved",
        "rejected",
        "cancelled",
      ],
      consent_kind: [
        "accepted_terms",
        "privacy_notice_shown",
        "cancellation_policy_shown",
        "marketing_optin",
      ],
      consent_subject_type: ["customer", "partner"],
      contract_status: ["draft", "active", "expiring", "expired", "terminated"],
      customer_quote_status: [
        "draft",
        "sent",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ],
      email_delivery_status: [
        "pending",
        "queued",
        "sent",
        "failed",
        "received",
      ],
      email_direction: ["inbound", "outbound"],
      email_folder: ["inbox", "sent", "drafts", "archived", "unassigned"],
      email_ingest_source: [
        "webhook",
        "import_eml",
        "manual_forward",
        "gmail_poll",
        "outbound",
      ],
      email_link_entity: [
        "lead",
        "account",
        "site",
        "unit",
        "job",
        "work_order",
        "partner",
        "contract",
      ],
      fulfilment_pref: ["internal", "partner", "either"],
      invoice_status: ["draft", "issued", "paid", "overdue", "cancelled"],
      job_confirmation_kind: ["signature", "code", "none"],
      job_exec_event_kind: [
        "arrive",
        "start",
        "pause",
        "resume",
        "complete",
        "note",
        "photo",
        "material",
        "signature",
        "status",
        "cancel",
        "change_order",
      ],
      job_exec_status: [
        "scheduled",
        "assigned",
        "en_route",
        "on_site",
        "in_progress",
        "loading",
        "in_transit",
        "unloading",
        "paused",
        "completed",
        "verified",
        "cancelled",
      ],
      job_material_status: [
        "proposed",
        "approval_required",
        "approved",
        "rejected",
        "purchased",
        "installed",
        "cancelled",
      ],
      job_photo_phase: ["before", "during", "after", "damage"],
      job_status: [
        "received",
        "survey",
        "quote_approved",
        "scheduled",
        "crew_assigned",
        "clearance",
        "cleaning",
        "handover_done",
      ],
      job_type: ["changeover", "move", "clean", "clearance"],
      lead_activity_kind: [
        "created",
        "status_change",
        "assignment",
        "note",
        "communication",
        "quote",
        "system",
      ],
      lead_actor_kind: ["staff", "partner", "customer", "system"],
      lead_customer_type: ["private", "b2b"],
      lead_followup_status: ["pending", "sent", "done", "skipped"],
      lead_fulfilment_type: ["internal", "partner", "rfq", "mixed"],
      lead_priority: ["critical", "high", "normal", "low"],
      lead_source_group: [
        "web",
        "phone",
        "messaging",
        "paid",
        "referral",
        "b2b",
        "manual",
        "api",
      ],
      lead_status: [
        "new",
        "qualified",
        "quote_required",
        "quote_sent",
        "negotiation",
        "won",
        "scheduled",
        "in_progress",
        "completed",
        "lost",
        "cancelled",
        "unqualified",
        "site_visit_required",
        "awaiting_customer",
        "ready_for_allocation",
        "assigned_internal",
        "sent_to_partners",
        "spam_review",
      ],
      lead_temperature: ["hot", "warm", "cold"],
      legal_doc_status: ["draft", "published", "superseded"],
      partner_category_group: [
        "manpower",
        "maintenance",
        "cleaning",
        "transport",
        "specialist",
      ],
      partner_document_status: [
        "uploaded",
        "under_review",
        "approved",
        "rejected",
        "expired",
      ],
      partner_entity_type: ["company", "individual"],
      partner_ownership: ["owned", "leased"],
      partner_pricing_method: [
        "fixed",
        "hourly",
        "daily",
        "monthly",
        "per_job",
        "per_trip",
        "per_km",
        "quotation",
      ],
      partner_quote_status: [
        "draft",
        "submitted",
        "withdrawn",
        "accepted",
        "rejected",
      ],
      partner_skill_level: ["skilled", "semi_skilled", "unskilled"],
      partner_status: [
        "draft",
        "submitted",
        "under_review",
        "more_info_required",
        "approved",
        "suspended",
        "rejected",
      ],
      portal_role: [
        "owner",
        "manager",
        "staff",
        "zuegelwerk_admin",
        "ops_manager",
        "sales",
        "partner_manager",
        "finance",
        "super_admin",
        "management",
        "dispatcher",
        "surveyor",
        "crew_leader",
        "driver",
        "mover",
        "cleaner",
        "partner",
        "customer",
      ],
      price_stage: ["richtwert", "offerte", "vertragspreis", "rechnung"],
      pricing_config_status: ["draft", "published", "archived"],
      rate_scope: ["default", "canton", "city", "partner", "organization"],
      resource_kind: ["partner", "internal_team"],
      service_frequency: [
        "one_off",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "semiannual",
        "annual",
        "custom_cron",
      ],
      service_unit: [
        "hourly",
        "per_visit",
        "per_m2",
        "per_m3",
        "per_room",
        "per_trip",
        "per_km",
        "fixed",
        "quotation",
      ],
      sla_coverage: ["business_hours", "extended", "24_7"],
      sla_penalty_type: ["none", "service_credit", "fixed"],
      work_order_status: [
        "planned",
        "dispatched",
        "in_progress",
        "completed",
        "verified",
        "cancelled",
        "on_hold",
      ],
    },
  },
} as const
