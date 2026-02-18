-- Enable Extensions
create extension if not exists "uuid-ossp";

-- 1. Clients
create table if not exists clients (
  id uuid default uuid_generate_v4() primary key,
  firstname text not null,
  lastname text not null,
  email text,
  phone text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Company Settings
create table if not exists company_settings (
    id uuid default uuid_generate_v4() primary key,
    company_name text not null,
    company_address text,
    company_phone text,
    company_email text,
    working_hours text,
    services text[],
    about_company text,
    n8n_config jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. WhatsApp Messages
create table if not exists whatsapp_messages (
    id uuid default uuid_generate_v4() primary key,
    phone_number text not null,
    sender text check (sender in ('user', 'assistant')) not null,
    message_content text not null,
    received_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Company Files
create table if not exists company_files (
    id uuid default uuid_generate_v4() primary key,
    file_type text check (file_type in ('system_prompt', 'pricing', 'quote_template', 'invoice_template', 'document', 'photo', 'plan')) not null,
    file_name text not null,
    file_content text,
    file_url text,
    client_id uuid references clients(id) on delete set null,
    category text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Appointments
create table if not exists appointments (
    id uuid default uuid_generate_v4() primary key,
    client_name text not null,
    phone_number text not null,
    appointment_date timestamp with time zone,
    appointment_type text,
    status text check (status in ('pending', 'confirmed', 'cancelled')) default 'pending',
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Quotes
create table if not exists quotes (
    id uuid default uuid_generate_v4() primary key,
    client_id uuid references clients(id) on delete cascade not null,
    quote_number text not null,
    total_ht numeric not null default 0,
    total_ttc numeric not null default 0,
    tva_rate numeric not null default 20,
    status text check (status in ('draft', 'sent', 'accepted', 'rejected')) default 'draft',
    pdf_url text,
    items jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Invoices
create table if not exists invoices (
    id uuid default uuid_generate_v4() primary key,
    quote_id uuid references quotes(id) on delete set null,
    client_id uuid references clients(id) on delete cascade not null,
    invoice_number text not null,
    total_ht numeric not null default 0,
    total_ttc numeric not null default 0,
    tva_rate numeric not null default 20,
    status text check (status in ('unpaid', 'paid', 'overdue')) default 'unpaid',
    pdf_url text,
    items jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    paid_at timestamp with time zone
);

-- 8. AI Renderings
create table if not exists ai_renderings (
    id uuid default uuid_generate_v4() primary key,
    client_id uuid references clients(id) on delete set null,
    original_image_url text not null,
    generated_image_url text not null,
    prompt text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. AlloVoisin Leads
create table if not exists allovoisin_leads (
    id uuid default uuid_generate_v4() primary key,
    email_date timestamp with time zone not null,
    client_name text not null,
    project_type text not null,
    city text not null,
    postal_code text not null,
    distance_km numeric,
    estimated_price_min numeric,
    estimated_price_max numeric,
    original_link text,
    status text check (status in ('pending', 'interested', 'rejected', 'converted')) default 'pending',
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Facebook Prospects
create table if not exists facebook_prospects (
    id uuid default uuid_generate_v4() primary key,
    post_title text not null,
    post_description text,
    author_name text,
    contact_info text,
    post_url text not null,
    relevance_score numeric default 0,
    location text,
    status text check (status in ('new', 'contacted', 'qualified', 'rejected')) default 'new',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Reviews
create table if not exists reviews (
    id uuid default uuid_generate_v4() primary key,
    client_id uuid references clients(id) on delete cascade not null,
    rating numeric check (rating >= 1 and rating <= 5),
    comment text,
    platform text,
    status text check (status in ('pending', 'received', 'published')) default 'pending',
    sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
    received_at timestamp with time zone
);

-- Enable RLS on all tables
alter table clients enable row level security;
alter table company_settings enable row level security;
alter table whatsapp_messages enable row level security;
alter table company_files enable row level security;
alter table appointments enable row level security;
alter table quotes enable row level security;
alter table invoices enable row level security;
alter table ai_renderings enable row level security;
alter table allovoisin_leads enable row level security;
alter table facebook_prospects enable row level security;
alter table reviews enable row level security;

-- Simple policies for now (Authenticated users can do everything - for internal tool usage)
-- In a real app, restrict based on ownership or role 'admin'
create policy "Enable all access for authenticated users" on clients for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on company_settings for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on whatsapp_messages for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on company_files for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on appointments for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on quotes for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on invoices for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on ai_renderings for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on allovoisin_leads for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on facebook_prospects for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on reviews for all using (auth.role() = 'authenticated');
