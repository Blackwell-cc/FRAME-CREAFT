-- Idempotent, owner-only, version-checked writes for FRAME / CRAFT.
begin;

create or replace function public.apply_framecraft_operation(
  p_operation_id uuid,
  p_entity text,
  p_entity_id text,
  p_action text,
  p_base_version integer,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_current_version integer;
  v_applied_version integer;
  v_cloud_payload jsonb;
begin
  if not public.is_framecraft_owner() then
    raise exception 'FRAMECRAFT_OWNER_REQUIRED' using errcode = '42501';
  end if;

  if p_action not in ('upsert', 'delete') then
    raise exception 'FRAMECRAFT_INVALID_ACTION' using errcode = '22023';
  end if;

  select applied_version
  into v_applied_version
  from public.sync_receipts
  where operation_id = p_operation_id
    and user_id = v_user_id;

  if found then
    return jsonb_build_object('status', 'applied', 'version', v_applied_version);
  end if;

  case p_entity
    when 'technique' then
      select t.version, to_jsonb(t)
      into v_current_version, v_cloud_payload
      from public.techniques t
      where t.id = p_entity_id
      for update;

      if found and p_base_version is distinct from v_current_version then
        return jsonb_build_object(
          'status', 'conflict',
          'cloudVersion', v_current_version,
          'cloudPayload', v_cloud_payload
        );
      end if;
      if not found and p_base_version is not null then
        return jsonb_build_object('status', 'conflict', 'cloudVersion', 0, 'cloudPayload', null);
      end if;

      if p_action = 'delete' then
        if not found then
          return jsonb_build_object('status', 'conflict', 'cloudVersion', 0, 'cloudPayload', null);
        end if;
        update public.techniques
        set deleted_at = now(), published = false, version = version + 1
        where id = p_entity_id
        returning version into v_applied_version;
      elsif found then
        update public.techniques
        set slug = p_payload->>'slug',
            schema_version = (p_payload->>'schema_version')::smallint,
            source_type = p_payload->>'source_type',
            category = p_payload->>'category',
            title_en = p_payload->>'title_en',
            title_th = p_payload->>'title_th',
            abbreviation = p_payload->>'abbreviation',
            description_en = p_payload->>'description_en',
            description_th = p_payload->>'description_th',
            use_cases_th = p_payload->>'use_cases_th',
            effect_th = p_payload->>'effect_th',
            warnings_th = p_payload->>'warnings_th',
            tags = array(select jsonb_array_elements_text(coalesce(p_payload->'tags', '[]'::jsonb))),
            moods = array(select jsonb_array_elements_text(coalesce(p_payload->'moods', '[]'::jsonb))),
            recommended_lenses = array(select jsonb_array_elements_text(coalesce(p_payload->'recommended_lenses', '[]'::jsonb))),
            camera_settings = array(select jsonb_array_elements_text(coalesce(p_payload->'camera_settings', '[]'::jsonb))),
            image_keywords = array(select jsonb_array_elements_text(coalesce(p_payload->'image_keywords', '[]'::jsonb))),
            video_keywords = array(select jsonb_array_elements_text(coalesce(p_payload->'video_keywords', '[]'::jsonb))),
            generic_image_prompt = p_payload->>'generic_image_prompt',
            generic_video_prompt = p_payload->>'generic_video_prompt',
            video_reference_url = p_payload->>'video_reference_url',
            is_hidden = coalesce((p_payload->>'is_hidden')::boolean, false),
            published = coalesce((p_payload->>'published')::boolean, true),
            deleted_at = null,
            version = version + 1
        where id = p_entity_id
        returning version into v_applied_version;
      else
        insert into public.techniques (
          id, slug, schema_version, source_type, category, title_en, title_th,
          abbreviation, description_en, description_th, use_cases_th, effect_th,
          warnings_th, tags, moods, recommended_lenses, camera_settings,
          image_keywords, video_keywords, generic_image_prompt,
          generic_video_prompt, video_reference_url, is_hidden, published,
          version, created_at, updated_at, deleted_at
        ) values (
          p_entity_id, p_payload->>'slug', (p_payload->>'schema_version')::smallint,
          p_payload->>'source_type', p_payload->>'category', p_payload->>'title_en',
          p_payload->>'title_th', p_payload->>'abbreviation',
          p_payload->>'description_en', p_payload->>'description_th',
          p_payload->>'use_cases_th', p_payload->>'effect_th', p_payload->>'warnings_th',
          array(select jsonb_array_elements_text(coalesce(p_payload->'tags', '[]'::jsonb))),
          array(select jsonb_array_elements_text(coalesce(p_payload->'moods', '[]'::jsonb))),
          array(select jsonb_array_elements_text(coalesce(p_payload->'recommended_lenses', '[]'::jsonb))),
          array(select jsonb_array_elements_text(coalesce(p_payload->'camera_settings', '[]'::jsonb))),
          array(select jsonb_array_elements_text(coalesce(p_payload->'image_keywords', '[]'::jsonb))),
          array(select jsonb_array_elements_text(coalesce(p_payload->'video_keywords', '[]'::jsonb))),
          p_payload->>'generic_image_prompt', p_payload->>'generic_video_prompt',
          p_payload->>'video_reference_url',
          coalesce((p_payload->>'is_hidden')::boolean, false),
          coalesce((p_payload->>'published')::boolean, true), 1,
          coalesce((p_payload->>'created_at')::timestamptz, now()), now(), null
        ) returning version into v_applied_version;
      end if;

    when 'media' then
      select m.version, to_jsonb(m)
      into v_current_version, v_cloud_payload
      from public.media m where m.id = p_entity_id for update;

      if found and p_base_version is distinct from v_current_version then
        return jsonb_build_object('status', 'conflict', 'cloudVersion', v_current_version, 'cloudPayload', v_cloud_payload);
      end if;
      if not found and p_base_version is not null then
        return jsonb_build_object('status', 'conflict', 'cloudVersion', 0, 'cloudPayload', null);
      end if;

      if p_action = 'delete' then
        if not found then return jsonb_build_object('status', 'conflict', 'cloudVersion', 0, 'cloudPayload', null); end if;
        update public.media set deleted_at = now(), version = version + 1
        where id = p_entity_id returning version into v_applied_version;
      elsif found then
        update public.media
        set technique_id = p_payload->>'technique_id',
            storage_path = p_payload->>'storage_path',
            mime_type = p_payload->>'mime_type',
            width = (p_payload->>'width')::integer,
            height = (p_payload->>'height')::integer,
            byte_size = (p_payload->>'byte_size')::bigint,
            alt_th = coalesce(p_payload->>'alt_th', ''),
            alt_en = coalesce(p_payload->>'alt_en', ''),
            deleted_at = null,
            version = version + 1
        where id = p_entity_id returning version into v_applied_version;
      else
        insert into public.media (
          id, technique_id, storage_path, mime_type, width, height, byte_size,
          alt_th, alt_en, version, created_at, updated_at, deleted_at
        ) values (
          p_entity_id, p_payload->>'technique_id', p_payload->>'storage_path',
          p_payload->>'mime_type', (p_payload->>'width')::integer,
          (p_payload->>'height')::integer, (p_payload->>'byte_size')::bigint,
          coalesce(p_payload->>'alt_th', ''), coalesce(p_payload->>'alt_en', ''),
          1, coalesce((p_payload->>'created_at')::timestamptz, now()), now(), null
        ) returning version into v_applied_version;
      end if;

    when 'prompt' then
      select s.version, to_jsonb(s)
      into v_current_version, v_cloud_payload
      from public.saved_prompts s
      where s.id = p_entity_id and s.user_id = v_user_id
      for update;

      if found and p_base_version is distinct from v_current_version then
        return jsonb_build_object('status', 'conflict', 'cloudVersion', v_current_version, 'cloudPayload', v_cloud_payload);
      end if;
      if not found and p_base_version is not null then
        return jsonb_build_object('status', 'conflict', 'cloudVersion', 0, 'cloudPayload', null);
      end if;

      if p_action = 'delete' then
        if not found then return jsonb_build_object('status', 'conflict', 'cloudVersion', 0, 'cloudPayload', null); end if;
        update public.saved_prompts set deleted_at = now(), version = version + 1
        where id = p_entity_id and user_id = v_user_id
        returning version into v_applied_version;
      elsif found then
        update public.saved_prompts
        set name = p_payload->>'name', mode = p_payload->>'mode',
            platform = p_payload->>'platform', input = coalesce(p_payload->'input', '{}'::jsonb),
            generated_prompt = p_payload->>'generated_prompt',
            edited_prompt = p_payload->>'edited_prompt', deleted_at = null,
            version = version + 1
        where id = p_entity_id and user_id = v_user_id
        returning version into v_applied_version;
      else
        insert into public.saved_prompts (
          id, user_id, name, mode, platform, input, generated_prompt,
          edited_prompt, version, created_at, updated_at, deleted_at
        ) values (
          p_entity_id, v_user_id, p_payload->>'name', p_payload->>'mode',
          p_payload->>'platform', coalesce(p_payload->'input', '{}'::jsonb),
          p_payload->>'generated_prompt', p_payload->>'edited_prompt', 1,
          coalesce((p_payload->>'created_at')::timestamptz, now()), now(), null
        ) returning version into v_applied_version;
      end if;

    when 'settings' then
      select u.version, to_jsonb(u)
      into v_current_version, v_cloud_payload
      from public.user_settings u where u.user_id = v_user_id for update;

      if found and p_base_version is distinct from v_current_version then
        return jsonb_build_object('status', 'conflict', 'cloudVersion', v_current_version, 'cloudPayload', v_cloud_payload);
      end if;
      if not found and p_base_version is not null then
        return jsonb_build_object('status', 'conflict', 'cloudVersion', 0, 'cloudPayload', null);
      end if;
      if p_action = 'delete' then
        raise exception 'FRAMECRAFT_SETTINGS_DELETE_NOT_ALLOWED' using errcode = '22023';
      elsif found then
        update public.user_settings
        set language = p_payload->>'language',
            default_mode = p_payload->>'default_mode',
            default_platform = p_payload->>'default_platform',
            version = version + 1
        where user_id = v_user_id returning version into v_applied_version;
      else
        insert into public.user_settings (
          user_id, language, default_mode, default_platform, version, updated_at
        ) values (
          v_user_id, p_payload->>'language', p_payload->>'default_mode',
          p_payload->>'default_platform', 1, now()
        ) returning version into v_applied_version;
      end if;

    when 'favorite' then
      if p_action = 'delete' then
        delete from public.favorites
        where user_id = v_user_id
          and entity_type = p_payload->>'entity_type'
          and entity_id = p_entity_id;
      else
        insert into public.favorites (user_id, entity_type, entity_id)
        values (v_user_id, p_payload->>'entity_type', p_entity_id)
        on conflict (user_id, entity_type, entity_id) do nothing;
      end if;
      v_applied_version := 1;

    else
      raise exception 'FRAMECRAFT_INVALID_ENTITY' using errcode = '22023';
  end case;

  insert into public.sync_receipts (
    operation_id, user_id, entity_type, entity_id, action, applied_version
  ) values (
    p_operation_id, v_user_id, p_entity, p_entity_id, p_action, v_applied_version
  );

  return jsonb_build_object('status', 'applied', 'version', v_applied_version);
end;
$$;

revoke all on function public.apply_framecraft_operation(uuid, text, text, text, integer, jsonb) from public;
revoke all on function public.apply_framecraft_operation(uuid, text, text, text, integer, jsonb) from anon;
grant execute on function public.apply_framecraft_operation(uuid, text, text, text, integer, jsonb) to authenticated;

commit;
