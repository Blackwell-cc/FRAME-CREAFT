begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(16);

select has_table('public', 'techniques', 'techniques table exists');
select has_table('public', 'media', 'media table exists');
select has_table('public', 'saved_prompts', 'saved prompts table exists');
select has_table('public', 'favorites', 'favorites table exists');
select has_table('public', 'user_settings', 'user settings table exists');
select has_table('public', 'owner_profiles', 'owner profiles table exists');
select has_table('public', 'sync_receipts', 'sync receipts table exists');
select has_function('public', 'is_framecraft_owner', array[]::text[]);
select has_function(
  'public',
  'apply_framecraft_operation',
  array['uuid', 'text', 'text', 'text', 'integer', 'jsonb']
);
select is(
  (select public.is_framecraft_owner()),
  false,
  'anonymous is not owner'
);
select is(
  (select public.is_framecraft_owner()),
  false,
  'anonymous remains non-owner for edge function authorization'
);
select ok(
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'techniques'),
  'techniques RLS enabled'
);
select ok(
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'saved_prompts'),
  'saved prompts RLS enabled'
);
select ok(
  exists(select 1 from storage.buckets where id = 'technique-images' and public),
  'public image bucket exists'
);
select is(
  (select count(*)::int from pg_policies where tablename = 'techniques' and cmd = 'INSERT'),
  1,
  'one guarded insert policy'
);
select is(
  (select count(*)::int from pg_policies where tablename = 'saved_prompts' and cmd = 'SELECT'),
  1,
  'one private select policy'
);

select * from finish();
rollback;
