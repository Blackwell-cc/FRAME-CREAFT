begin;

select plan(14);

select has_table('public', 'techniques');
select has_table('public', 'media');
select has_table('public', 'saved_prompts');
select has_table('public', 'favorites');
select has_table('public', 'user_settings');
select has_table('public', 'owner_profiles');
select has_table('public', 'sync_receipts');
select has_function('public', 'is_framecraft_owner', array[]::text[]);
select is(
  (select public.is_framecraft_owner()),
  false,
  'anonymous is not owner'
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
