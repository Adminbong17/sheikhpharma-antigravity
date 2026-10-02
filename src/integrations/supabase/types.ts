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
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          device_info: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          location: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          title: string
          type: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          title: string
          type?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
        }
        Insert: {
          api_key?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
        }
        Relationships: []
      }
      banks: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      bkash_tokens: {
        Row: {
          expires_at: string
          granted_at: string
          id: string
          id_token: string
          refresh_token: string | null
        }
        Insert: {
          expires_at: string
          granted_at?: string
          id?: string
          id_token: string
          refresh_token?: string | null
        }
        Update: {
          expires_at?: string
          granted_at?: string
          id?: string
          id_token?: string
          refresh_token?: string | null
        }
        Relationships: []
      }
      blood_requests: {
        Row: {
          blood_group: string
          created_at: string | null
          details: string | null
          division: string | null
          id: string
          location: string
          name: string
          phone: string
          status: string | null
          type: string
          upazilla: string | null
          zilla: string | null
        }
        Insert: {
          blood_group: string
          created_at?: string | null
          details?: string | null
          division?: string | null
          id?: string
          location: string
          name: string
          phone: string
          status?: string | null
          type?: string
          upazilla?: string | null
          zilla?: string | null
        }
        Update: {
          blood_group?: string
          created_at?: string | null
          details?: string | null
          division?: string | null
          id?: string
          location?: string
          name?: string
          phone?: string
          status?: string | null
          type?: string
          upazilla?: string | null
          zilla?: string | null
        }
        Relationships: []
      }
      brand_requests: {
        Row: {
          brand_name: string
          created_at: string | null
          id: string
          logo_url: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          brand_name: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          brand_name?: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      career_applications: {
        Row: {
          address: string | null
          created_at: string | null
          educational_qualification: string | null
          email: string
          experience: string | null
          full_name: string
          id: string
          nid_url: string | null
          phone: string
          photo_url: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          educational_qualification?: string | null
          email: string
          experience?: string | null
          full_name: string
          id?: string
          nid_url?: string | null
          phone: string
          photo_url?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          educational_qualification?: string | null
          email?: string
          experience?: string | null
          full_name?: string
          id?: string
          nid_url?: string | null
          phone?: string
          photo_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          notes: string | null
          transaction_date: string
          transaction_id: string
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          transaction_date: string
          transaction_id: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          transaction_date?: string
          transaction_id?: string
          type?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          icon_url: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon_url?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      coupon_assignments: {
        Row: {
          assigned_at: string | null
          coupon_id: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          coupon_id: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          coupon_id?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_assignments_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          coupon_id: string
          id: string
          order_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_user_specific: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          minimum_order_amount: number | null
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_user_specific?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          minimum_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_user_specific?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          minimum_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string | null
          exchange_rate: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          exchange_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          exchange_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_credit_payouts: {
        Row: {
          account_number: string
          admin_method: string | null
          admin_note: string | null
          admin_trx_id: string | null
          amount: number
          completed_at: string | null
          created_at: string | null
          id: string
          method: string
          processed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          account_number: string
          admin_method?: string | null
          admin_note?: string | null
          admin_trx_id?: string | null
          amount: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          method: string
          processed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          account_number?: string
          admin_method?: string | null
          admin_note?: string | null
          admin_trx_id?: string | null
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          method?: string
          processed_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      customer_credits: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          area: string | null
          charge: number
          created_at: string | null
          division: string
          id: string
          is_active: boolean | null
          upazilla: string | null
          zilla: string | null
        }
        Insert: {
          area?: string | null
          charge?: number
          created_at?: string | null
          division: string
          id?: string
          is_active?: boolean | null
          upazilla?: string | null
          zilla?: string | null
        }
        Update: {
          area?: string | null
          charge?: number
          created_at?: string | null
          division?: string
          id?: string
          is_active?: boolean | null
          upazilla?: string | null
          zilla?: string | null
        }
        Relationships: []
      }
      doctor_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      doctor_category_assignments: {
        Row: {
          category_id: string
          created_at: string | null
          doctor_id: string
          id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          doctor_id: string
          id?: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          doctor_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "doctor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_category_assignments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          category_id: string | null
          chamber: string | null
          created_at: string | null
          division: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          qualification: string | null
          sort_order: number | null
          specialty: string | null
          zilla: string | null
        }
        Insert: {
          category_id?: string | null
          chamber?: string | null
          created_at?: string | null
          division?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          qualification?: string | null
          sort_order?: number | null
          specialty?: string | null
          zilla?: string | null
        }
        Update: {
          category_id?: string | null
          chamber?: string | null
          created_at?: string | null
          division?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          qualification?: string | null
          sort_order?: number | null
          specialty?: string | null
          zilla?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "doctor_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          phone: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          phone: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          phone?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string | null
          expense_by: string | null
          expense_date: string
          id: string
          investor_id: string | null
          name: string
          notes: string | null
          quantity: number | null
          source: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          expense_by?: string | null
          expense_date: string
          id?: string
          investor_id?: string | null
          name: string
          notes?: string | null
          quantity?: number | null
          source?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          expense_by?: string | null
          expense_date?: string
          id?: string
          investor_id?: string | null
          name?: string
          notes?: string | null
          quantity?: number | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_deal_products: {
        Row: {
          created_at: string | null
          deal_id: string
          deal_price: number | null
          id: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          deal_price?: number | null
          id?: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          deal_price?: number | null
          id?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_deal_products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "flash_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_deal_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_deals: {
        Row: {
          banner_color: string | null
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          banner_color?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          banner_color?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          subtitle: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      homepage_left_menu_items: {
        Row: {
          bg_color: string | null
          created_at: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          name: string
          sort_order: number | null
          updated_at: string | null
          use_link: boolean
        }
        Insert: {
          bg_color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          use_link?: boolean
        }
        Update: {
          bg_color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          use_link?: boolean
        }
        Relationships: []
      }
      homepage_left_menu_products: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_left_menu_products_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "homepage_left_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_left_menu_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_section_products: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          section_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          section_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          section_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_section_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_section_products_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          section_type: string | null
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          section_type?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          section_type?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      incomplete_orders: {
        Row: {
          converted_order_id: string | null
          created_at: string | null
          customer_address: string | null
          customer_area: string | null
          customer_division: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_upazilla: string | null
          customer_zilla: string | null
          follow_up_date: string | null
          id: string
          items: Json | null
          last_contacted_at: string | null
          notes: string | null
          status: string | null
          subtotal: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          converted_order_id?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_area?: string | null
          customer_division?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_upazilla?: string | null
          customer_zilla?: string | null
          follow_up_date?: string | null
          id?: string
          items?: Json | null
          last_contacted_at?: string | null
          notes?: string | null
          status?: string | null
          subtotal?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          converted_order_id?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_area?: string | null
          customer_division?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_upazilla?: string | null
          customer_zilla?: string | null
          follow_up_date?: string | null
          id?: string
          items?: Json | null
          last_contacted_at?: string | null
          notes?: string | null
          status?: string | null
          subtotal?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incomplete_orders_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          investor_id: string
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          investor_id: string
          transaction_date: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          investor_id?: string
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_transactions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_division: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_upazilla: string | null
          customer_zilla: string | null
          delivery_charge: number | null
          discount: number | null
          id: string
          invoice_number: string | null
          items: Json | null
          notes: string | null
          order_id: string | null
          payment_method: string | null
          payment_status: string | null
          status: string
          subtotal: number | null
          total: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_division?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_upazilla?: string | null
          customer_zilla?: string | null
          delivery_charge?: number | null
          discount?: number | null
          id?: string
          invoice_number?: string | null
          items?: Json | null
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string
          subtotal?: number | null
          total?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_division?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_upazilla?: string | null
          customer_zilla?: string | null
          delivery_charge?: number | null
          discount?: number | null
          id?: string
          invoice_number?: string | null
          items?: Json | null
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string
          subtotal?: number | null
          total?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_center_tests: {
        Row: {
          center_id: string
          created_at: string | null
          govt_price: number | null
          id: string
          is_active: boolean | null
          price: number
          test_id: string
        }
        Insert: {
          center_id: string
          created_at?: string | null
          govt_price?: number | null
          id?: string
          is_active?: boolean | null
          price?: number
          test_id: string
        }
        Update: {
          center_id?: string
          created_at?: string | null
          govt_price?: number | null
          id?: string
          is_active?: boolean | null
          price?: number
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_center_tests_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "lab_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_center_tests_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_centers: {
        Row: {
          address: string | null
          created_at: string | null
          division: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          sort_order: number | null
          type: string
          upazilla: string | null
          zilla: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          division?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          sort_order?: number | null
          type?: string
          upazilla?: string | null
          zilla?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          division?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          sort_order?: number | null
          type?: string
          upazilla?: string | null
          zilla?: string | null
        }
        Relationships: []
      }
      lab_test_bookings: {
        Row: {
          created_at: string | null
          customer_address: string | null
          customer_area: string | null
          customer_division: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_upazilla: string | null
          customer_zilla: string | null
          id: string
          items: Json | null
          notes: string | null
          payment_status: string | null
          service_charge: number | null
          status: string | null
          total: number | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_address?: string | null
          customer_area?: string | null
          customer_division?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_upazilla?: string | null
          customer_zilla?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          payment_status?: string | null
          service_charge?: number | null
          status?: string | null
          total?: number | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_address?: string | null
          customer_area?: string | null
          customer_division?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_upazilla?: string | null
          customer_zilla?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          payment_status?: string | null
          service_charge?: number | null
          status?: string | null
          total?: number | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lab_tests: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          name_bn: string | null
          price: number
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          name_bn?: string | null
          price?: number
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          name_bn?: string | null
          price?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      login_otps: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp: string
          phone: string
          used: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          otp: string
          phone: string
          used?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp?: string
          phone?: string
          used?: boolean
        }
        Relationships: []
      }
      marketing_settings: {
        Row: {
          default_currency: string | null
          facebook_pixel_id: string | null
          ga_enabled: boolean | null
          google_analytics_id: string | null
          gtm_enabled: boolean | null
          gtm_id: string | null
          id: string
          pixel_enabled: boolean | null
          pixel_test_mode: boolean | null
          updated_at: string | null
        }
        Insert: {
          default_currency?: string | null
          facebook_pixel_id?: string | null
          ga_enabled?: boolean | null
          google_analytics_id?: string | null
          gtm_enabled?: boolean | null
          gtm_id?: string | null
          id?: string
          pixel_enabled?: boolean | null
          pixel_test_mode?: boolean | null
          updated_at?: string | null
        }
        Update: {
          default_currency?: string | null
          facebook_pixel_id?: string | null
          ga_enabled?: boolean | null
          google_analytics_id?: string | null
          gtm_enabled?: boolean | null
          gtm_id?: string | null
          id?: string
          pixel_enabled?: boolean | null
          pixel_test_mode?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          parent_id: string | null
          sender_id: string
          vendor_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          parent_id?: string | null
          sender_id: string
          vendor_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          parent_id?: string | null
          sender_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          target_role: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          target_role?: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          target_role?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string | null
          quantity: number
          variant_info: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          variant_info?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          variant_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_received: number | null
          carrybee_consignment_id: string | null
          carrybee_status: string | null
          change_returned: number | null
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string | null
          customer_address: string | null
          customer_area: string | null
          customer_division: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_upazilla: string | null
          customer_zilla: string | null
          delivery_charge: number | null
          id: string
          is_pos_sale: boolean | null
          order_notes: string | null
          order_number: number
          payment_method: string | null
          register_session_id: string | null
          staff_id: string | null
          status: string | null
          steadfast_consignment_id: number | null
          steadfast_status: string | null
          steadfast_tracking_code: string | null
          total: number
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          amount_received?: number | null
          carrybee_consignment_id?: string | null
          carrybee_status?: string | null
          change_returned?: number | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string | null
          customer_address?: string | null
          customer_area?: string | null
          customer_division?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_upazilla?: string | null
          customer_zilla?: string | null
          delivery_charge?: number | null
          id?: string
          is_pos_sale?: boolean | null
          order_notes?: string | null
          order_number?: number
          payment_method?: string | null
          register_session_id?: string | null
          staff_id?: string | null
          status?: string | null
          steadfast_consignment_id?: number | null
          steadfast_status?: string | null
          steadfast_tracking_code?: string | null
          total?: number
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount_received?: number | null
          carrybee_consignment_id?: string | null
          carrybee_status?: string | null
          change_returned?: number | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string | null
          customer_address?: string | null
          customer_area?: string | null
          customer_division?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_upazilla?: string | null
          customer_zilla?: string | null
          delivery_charge?: number | null
          id?: string
          is_pos_sale?: boolean | null
          order_notes?: string | null
          order_number?: number
          payment_method?: string | null
          register_session_id?: string | null
          staff_id?: string | null
          status?: string | null
          steadfast_consignment_id?: number | null
          steadfast_status?: string | null
          steadfast_tracking_code?: string | null
          total?: number
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      payment_link_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp: string
          phone: string
          token: string
          used: boolean
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp: string
          phone: string
          token: string
          used?: boolean
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp?: string
          phone?: string
          token?: string
          used?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      payment_link_payments: {
        Row: {
          amount: number
          created_at: string
          custom_data: Json
          failure_reason: string | null
          id: string
          link_id: string | null
          paid_at: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_id: string | null
          status: string
          trx_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          custom_data?: Json
          failure_reason?: string | null
          id?: string
          link_id?: string | null
          paid_at?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_id?: string | null
          status?: string
          trx_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          custom_data?: Json
          failure_reason?: string | null
          id?: string
          link_id?: string | null
          paid_at?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_id?: string | null
          status?: string
          trx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_link_payments_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_link_submissions: {
        Row: {
          created_at: string
          data: Json
          id: string
          link_id: string
          name: string | null
          phone: string | null
          phone_verified: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          link_id: string
          name?: string | null
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          link_id?: string
          name?: string | null
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_link_submissions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          brand_color: string | null
          brand_footer_note: string | null
          brand_logo_url: string | null
          brand_name: string | null
          brand_website: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json
          description: string | null
          fixed_amount: number | null
          hide_site_chrome: boolean
          id: string
          is_active: boolean
          mode: string
          require_otp: boolean
          title: string
          token: string
        }
        Insert: {
          brand_color?: string | null
          brand_footer_note?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_website?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          description?: string | null
          fixed_amount?: number | null
          hide_site_chrome?: boolean
          id?: string
          is_active?: boolean
          mode?: string
          require_otp?: boolean
          title: string
          token: string
        }
        Update: {
          brand_color?: string | null
          brand_footer_note?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_website?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          description?: string | null
          fixed_amount?: number | null
          hide_site_chrome?: boolean
          id?: string
          is_active?: boolean
          mode?: string
          require_otp?: boolean
          title?: string
          token?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      pos_held_sales: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          held_by: string
          hold_reference: string
          id: string
          items: Json
          note: string | null
          subtotal: number | null
          total: number | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          held_by: string
          hold_reference: string
          id?: string
          items?: Json
          note?: string | null
          subtotal?: number | null
          total?: number | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          held_by?: string
          hold_reference?: string
          id?: string
          items?: Json
          note?: string | null
          subtotal?: number | null
          total?: number | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      pos_register_sessions: {
        Row: {
          cash_difference: number | null
          closed_at: string | null
          closing_cash: number | null
          created_at: string
          expected_cash: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_cash: number
          status: string
          total_refunds: number | null
          total_sales: number | null
          total_transactions: number | null
          vendor_id: string | null
        }
        Insert: {
          cash_difference?: number | null
          closed_at?: string | null
          closing_cash?: number | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_cash?: number
          status?: string
          total_refunds?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          vendor_id?: string | null
        }
        Update: {
          cash_difference?: number | null
          closed_at?: string | null
          closing_cash?: number | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_cash?: number
          status?: string
          total_refunds?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      preorders: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preorders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_orders: {
        Row: {
          created_at: string | null
          customer_address: string | null
          customer_area: string | null
          customer_division: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_upazilla: string | null
          customer_zilla: string | null
          id: string
          notes: string | null
          prescription_url: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_address?: string | null
          customer_area?: string | null
          customer_division?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_upazilla?: string | null
          customer_zilla?: string | null
          id?: string
          notes?: string | null
          prescription_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_address?: string | null
          customer_area?: string | null
          customer_division?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_upazilla?: string | null
          customer_zilla?: string | null
          id?: string
          notes?: string | null
          prescription_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          images: Json | null
          is_verified: boolean | null
          order_id: string | null
          product_id: string
          rating: number
          reviewer_name: string | null
          user_id: string | null
          vendor_replied_at: string | null
          vendor_reply: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          images?: Json | null
          is_verified?: boolean | null
          order_id?: string | null
          product_id: string
          rating?: number
          reviewer_name?: string | null
          user_id?: string | null
          vendor_replied_at?: string | null
          vendor_reply?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          images?: Json | null
          is_verified?: boolean | null
          order_id?: string | null
          product_id?: string
          rating?: number
          reviewer_name?: string | null
          user_id?: string | null
          vendor_replied_at?: string | null
          vendor_reply?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          id: string
          price_adjustment: number | null
          product_id: string
          sku: string | null
          sort_order: number | null
          stock: number | null
          variant_name: string
          variant_value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          price_adjustment?: number | null
          product_id: string
          sku?: string | null
          sort_order?: number | null
          stock?: number | null
          variant_name: string
          variant_value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          price_adjustment?: number | null
          product_id?: string
          sku?: string | null
          sort_order?: number | null
          stock?: number | null
          variant_name?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category: string | null
          created_at: string | null
          delivery_time: string | null
          description: string | null
          generic_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_preorder: boolean | null
          is_qmall_verified: boolean | null
          name: string
          original_price: number | null
          preorder_count: number | null
          price: number
          price_unit: string | null
          rating: number | null
          requires_prescription: boolean | null
          sku: string | null
          slug: string | null
          sold_count: number | null
          specification: string | null
          stock: number | null
          subcategory: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          brand_id?: string | null
          category?: string | null
          created_at?: string | null
          delivery_time?: string | null
          description?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_preorder?: boolean | null
          is_qmall_verified?: boolean | null
          name: string
          original_price?: number | null
          preorder_count?: number | null
          price?: number
          price_unit?: string | null
          rating?: number | null
          requires_prescription?: boolean | null
          sku?: string | null
          slug?: string | null
          sold_count?: number | null
          specification?: string | null
          stock?: number | null
          subcategory?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          brand_id?: string | null
          category?: string | null
          created_at?: string | null
          delivery_time?: string | null
          description?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_preorder?: boolean | null
          is_qmall_verified?: boolean | null
          name?: string
          original_price?: number | null
          preorder_count?: number | null
          price?: number
          price_unit?: string | null
          rating?: number | null
          requires_prescription?: boolean | null
          sku?: string | null
          slug?: string | null
          sold_count?: number | null
          specification?: string | null
          stock?: number | null
          subcategory?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      purchase_invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount: number | null
          id: string
          invoice_number: string
          items: Json | null
          notes: string | null
          paid_amount: number | null
          payment_method: string | null
          payment_status: string | null
          purchase_date: string
          shipping_cost: number | null
          subtotal: number | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_phone: string | null
          total: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          id?: string
          invoice_number?: string
          items?: Json | null
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          purchase_date: string
          shipping_cost?: number | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          total?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          id?: string
          invoice_number?: string
          items?: Json | null
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          purchase_date?: string
          shipping_cost?: number | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_method: string | null
          admin_note: string | null
          admin_trx_id: string | null
          amount: number
          completed_at: string | null
          created_at: string | null
          id: string
          order_id: string
          processed_at: string | null
          reason: string | null
          status: string | null
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          admin_method?: string | null
          admin_note?: string | null
          admin_trx_id?: string | null
          amount: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          processed_at?: string | null
          reason?: string | null
          status?: string | null
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          admin_method?: string | null
          admin_note?: string | null
          admin_trx_id?: string | null
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string | null
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_return_items: {
        Row: {
          created_at: string
          id: string
          price: number
          product_id: string | null
          product_name: string | null
          quantity: number
          refund_amount: number
          restock: boolean | null
          return_id: string
          variant_info: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          price?: number
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          refund_amount?: number
          restock?: boolean | null
          return_id: string
          variant_info?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          refund_amount?: number
          restock?: boolean | null
          return_id?: string
          variant_info?: Json | null
        }
        Relationships: []
      }
      sales_returns: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          customer_user_id: string | null
          id: string
          notes: string | null
          original_order_id: string | null
          processed_by: string | null
          refund_method: string
          register_session_id: string | null
          return_number: string
          status: string
          total_refund: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          notes?: string | null
          original_order_id?: string | null
          processed_by?: string | null
          refund_method?: string
          register_session_id?: string | null
          return_number: string
          status?: string
          total_refund?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          notes?: string | null
          original_order_id?: string | null
          processed_by?: string | null
          refund_method?: string
          register_session_id?: string | null
          return_number?: string
          status?: string
          total_refund?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      section_banners: {
        Row: {
          after_section_id: string
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
        }
        Insert: {
          after_section_id: string
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
        }
        Update: {
          after_section_id?: string
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_banners_after_section_id_fkey"
            columns: ["after_section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          accent_color: string | null
          background_color: string | null
          bdcourier_api_key: string | null
          bkash_active: boolean | null
          bkash_app_key: string | null
          bkash_app_secret: string | null
          bkash_base_url: string | null
          bkash_password: string | null
          bkash_uat_mode: boolean | null
          bkash_uat_phones: string | null
          bkash_username: string | null
          border_color: string | null
          card_color: string | null
          carrybee_client_context: string | null
          carrybee_client_id: string | null
          carrybee_client_secret: string | null
          carrybee_store_id: string | null
          cod_delivery_charge: number | null
          favicon_url: string | null
          foreground_color: string | null
          id: string
          is_multivendor: boolean | null
          logo_url: string | null
          muted_color: string | null
          office_address: string | null
          office_email: string | null
          office_phone: string | null
          pathao_base_url: string | null
          pathao_client_id: string | null
          pathao_client_secret: string | null
          pathao_password: string | null
          pathao_store_id: string | null
          pathao_username: string | null
          primary_color: string | null
          site_name: string | null
          site_title: string | null
          steadfast_api_key: string | null
          steadfast_secret_key: string | null
          uddoktapay_active: boolean | null
          uddoktapay_api_key: string | null
          uddoktapay_base_url: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          bdcourier_api_key?: string | null
          bkash_active?: boolean | null
          bkash_app_key?: string | null
          bkash_app_secret?: string | null
          bkash_base_url?: string | null
          bkash_password?: string | null
          bkash_uat_mode?: boolean | null
          bkash_uat_phones?: string | null
          bkash_username?: string | null
          border_color?: string | null
          card_color?: string | null
          carrybee_client_context?: string | null
          carrybee_client_id?: string | null
          carrybee_client_secret?: string | null
          carrybee_store_id?: string | null
          cod_delivery_charge?: number | null
          favicon_url?: string | null
          foreground_color?: string | null
          id?: string
          is_multivendor?: boolean | null
          logo_url?: string | null
          muted_color?: string | null
          office_address?: string | null
          office_email?: string | null
          office_phone?: string | null
          pathao_base_url?: string | null
          pathao_client_id?: string | null
          pathao_client_secret?: string | null
          pathao_password?: string | null
          pathao_store_id?: string | null
          pathao_username?: string | null
          primary_color?: string | null
          site_name?: string | null
          site_title?: string | null
          steadfast_api_key?: string | null
          steadfast_secret_key?: string | null
          uddoktapay_active?: boolean | null
          uddoktapay_api_key?: string | null
          uddoktapay_base_url?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          bdcourier_api_key?: string | null
          bkash_active?: boolean | null
          bkash_app_key?: string | null
          bkash_app_secret?: string | null
          bkash_base_url?: string | null
          bkash_password?: string | null
          bkash_uat_mode?: boolean | null
          bkash_uat_phones?: string | null
          bkash_username?: string | null
          border_color?: string | null
          card_color?: string | null
          carrybee_client_context?: string | null
          carrybee_client_id?: string | null
          carrybee_client_secret?: string | null
          carrybee_store_id?: string | null
          cod_delivery_charge?: number | null
          favicon_url?: string | null
          foreground_color?: string | null
          id?: string
          is_multivendor?: boolean | null
          logo_url?: string | null
          muted_color?: string | null
          office_address?: string | null
          office_email?: string | null
          office_phone?: string | null
          pathao_base_url?: string | null
          pathao_client_id?: string | null
          pathao_client_secret?: string | null
          pathao_password?: string | null
          pathao_store_id?: string | null
          pathao_username?: string | null
          primary_color?: string | null
          site_name?: string | null
          site_title?: string | null
          steadfast_api_key?: string | null
          steadfast_secret_key?: string | null
          uddoktapay_active?: boolean | null
          uddoktapay_api_key?: string | null
          uddoktapay_base_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          message: string
          order_id: string | null
          phone: string
          provider_response: Json | null
          response: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          message: string
          order_id?: string | null
          phone: string
          provider_response?: Json | null
          response?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          message?: string
          order_id?: string | null
          phone?: string
          provider_response?: Json | null
          response?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      sms_settings: {
        Row: {
          admin_phone: string | null
          api_key: string | null
          api_token: string | null
          api_url: string | null
          caller_id: string | null
          id: string
          is_enabled: boolean | null
          login_sms_enabled: boolean | null
          notify_admin: boolean | null
          notify_customer: boolean | null
          notify_vendor: boolean | null
          on_new_order: boolean | null
          on_order_cancelled: boolean | null
          on_order_confirmed: boolean | null
          on_order_delivered: boolean | null
          on_order_shipped: boolean | null
          on_payment_received: boolean | null
          on_refund_approved: boolean | null
          order_sms_enabled: boolean | null
          order_template: string | null
          provider: string | null
          secret_key: string | null
          sender_id: string | null
          signup_sms_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          admin_phone?: string | null
          api_key?: string | null
          api_token?: string | null
          api_url?: string | null
          caller_id?: string | null
          id?: string
          is_enabled?: boolean | null
          login_sms_enabled?: boolean | null
          notify_admin?: boolean | null
          notify_customer?: boolean | null
          notify_vendor?: boolean | null
          on_new_order?: boolean | null
          on_order_cancelled?: boolean | null
          on_order_confirmed?: boolean | null
          on_order_delivered?: boolean | null
          on_order_shipped?: boolean | null
          on_payment_received?: boolean | null
          on_refund_approved?: boolean | null
          order_sms_enabled?: boolean | null
          order_template?: string | null
          provider?: string | null
          secret_key?: string | null
          sender_id?: string | null
          signup_sms_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          admin_phone?: string | null
          api_key?: string | null
          api_token?: string | null
          api_url?: string | null
          caller_id?: string | null
          id?: string
          is_enabled?: boolean | null
          login_sms_enabled?: boolean | null
          notify_admin?: boolean | null
          notify_customer?: boolean | null
          notify_vendor?: boolean | null
          on_new_order?: boolean | null
          on_order_cancelled?: boolean | null
          on_order_confirmed?: boolean | null
          on_order_delivered?: boolean | null
          on_order_shipped?: boolean | null
          on_payment_received?: boolean | null
          on_refund_approved?: boolean | null
          order_sms_enabled?: boolean | null
          order_template?: string | null
          provider?: string | null
          secret_key?: string | null
          sender_id?: string | null
          signup_sms_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_commissions: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          paid_by: string | null
          return_id: string | null
          sale_amount: number
          staff_id: string
          status: string
          vendor_id: string | null
        }
        Insert: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          paid_by?: string | null
          return_id?: string | null
          sale_amount?: number
          staff_id: string
          status?: string
          vendor_id?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          paid_by?: string | null
          return_id?: string | null
          sale_amount?: number
          staff_id?: string
          status?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          address: string | null
          bank_name: string | null
          created_at: string | null
          department: string | null
          designation: string | null
          email: string | null
          full_name: string
          id: string
          joining_date: string | null
          nid_url: string | null
          notes: string | null
          pay_account_number: string | null
          pay_method: string | null
          phone: string | null
          photo_url: string | null
          salary: number | null
          status: string | null
        }
        Insert: {
          address?: string | null
          bank_name?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          full_name: string
          id?: string
          joining_date?: string | null
          nid_url?: string | null
          notes?: string | null
          pay_account_number?: string | null
          pay_method?: string | null
          phone?: string | null
          photo_url?: string | null
          salary?: number | null
          status?: string | null
        }
        Update: {
          address?: string | null
          bank_name?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          full_name?: string
          id?: string
          joining_date?: string | null
          nid_url?: string | null
          notes?: string | null
          pay_account_number?: string | null
          pay_method?: string | null
          phone?: string | null
          photo_url?: string | null
          salary?: number | null
          status?: string | null
        }
        Relationships: []
      }
      static_pages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          slug: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          slug: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          slug?: string
          title?: string
        }
        Relationships: []
      }
      stock_transfer_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string | null
          quantity: number
          transfer_id: string
          unit_cost: number | null
          variant_info: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          transfer_id: string
          unit_cost?: number | null
          variant_info?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          transfer_id?: string
          unit_cost?: number | null
          variant_info?: Json | null
        }
        Relationships: []
      }
      stock_transfers: {
        Row: {
          created_at: string
          dispatched_at: string | null
          from_vendor_id: string | null
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          status: string
          to_vendor_id: string | null
          total_items: number | null
          total_value: number | null
          transfer_number: string
          transferred_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispatched_at?: string | null
          from_vendor_id?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: string
          to_vendor_id?: string | null
          total_items?: number | null
          total_value?: number | null
          transfer_number: string
          transferred_by: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispatched_at?: string | null
          from_vendor_id?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: string
          to_vendor_id?: string | null
          total_items?: number | null
          total_value?: number | null
          transfer_number?: string
          transferred_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          category_id: string
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_admin: boolean | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      trash: {
        Row: {
          created_at: string | null
          deleted_by: string | null
          id: string
          record_data: Json
          record_id: string
          restored_at: string | null
          table_name: string
        }
        Insert: {
          created_at?: string | null
          deleted_by?: string | null
          id?: string
          record_data: Json
          record_id: string
          restored_at?: string | null
          table_name: string
        }
        Update: {
          created_at?: string | null
          deleted_by?: string | null
          id?: string
          record_data?: Json
          record_id?: string
          restored_at?: string | null
          table_name?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address: string
          created_at: string | null
          division: string
          full_name: string
          id: string
          is_default: boolean | null
          phone: string
          upazilla: string | null
          user_id: string
          zilla: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          division: string
          full_name: string
          id?: string
          is_default?: boolean | null
          phone: string
          upazilla?: string | null
          user_id: string
          zilla?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          division?: string
          full_name?: string
          id?: string
          is_default?: boolean | null
          phone?: string
          upazilla?: string | null
          user_id?: string
          zilla?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_follows: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_follows_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payment_methods: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          branch_name: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          method_type: string
          vendor_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          method_type: string
          vendor_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          method_type?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payment_methods_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payouts: {
        Row: {
          admin_method: string | null
          admin_note: string | null
          admin_trx_id: string | null
          amount: number
          completed_at: string | null
          id: string
          payment_method_id: string | null
          processed_at: string | null
          requested_at: string | null
          status: string | null
          vendor_id: string
        }
        Insert: {
          admin_method?: string | null
          admin_note?: string | null
          admin_trx_id?: string | null
          amount: number
          completed_at?: string | null
          id?: string
          payment_method_id?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          vendor_id: string
        }
        Update: {
          admin_method?: string | null
          admin_note?: string | null
          admin_trx_id?: string | null
          amount?: number
          completed_at?: string | null
          id?: string
          payment_method_id?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payouts_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "vendor_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          banner_url: string | null
          commission_rate: number | null
          created_at: string | null
          id: string
          logo_url: string | null
          phone: string | null
          status: string | null
          store_description: string | null
          store_name: string
          total_earnings: number | null
          total_followers: number | null
          user_id: string
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          status?: string | null
          store_description?: string | null
          store_name: string
          total_earnings?: number | null
          total_followers?: number | null
          user_id: string
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          status?: string | null
          store_description?: string | null
          store_name?: string
          total_earnings?: number | null
          total_followers?: number | null
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: { Args: { data: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      app_role: "admin" | "vendor" | "user"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      app_role: ["admin", "vendor", "user"],
    },
  },
} as const
