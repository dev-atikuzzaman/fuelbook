-- ════════════════════════════════════════════════════════════════
-- মাইগ্রেশন ৪: ফেভারিট/পিন (ডিকশনারি + ফাইল + কাস্টম এন্ট্রি)
-- Supabase Dashboard → SQL Editor → New query → পুরোটা paste করে Run করো
-- ════════════════════════════════════════════════════════════════

alter table public.dictionary_entries add column if not exists pinned boolean not null default false;
create index if not exists idx_dict_pinned on public.dictionary_entries (pinned);

alter table public.files add column if not exists pinned boolean not null default false;

alter table public.custom_entries add column if not exists pinned boolean not null default false;

-- ════════════════════════════════════════════════════════════════
-- সম্পন্ন! নতুন কোড GitHub এ push করো, Vercel অটো-রিডিপ্লয় করবে।
-- বিদ্যমান কোনো ডাটা মুছে যাবে না — সব এন্ট্রি "আনপিন করা" অবস্থায় শুরু হবে।
-- ════════════════════════════════════════════════════════════════
