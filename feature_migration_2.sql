-- ════════════════════════════════════════════════════════════════
-- মাইগ্রেশন ২: ট্যাগ ফিল্টার (ফাইল ও কাস্টম এন্ট্রিতে) + টেমপ্লেট
-- ফিল্ড বিল্ডার (ড্রপডাউন/রেডিও/ছবি ইত্যাদি টাইপড ফিল্ড)
-- Supabase Dashboard → SQL Editor → New query → পুরোটা paste করে Run করো
-- ════════════════════════════════════════════════════════════════

-- ১) ট্যাগ কলাম যোগ করো files ও custom_entries টেবিলে
alter table public.files add column if not exists tags text[] not null default '{}';
create index if not exists idx_files_tags on public.files using gin (tags);

alter table public.custom_entries add column if not exists tags text[] not null default '{}';
create index if not exists idx_custom_entries_tags on public.custom_entries using gin (tags);

-- ২) নতুন টেমপ্লেট-ফিল্ড-বিল্ডার টেবিল
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

-- ৩) পুরনো custom_fields (ad-hoc key-value) টেবিল আর ব্যবহার হবে না —
-- নতুন কোড এটা পড়ে না। চাইলে পুরনো ডাটা ব্যাকআপ নিয়ে তারপর এই লাইনটা
-- আনকমেন্ট করে ড্রপ করতে পারো (ঐচ্ছিক, চাপ দিয়ে চালানোর দরকার নেই):
-- drop table if exists public.custom_fields;

-- ৪) নতুন টেবিলে RLS চালু করো (শুধু লগইন করা এডমিন)
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

-- ৫) রিয়েল-টাইম সিঙ্কে নতুন টেবিল যোগ করো
alter publication supabase_realtime add table public.custom_template_fields;
alter publication supabase_realtime add table public.custom_field_values;

-- ════════════════════════════════════════════════════════════════
-- সম্পন্ন! নতুন কোড GitHub এ push করো, Vercel অটো-রিডিপ্লয় করবে।
-- ════════════════════════════════════════════════════════════════
