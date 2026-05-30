-- Уведомления: матч и новое сообщение.
-- Триггеры на matches/messages сами создают записи —
-- юзеры через приложение ничего не INSERTят, только читают/обновляют (read_at) и удаляют свои.

do $$ begin
  create type public.notification_type as enum ('match', 'message');
exception when duplicate_object then null;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

grant select, update, delete on public.notifications to authenticated;

alter table public.notifications enable row level security;

drop policy if exists "notif: select own" on public.notifications;
create policy "notif: select own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notif: update own" on public.notifications;
create policy "notif: update own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notif: delete own" on public.notifications;
create policy "notif: delete own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- ===== Триггер: новое сообщение =====
create or replace function public.notif_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  v_recipient := case
    when NEW.sender_id = NEW.match_user_a then NEW.match_user_b
    else NEW.match_user_a
  end;
  insert into public.notifications(user_id, actor_id, type, payload)
  values (
    v_recipient,
    NEW.sender_id,
    'message',
    jsonb_build_object('preview', left(NEW.body, 120))
  );
  return NEW;
end;
$$;

drop trigger if exists notif_on_message_trg on public.messages;
create trigger notif_on_message_trg
  after insert on public.messages
  for each row execute function public.notif_on_message();

-- ===== Триггер: новый матч =====
create or replace function public.notif_on_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(user_id, actor_id, type, payload)
  values
    (NEW.user_a, NEW.user_b, 'match', '{}'::jsonb),
    (NEW.user_b, NEW.user_a, 'match', '{}'::jsonb);
  return NEW;
end;
$$;

drop trigger if exists notif_on_match_trg on public.matches;
create trigger notif_on_match_trg
  after insert on public.matches
  for each row execute function public.notif_on_match();

-- Realtime: пробрасываем INSERT и UPDATE через publication
do $$ begin
  perform 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications';
  if not found then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
