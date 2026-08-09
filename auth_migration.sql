-- ════════════════════════════════════════════════════════════════
-- মাইগ্রেশন: এডমিন-অনলি লগইন চালু করা (আগে যারা supabase_schema.sql
-- একবার Run করেছো, শুধু এই ফাইলটা Run করলেই হবে — পুরোটা আবার লাগবে না)
-- Supabase Dashboard → SQL Editor → New query → এই পুরোটা paste করে Run করো
-- ════════════════════════════════════════════════════════════════

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

-- এরপর Supabase Dashboard → Authentication → Users → "Add user" দিয়ে
-- এডমিন অ্যাকাউন্ট বানাও ("Auto Confirm User" টিক দিয়ে), তারপর
-- Authentication → Settings এ "Allow new users to sign up" বন্ধ করে দাও।
