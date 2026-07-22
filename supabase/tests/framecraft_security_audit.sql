with checks(test_no, check_name, passed, expected, actual) as (
  select 1, 'table public.techniques exists',
    to_regclass('public.techniques') is not null,
    'public.techniques', coalesce(to_regclass('public.techniques')::text, 'missing')
  union all
  select 2, 'table public.media exists',
    to_regclass('public.media') is not null,
    'public.media', coalesce(to_regclass('public.media')::text, 'missing')
  union all
  select 3, 'table public.saved_prompts exists',
    to_regclass('public.saved_prompts') is not null,
    'public.saved_prompts', coalesce(to_regclass('public.saved_prompts')::text, 'missing')
  union all
  select 4, 'table public.favorites exists',
    to_regclass('public.favorites') is not null,
    'public.favorites', coalesce(to_regclass('public.favorites')::text, 'missing')
  union all
  select 5, 'table public.user_settings exists',
    to_regclass('public.user_settings') is not null,
    'public.user_settings', coalesce(to_regclass('public.user_settings')::text, 'missing')
  union all
  select 6, 'table public.owner_profiles exists',
    to_regclass('public.owner_profiles') is not null,
    'public.owner_profiles', coalesce(to_regclass('public.owner_profiles')::text, 'missing')
  union all
  select 7, 'table public.sync_receipts exists',
    to_regclass('public.sync_receipts') is not null,
    'public.sync_receipts', coalesce(to_regclass('public.sync_receipts')::text, 'missing')
  union all
  select 8, 'function is_framecraft_owner() exists',
    to_regprocedure('public.is_framecraft_owner()') is not null,
    'public.is_framecraft_owner()', coalesce(to_regprocedure('public.is_framecraft_owner()')::text, 'missing')
  union all
  select 9, 'function apply_framecraft_operation signature exists',
    to_regprocedure('public.apply_framecraft_operation(uuid,text,text,text,integer,jsonb)') is not null,
    'uuid,text,text,text,integer,jsonb',
    coalesce(to_regprocedure('public.apply_framecraft_operation(uuid,text,text,text,integer,jsonb)')::text, 'missing')
  union all
  select 10, 'SQL Editor request has no owner auth context',
    public.is_framecraft_owner() = false,
    'false', public.is_framecraft_owner()::text
  union all
  select 11, 'anonymous remains non-owner for Edge authorization',
    public.is_framecraft_owner() = false,
    'false', public.is_framecraft_owner()::text
  union all
  select 12, 'techniques RLS enabled',
    coalesce((select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'techniques'), false),
    'true', coalesce((select rowsecurity::text from pg_tables where schemaname = 'public' and tablename = 'techniques'), 'missing')
  union all
  select 13, 'saved_prompts RLS enabled',
    coalesce((select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'saved_prompts'), false),
    'true', coalesce((select rowsecurity::text from pg_tables where schemaname = 'public' and tablename = 'saved_prompts'), 'missing')
  union all
  select 14, 'public technique-images bucket exists',
    exists(select 1 from storage.buckets where id = 'technique-images' and public),
    'true', coalesce((select public::text from storage.buckets where id = 'technique-images'), 'missing')
  union all
  select 15, 'one guarded techniques INSERT policy',
    (select count(*) from pg_policies where schemaname = 'public' and tablename = 'techniques' and cmd = 'INSERT') = 1,
    '1', (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'techniques' and cmd = 'INSERT')
  union all
  select 16, 'one private saved_prompts SELECT policy',
    (select count(*) from pg_policies where schemaname = 'public' and tablename = 'saved_prompts' and cmd = 'SELECT') = 1,
    '1', (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'saved_prompts' and cmd = 'SELECT')
)
select
  test_no,
  case when passed then 'PASS' else 'FAIL' end as status,
  check_name,
  expected,
  actual
from checks
order by test_no;
