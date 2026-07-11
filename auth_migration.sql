-- ════════════════════════════════════════════════════════════════
-- মাইগ্রেশন: এডমিন-অনলি লগইন চালু করা (আগে যারা supabase_schema.sql
-- একবার Run করেছো, শুধু এই ফাইলটা Run করলেই হবে — পুরোটা আবার লাগবে না)
-- Supabase Dashboard → SQL Editor → New query → এই পুরোটা paste করে Run করো
-- ════════════════════════════════════════════════════════════════

-- ১) টেবিল পলিসি: anon (না-লগইন) অ্যাক্সেস বাদ, শুধু authenticated চলবে
do $$
declare t text;
begin
  foreach t in array array['dictionary_entries','files','custom_templates','custom_entries','custom_fields'] loop
    execute format('drop policy if exists "anon_full_access" on public.%I;', t);
    execute format('drop policy if exists "authenticated_full_access" on public.%I;', t);
    execute format($p$create policy "authenticated_full_access" on public.%I
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');$p$, t);
  end loop;
end $$;

-- ২) স্টোরেজ পলিসি: আপলোড/ডিলিট শুধু authenticated এডমিনের জন্য
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

-- ৩) এরপর এডমিন অ্যাকাউন্ট বানাও:
-- Supabase Dashboard → Authentication → Users → "Add user"
--   → নিজের ইমেইল ও পাসওয়ার্ড দাও → "Auto Confirm User" টিক দিয়ে Create
--
-- ৪) তারপর Authentication → Settings এ গিয়ে
-- "Allow new users to sign up" বন্ধ (OFF) করে দাও।
--
-- ৫) নতুন কোড GitHub এ push করো, Vercel অটো-রিডিপ্লয় করবে।
-- ════════════════════════════════════════════════════════════════
