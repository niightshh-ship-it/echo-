-- Скрытие входящих лайков: убрать человека из «Лайкнули тебя»,
-- если не хочешь чтобы он там висел. Сам лайк не удаляется (если ты
-- передумаешь и лайкнешь его сам — мэтч всё равно создастся), просто
-- прячется из твоего списка.

create table if not exists public.dismissed_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  liker_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, liker_id)
);

grant select, insert, delete on public.dismissed_likes to authenticated;
alter table public.dismissed_likes enable row level security;

drop policy if exists "dismissed: manage own" on public.dismissed_likes;
create policy "dismissed: manage own" on public.dismissed_likes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Обновляем who_liked_me: исключаем скрытых
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
    and not exists (
      select 1 from public.dismissed_likes d
      where d.user_id = auth.uid() and d.liker_id = l.liker_id
    )
  order by l.liker_id, l.created_at desc;
$$;

grant execute on function public.who_liked_me() to authenticated;

-- RPC: скрыть лайк от конкретного человека
create or replace function public.dismiss_like(p_liker_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.dismissed_likes (user_id, liker_id)
  values (auth.uid(), p_liker_id)
  on conflict do nothing;
end;
$$;

grant execute on function public.dismiss_like(uuid) to authenticated;
