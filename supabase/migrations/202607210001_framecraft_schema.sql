-- FRAME / CRAFT cloud schema
-- Public library rows are readable by visitors; every write requires the owner profile.

begin;

create table public.owner_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_framecraft_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.owner_profiles
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_framecraft_owner() from public;
grant execute on function public.is_framecraft_owner() to anon, authenticated;

create or replace function public.set_framecraft_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_framecraft_updated_at() from public;

create table public.techniques (
  id text primary key,
  slug text not null unique,
  schema_version smallint not null default 1 check (schema_version = 1),
  source_type text not null check (source_type in ('seed', 'custom')),
  category text not null check (
    category in (
      'shot-size',
      'camera-angle',
      'camera-movement',
      'lighting',
      'composition',
      'lens',
      'camera-settings'
    )
  ),
  title_en text not null,
  title_th text not null,
  abbreviation text,
  description_en text not null,
  description_th text not null,
  use_cases_th text not null,
  effect_th text not null,
  warnings_th text not null,
  tags text[] not null default '{}',
  moods text[] not null default '{}',
  recommended_lenses text[] not null default '{}',
  camera_settings text[] not null default '{}',
  image_keywords text[] not null default '{}',
  video_keywords text[] not null default '{}',
  generic_image_prompt text not null,
  generic_video_prompt text not null,
  video_reference_url text,
  is_hidden boolean not null default false,
  published boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index techniques_public_listing_idx
  on public.techniques (category, title_en)
  where published and deleted_at is null;

create trigger techniques_set_updated_at
before update on public.techniques
for each row execute function public.set_framecraft_updated_at();

create table public.media (
  id text primary key,
  technique_id text not null references public.techniques(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  ),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  alt_th text not null default '',
  alt_en text not null default '',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index media_technique_idx on public.media (technique_id)
  where deleted_at is null;

create trigger media_set_updated_at
before update on public.media
for each row execute function public.set_framecraft_updated_at();

create table public.saved_prompts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mode text not null check (mode in ('image', 'video')),
  platform text not null check (
    platform in (
      'generic-image',
      'midjourney',
      'flux',
      'generic-video',
      'runway',
      'kling',
      'veo'
    )
  ),
  input jsonb not null default '{}'::jsonb,
  generated_prompt text not null,
  edited_prompt text not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index saved_prompts_user_idx on public.saved_prompts (user_id, updated_at desc)
  where deleted_at is null;

create trigger saved_prompts_set_updated_at
before update on public.saved_prompts
for each row execute function public.set_framecraft_updated_at();

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('technique', 'prompt')),
  entity_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'th' check (language in ('th', 'en')),
  default_mode text not null default 'image' check (default_mode in ('image', 'video')),
  default_platform text not null default 'generic-image' check (
    default_platform in (
      'generic-image',
      'midjourney',
      'flux',
      'generic-video',
      'runway',
      'kling',
      'veo'
    )
  ),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_framecraft_updated_at();

create table public.sync_receipts (
  operation_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (
    entity_type in ('technique', 'media', 'prompt', 'favorite', 'settings')
  ),
  entity_id text not null,
  action text not null check (action in ('upsert', 'delete')),
  applied_version integer not null check (applied_version >= 0),
  applied_at timestamptz not null default now()
);

create index sync_receipts_user_idx
  on public.sync_receipts (user_id, applied_at desc);

alter table public.owner_profiles enable row level security;
alter table public.techniques enable row level security;
alter table public.media enable row level security;
alter table public.saved_prompts enable row level security;
alter table public.favorites enable row level security;
alter table public.user_settings enable row level security;
alter table public.sync_receipts enable row level security;

revoke all on table public.owner_profiles from anon, authenticated;

grant select on table public.techniques, public.media to anon, authenticated;
grant insert, update, delete on table public.techniques, public.media to authenticated;

revoke all on table public.saved_prompts, public.favorites, public.user_settings, public.sync_receipts from anon;
grant select, insert, update, delete
  on table public.saved_prompts, public.favorites, public.user_settings, public.sync_receipts
  to authenticated;

create policy "public reads published techniques"
on public.techniques for select
to anon, authenticated
using ((published and deleted_at is null) or public.is_framecraft_owner());

create policy "owner inserts techniques"
on public.techniques for insert
to authenticated
with check (public.is_framecraft_owner());

create policy "owner updates techniques"
on public.techniques for update
to authenticated
using (public.is_framecraft_owner())
with check (public.is_framecraft_owner());

create policy "owner deletes techniques"
on public.techniques for delete
to authenticated
using (public.is_framecraft_owner());

create policy "public reads active media"
on public.media for select
to anon, authenticated
using (
  public.is_framecraft_owner()
  or (
    deleted_at is null
    and exists (
      select 1
      from public.techniques
      where techniques.id = media.technique_id
        and techniques.published
        and techniques.deleted_at is null
    )
  )
);

create policy "owner inserts media"
on public.media for insert
to authenticated
with check (public.is_framecraft_owner());

create policy "owner updates media"
on public.media for update
to authenticated
using (public.is_framecraft_owner())
with check (public.is_framecraft_owner());

create policy "owner deletes media"
on public.media for delete
to authenticated
using (public.is_framecraft_owner());

create policy "owner reads own saved prompts"
on public.saved_prompts for select
to authenticated
using (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner inserts own saved prompts"
on public.saved_prompts for insert
to authenticated
with check (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner updates own saved prompts"
on public.saved_prompts for update
to authenticated
using (user_id = (select auth.uid()) and public.is_framecraft_owner())
with check (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner deletes own saved prompts"
on public.saved_prompts for delete
to authenticated
using (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner reads own favorites"
on public.favorites for select
to authenticated
using (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner inserts own favorites"
on public.favorites for insert
to authenticated
with check (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner deletes own favorites"
on public.favorites for delete
to authenticated
using (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner reads own settings"
on public.user_settings for select
to authenticated
using (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner inserts own settings"
on public.user_settings for insert
to authenticated
with check (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner updates own settings"
on public.user_settings for update
to authenticated
using (user_id = (select auth.uid()) and public.is_framecraft_owner())
with check (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner reads own sync receipts"
on public.sync_receipts for select
to authenticated
using (user_id = (select auth.uid()) and public.is_framecraft_owner());

create policy "owner inserts own sync receipts"
on public.sync_receipts for insert
to authenticated
with check (user_id = (select auth.uid()) and public.is_framecraft_owner());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'technique-images',
  'technique-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads technique images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'technique-images');

create policy "owner uploads technique images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'technique-images'
  and public.is_framecraft_owner()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "owner updates technique images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'technique-images'
  and public.is_framecraft_owner()
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'technique-images'
  and public.is_framecraft_owner()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "owner deletes technique images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'technique-images'
  and public.is_framecraft_owner()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
