-- Echo: лайки и мэтчи

-- ============= LIKES =============
create table public.likes (
  liker_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker_id, video_id)
);

grant select on public.likes to authenticated;
alter table public.likes enable row level security;

-- Юзер видит только свои лайки (чтобы фид помнил что он лайкнул)
create policy "users see their own likes"
  on public.likes for select
  to authenticated
  using (liker_id = auth.uid());

-- ============= MATCHES =============
-- Пара юзеров. user_a < user_b чтобы не было дублей (A↔B и B↔A).
create table public.matches (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

grant select on public.matches to authenticated;
alter table public.matches enable row level security;

create policy "users see matches they are part of"
  on public.matches for select
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

-- ============= LIKE FUNCTION =============
-- Атомарно: пишет лайк, проверяет реципрокность, создаёт мэтч если есть.
-- security definer = функция выполняется с правами owner, обходя RLS внутри.
create or replace function public.like_video(p_video_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liker uuid := auth.uid();
  v_target uuid;
  v_match_exists boolean;
begin
  if v_liker is null then
    raise exception 'not authenticated';
  end if;

  select user_id into v_target from public.videos where id = p_video_id;
  if v_target is null then
    raise exception 'video not found';
  end if;
  if v_target = v_liker then
    raise exception 'cannot like own video';
  end if;

  insert into public.likes (liker_id, video_id)
  values (v_liker, p_video_id)
  on conflict do nothing;

  -- Есть ли встречный лайк? (target лайкал любое наше видео)
  select exists (
    select 1
    from public.likes l
    join public.videos v on v.id = l.video_id
    where l.liker_id = v_target
      and v.user_id = v_liker
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

grant execute on function public.like_video(uuid) to authenticated;

-- ============= UNLIKE =============
create or replace function public.unlike_video(p_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from public.likes
    where liker_id = auth.uid() and video_id = p_video_id;
end;
$$;

grant execute on function public.unlike_video(uuid) to authenticated;
