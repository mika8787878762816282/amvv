// Database types for Supabase tables
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            company_settings: {
                Row: {
                    id: string
                    company_name: string
                    company_address: string | null
                    company_phone: string | null
                    company_email: string | null
                    working_hours: string | null
                    services: string[] | null
                    about_company: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['company_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['company_settings']['Insert']>
            }
            clients: {
                Row: {
                    id: string
                    firstname: string
                    lastname: string
                    email: string | null
                    phone: string | null
                    address: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['clients']['Insert']>
            }
            whatsapp_messages: {
                Row: {
                    id: string
                    phone_number: string
                    sender: 'user' | 'assistant'
                    message_content: string
                    received_at: string
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['whatsapp_messages']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['whatsapp_messages']['Insert']>
            }
            appointments: {
                Row: {
                    id: string
                    client_name: string
                    phone_number: string
                    appointment_date: string | null
                    appointment_type: string | null
                    status: 'pending' | 'confirmed' | 'cancelled'
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['appointments']['Insert']>
            }
            quotes: {
                Row: {
                    id: string
                    client_id: string
                    quote_number: string
                    total_ht: number
                    total_ttc: number
                    tva_rate: number
                    status: 'draft' | 'sent' | 'accepted' | 'rejected'
                    pdf_url: string | null
                    items: Json
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['quotes']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['quotes']['Insert']>
            }
            invoices: {
                Row: {
                    id: string
                    quote_id: string | null
                    client_id: string
                    invoice_number: string
                    total_ht: number
                    total_ttc: number
                    tva_rate: number
                    status: 'unpaid' | 'paid' | 'overdue'
                    pdf_url: string | null
                    items: Json
                    created_at: string
                    updated_at: string
                    paid_at: string | null
                }
                Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['invoices']['Insert']>
            }
            ai_renderings: {
                Row: {
                    id: string
                    client_id: string | null
                    original_image_url: string
                    generated_image_url: string
                    prompt: string
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['ai_renderings']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['ai_renderings']['Insert']>
            }
            allovoisin_leads: {
                Row: {
                    id: string
                    email_date: string
                    client_name: string
                    project_type: string
                    city: string
                    postal_code: string
                    distance_km: number | null
                    estimated_price_min: number | null
                    estimated_price_max: number | null
                    original_link: string | null
                    status: 'pending' | 'interested' | 'rejected' | 'converted'
                    notes: string | null
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['allovoisin_leads']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['allovoisin_leads']['Insert']>
            }
            facebook_prospects: {
                Row: {
                    id: string
                    post_title: string
                    post_description: string | null
                    author_name: string | null
                    contact_info: string | null
                    post_url: string
                    relevance_score: number
                    location: string | null
                    status: 'new' | 'contacted' | 'qualified' | 'rejected'
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['facebook_prospects']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['facebook_prospects']['Insert']>
            }
            reviews: {
                Row: {
                    id: string
                    client_id: string
                    rating: number | null
                    comment: string | null
                    platform: string | null
                    status: 'pending' | 'received' | 'published'
                    sent_at: string
                    received_at: string | null
                }
                Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id'>
                Update: Partial<Database['public']['Tables']['reviews']['Insert']>
            }
            company_files: {
                Row: {
                    id: string
                    file_type: 'system_prompt' | 'pricing' | 'quote_template' | 'invoice_template' | 'document' | 'photo' | 'plan'
                    file_name: string
                    file_content: string | null
                    file_url: string | null
                    client_id: string | null
                    category: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['company_files']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['company_files']['Insert']>
            }
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    role: 'admin' | 'user'
                    enabled_features: string[]
                    n8n_config: Record<string, string>
                    created_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    role?: 'admin' | 'user'
                    enabled_features?: string[]
                    n8n_config?: Record<string, string>
                }
                Update: {
                    email?: string | null
                    role?: 'admin' | 'user'
                    enabled_features?: string[]
                    n8n_config?: Record<string, string>
                }
            }
        }
        Views: {}
        Functions: {}
    }
}
