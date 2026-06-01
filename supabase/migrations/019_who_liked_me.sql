-- Вкладка "Лайки тебя": кто лайкнул мои видео, но взаимности ещё нет.
-- RLS на likes показывает только свои исходящие лайки, поэтому входящие
-- достаём через security-definer RPC.

-- Список людей, лайкнувших мои видео, без уже существующего мэтча.
-- По одному (самому свежему) лайку на человека.
create or replace function public.who_liked_me()
returns table (liker_id uuid, video_id uuid, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select distinct on (l.liker_id) l.liker_id, l.video_id, l.created_at
  from public.likes l
  join public.videos v on v.id = l.video_id
  where v.user_id = auth.uid()
    and l.liker_id <> auth.uid()
    and not exists (
      select 1 from public.matches m
      where m.user_a = least(auth.uid(), l.liker_id)
        and m.user_b = greatest(auth.uid(), l.liker_id)
    )
  order by l.liker_id, l.created_at desc;
$$;

grant execute on function public.who_liked_me() to authenticated;

-- Лайкнуть в ответ: создаёт мэтч если этот человек уже лайкал моё видео.
-- Не требует video_id — работает даже если у лайкера нет своих видео.
create or replace function public.like_back(p_target_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_they_liked boolean;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if p_target_id = v_me then
    raise exception 'cannot match with self';
  end if;

  -- Проверяем что target лайкал хоть одно моё видео
  select exists (
    select 1
    from public.likes l
    join public.videos v on v.id = l.video_id
    where l.liker_id = p_target_id
      and v.user_id = v_me
  ) into v_they_liked;

  if not v_they_liked then
    return json_build_object('matched', false);
  end if;

  insert into public.matches (user_a, user_b)
  values (least(v_me, p_target_id), greatest(v_me, p_target_id))
  on conflict do nothing;

  return json_build_object('matched', true);
end;
$$;

grant execute on function public.like_back(uuid) to authenticated;
