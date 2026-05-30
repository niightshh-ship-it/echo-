-- Echo: разделяем видео на "навык" (идёт в фид → мэтчинг) и "случайное" (только на профиле)

alter table public.videos
  add column if not exists is_random boolean not null default false;

-- Случайные видео не привязаны к навыку
alter table public.videos
  alter column skill drop not null;

create index if not exists videos_is_random_idx on public.videos(is_random);

-- Обновляем like_video: для случайных видео мэтч-логика не запускается,
-- просто фиксируем лайк (под комменты/лайки на профиле).
create or replace function public.like_video(p_video_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liker uuid := auth.uid();
  v_target uuid;
  v_is_random boolean;
  v_match_exists boolean;
begin
  if v_liker is null then
    raise exception 'not authenticated';
  end if;

  select user_id, coalesce(is_random, false)
    into v_target, v_is_random
    from public.videos where id = p_video_id;

  if v_target is null then
    raise exception 'video not found';
  end if;
  if v_target = v_liker then
    raise exception 'cannot like own video';
  end if;

  insert into public.likes (liker_id, video_id)
  values (v_liker, p_video_id)
  on conflict do nothing;

  -- Случайные видео: только фиксируем лайк, без мэтча
  if v_is_random then
    return json_build_object('matched', false);
  end if;

  -- Видео-навык: ищем встречный лайк (тоже только среди навыков)
  select exists (
    select 1
    from public.likes l
    join public.videos v on v.id = l.video_id
    where l.liker_id = v_target
      and v.user_id = v_liker
      and coalesce(v.is_random, false) = false
  ) into v_match_exists;

  if v_match_exists then
    insert into public.matches (user_a, user_b)
    values (least(v_liker, v_target), greatest(v_liker, v_target))
    on conflict do nothing;
    return json_build_object('matched', true);
  end if;

  return json_build_object('matched', false);
end;
$$;
