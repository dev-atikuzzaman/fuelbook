-- ════════════════════════════════════════════════════════════════
-- আমার অভিধান (Amar Obhidhan) — Supabase schema
-- Supabase Dashboard → SQL Editor → New query → পুরোটা paste করে Run করো
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── ১) তিনটা ডিকশনারি একটাই টেবিলে, dict_type দিয়ে আলাদা ───────────
create table if not exists public.dictionary_entries (
  id            uuid primary key default gen_random_uuid(),
  dict_type     text not null check (dict_type in ('general','technical','government')),
  term          text not null,
  term_image_url text,
  meaning       text default '',
  explanation   text default '',
  analogy       text default '',
  application   text default '',
  example       text default '',
  misc          text default '',
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_dict_type on public.dictionary_entries (dict_type);
create index if not exists idx_dict_term on public.dictionary_entries using gin (to_tsvector('simple', term));
create index if not exists idx_dict_tags on public.dictionary_entries using gin (tags);

-- ── ২) ফাইল/ফোল্ডার আপলোড টেবিল (metadata; আসল ফাইল Storage bucket এ) ──
create table if not exists public.files (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  path        text not null,               -- storage object path
  folder_path text not null default '',    -- ভার্চুয়াল ফোল্ডার, যেমন "নথি/ব্যাংক"
  size        bigint default 0,
  mime_type   text default '',
  created_at  timestamptz not null default now()
);
create index if not exists idx_files_folder on public.files (folder_path);

-- ── ৩) কাস্টম টেমপ্লেট/টপিক ────────────────────────────────────────
create table if not exists public.custom_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  created_at  timestamptz not null default now()
);

-- ── ৪) কাস্টম টেমপ্লেটের আন্ডারে এন্ট্রি (মূল টেক্সট/ছবি) ───────────
create table if not exists public.custom_entries (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.custom_templates(id) on delete cascade,
  title         text not null,
  main_text     text default '',
  main_image_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_custom_entries_template on public.custom_entries (template_id);

-- ── ৫) প্রতিটা এন্ট্রির জন্য ইচ্ছামতো কাস্টম ফিল্ড (key-value) ──────
create table if not exists public.custom_fields (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.custom_entries(id) on delete cascade,
  field_name  text not null,
  field_value text default '',
  field_order int not null default 0
);
create index if not exists idx_custom_fields_entry on public.custom_fields (entry_id);

-- ── updated_at অটো-আপডেট ট্রিগার ─────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_dict on public.dictionary_entries;
create trigger trg_touch_dict before update on public.dictionary_entries
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_custom_entries on public.custom_entries;
create trigger trg_touch_custom_entries before update on public.custom_entries
  for each row execute function public.touch_updated_at();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────
-- এটা একটা পার্সোনাল, একজন-এডমিন-চালিত অ্যাপ। শুধুমাত্র Supabase Auth
-- দিয়ে লগইন করা ইউজার (authenticated role) ডাটা পড়তে/লিখতে পারবে —
-- anonymous/না-লগইন-করা কেউ কিছুই দেখতে বা বদলাতে পারবে না।
do $$
declare t text;
begin
  foreach t in array array['dictionary_entries','files','custom_templates','custom_entries','custom_fields'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "anon_full_access" on public.%I;', t);
    execute format('drop policy if exists "authenticated_full_access" on public.%I;', t);
    execute format($p$create policy "authenticated_full_access" on public.%I
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');$p$, t);
  end loop;
end $$;

-- ── REALTIME — সব ডিভাইসে লাইভ সিঙ্কের জন্য দরকারি ─────────────────
alter publication supabase_realtime add table public.dictionary_entries;
alter publication supabase_realtime add table public.files;
alter publication supabase_realtime add table public.custom_templates;
alter publication supabase_realtime add table public.custom_entries;
alter publication supabase_realtime add table public.custom_fields;

-- ── STORAGE BUCKETS ───────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('app-images', 'app-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('app-files', 'app-files', true)
on conflict (id) do nothing;

-- Storage policies: শুধু লগইন করা এডমিন আপলোড/ডিলিট করতে পারবে।
-- bucket দুইটা public=true রাখা হয়েছে যাতে getPublicUrl() দিয়ে জেনারেট করা
-- লিংক থেকে সরাসরি ছবি/ফাইল দেখা বা ডাউনলোড করা যায় (path random বলে অনুমান করা কঠিন);
-- upload/update/delete-এর জন্য অবশ্যই লগইন লাগবে।
drop policy if exists "anon_storage_all_images" on storage.objects;
drop policy if exists "authenticated_storage_write_images" on storage.objects;
create policy "authenticated_storage_write_images" on storage.objects
  for all using (bucket_id = 'app-images' and auth.role() = 'authenticated')
  with check (bucket_id = 'app-images' and auth.role() = 'authenticated');

drop policy if exists "anon_storage_all_files" on storage.objects;
drop policy if exists "authenticated_storage_write_files" on storage.objects;
create policy "authenticated_storage_write_files" on storage.objects
  for all using (bucket_id = 'app-files' and auth.role() = 'authenticated')
  with check (bucket_id = 'app-files' and auth.role() = 'authenticated');

-- ══════════════════════════════════════════════════════════════
-- সম্পন্ন! এখন নিচের ধাপে এডমিন অ্যাকাউন্ট বানাও:
--
-- Supabase Dashboard → Authentication → Users → "Add user"
--   → নিজের ইমেইল ও পাসওয়ার্ড দাও → "Auto Confirm User" টিক দাও → Create
--
-- তারপর Authentication → Settings/Providers এ গিয়ে
-- "Allow new users to sign up" অপশনটা বন্ধ (OFF) করে দাও,
-- যাতে তুমি ছাড়া আর কেউ নতুন অ্যাকাউন্ট বানাতে না পারে।
--
-- React অ্যাপে REACT_APP_SUPABASE_URL ও REACT_APP_SUPABASE_ANON_KEY
-- বসিয়ে Vercel এ deploy করো — লগইন স্ক্রিনে ওই ইমেইল/পাসওয়ার্ড দিয়ে ঢুকবে।
-- ══════════════════════════════════════════════════════════════
