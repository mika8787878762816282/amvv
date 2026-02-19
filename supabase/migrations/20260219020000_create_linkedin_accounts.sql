create table if not exists public.linkedin_accounts (
  id uuid primary key default gen_random_uuid(),
  linkedin_sub text not null unique,
  linkedin_urn text generated always as ('urn:li:person:' || linkedin_sub) stored,
  email text,
  name text,
  access_token text not null,
  token_expires_at timestamptz,
  scope text,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_linkedin_accounts_email on public.linkedin_accounts(email);

create or replace function public.set_updated_at_linkedin_accounts()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_linkedin_accounts_updated_at on public.linkedin_accounts;
create trigger trg_linkedin_accounts_updated_at
before update on public.linkedin_accounts
for each row execute function public.set_updated_at_linkedin_accounts();

alter table public.linkedin_accounts enable row level security;

-- No direct access by anon/authenticated clients to raw token table.
drop policy if exists linkedin_accounts_no_direct_select on public.linkedin_accounts;
create policy linkedin_accounts_no_direct_select
on public.linkedin_accounts
for select
using (false);

drop policy if exists linkedin_accounts_no_direct_write on public.linkedin_accounts;
create policy linkedin_accounts_no_direct_write
on public.linkedin_accounts
for all
using (false)
with check (false);
