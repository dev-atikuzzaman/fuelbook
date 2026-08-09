-- ════════════════════════════════════════════════════════════════
-- মাইগ্রেশন ৩: মাল্টিপল ছবি গ্যালারি
-- ════════════════════════════════════════════════════════════════

alter table public.dictionary_entries add column if not exists gallery_images text[] not null default '{}';
alter table public.custom_entries add column if not exists gallery_images text[] not null default '{}';
