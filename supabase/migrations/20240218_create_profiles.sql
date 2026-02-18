-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text default 'user',
  enabled_features jsonb default '["dashboard", "devis", "factures", "clients", "rdv"]'::jsonb,
  n8n_config jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a trigger to automatically create a profile entry when a new user signs up via Supabase Auth.
-- Note: This trigger is for self-sign up. For admin creation, we might handle it manually or rely on this too.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, enabled_features, n8n_config)
  values (
    new.id,
    new.email,
    'user', -- default role
    '["dashboard", "devis", "factures", "clients", "rdv"]'::jsonb, -- default features
    '{}'::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Policy for Admin to update any profile (assuming we have a way to identify admins, 
-- for now we can rely on the 'role' field in the profile itself via a recursive check 
-- OR just allow all for now and secure via App logic if RLS is too complex for this stage).
-- Let's add a policy that allows users with role 'admin' to update others.

create policy "Admins can update all profiles" on profiles
  for update using (
    auth.uid() in (
      select id from profiles where role = 'admin'
    )
  );
