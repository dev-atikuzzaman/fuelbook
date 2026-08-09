-- ════════════════════════════════════════════════════════════════
-- মাইগ্রেশন ২: ট্যাগ ফিল্টার + টেমপ্লেট ফিল্ড বিল্ডার
-- ════════════════════════════════════════════════════════════════

alter table public.files add column if not exists tags text[] not null default '{}';
create index if not exists idx_files_tags on public.files using gin (tags);

alter table public.custom_entries add column if not exists tags text[] not null default '{}';
create index if not exists idx_custom_entries_tags on public.custom_entries using gin (tags);

create table if not exists public.custom_template_fields (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.custom_templates(id) on delete cascade,
  label        text not null,
  field_type   text not null default 'text'
               check (field_type in ('text','textarea','number','date','dropdown','radio','checkbox','image')),
  options      text[] not null default '{}',
  field_order  int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_template_fields_template on public.custom_template_fields (template_id);

create table if not exists public.custom_field_values (
  id                 uuid primary key default gen_random_uuid(),
  entry_id           uuid not null references public.custom_entries(id) on delete cascade,
  template_field_id  uuid not null references public.custom_template_fields(id) on delete cascade,
  value              text default '',
  unique (entry_id, template_field_id)
);
create index if not exists idx_field_values_entry on public.custom_field_values (entry_id);

do $$
declare t text;
begin
  foreach t in array array['custom_template_fields','custom_field_values'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "authenticated_full_access" on public.%I;', t);
    execute format($p$create policy "authenticated_full_access" on public.%I
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');$p$, t);
  end loop;
end $$;

alter publication supabase_realtime add table public.custom_template_fields;
alter publication supabase_realtime add table public.custom_field_values;
