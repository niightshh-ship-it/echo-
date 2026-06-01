-- Уведомление о лайке навыка (даже если мэтча ещё нет).
-- Добавляем тип 'like' и триггер на likes.

-- ADD VALUE нельзя выполнять в одной транзакции с использованием значения,
-- поэтому отдельным шагом. IF NOT EXISTS защищает от повторного запуска.
alter type public.notification_type add value if not exists 'like';

-- Триггер: кто-то лайкнул моё видео.
-- НЕ создаём like-уведомление если лайк взаимный (тогда сработает матч —
-- и будет отдельное match-уведомление, дубль не нужен).
create or replace function public.notif_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_reciprocal boolean;
begin
  select user_id into v_owner from public.videos where id = NEW.video_id;
  if v_owner is null or v_owner = NEW.liker_id then
    return NEW;
  end if;

  -- Владелец видео уже лайкал видео лайкера? → будет мэтч, like-нотиф не нужен
  select exists (
    select 1
    from public.likes l
    join public.videos v on v.id = l.video_id
    where l.liker_id = v_owner
      and v.user_id = NEW.liker_id
  ) into v_reciprocal;

  if v_reciprocal then
    return NEW;
  end if;

  insert into public.notifications(user_id, actor_id, type, payload)
  values (v_owner, NEW.liker_id, 'like', '{}'::jsonb);
  return NEW;
end;
$$;

drop trigger if exists notif_on_like_trg on public.likes;
create trigger notif_on_like_trg
  after insert on public.likes
  for each row execute function public.notif_on_like();
