-- Echo: сообщения в чате между мэтчами

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_user_a uuid not null,
  match_user_b uuid not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  -- Пара всегда отсортирована (как в matches)
  check (match_user_a < match_user_b),
  -- Отправитель должен быть одним из пары
  check (sender_id = match_user_a or sender_id = match_user_b),
  -- Мэтч должен существовать (каскад удалит сообщения если мэтч пропадёт)
  foreign key (match_user_a, match_user_b)
    references public.matches(user_a, user_b) on delete cascade
);

create index messages_pair_created_idx
  on public.messages (match_user_a, match_user_b, created_at desc);

create index messages_unread_idx
  on public.messages (match_user_a, match_user_b, sender_id)
  where read_at is null;

grant select, insert, update on public.messages to authenticated;
alter table public.messages enable row level security;

-- Читать можно только в своих мэтчах
create policy "users read their messages"
  on public.messages for select
  to authenticated
  using (auth.uid() = match_user_a or auth.uid() = match_user_b);

-- Отправлять можно только в своих мэтчах и только от своего имени
create policy "users send messages in their matches"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and (auth.uid() = match_user_a or auth.uid() = match_user_b)
  );

-- Помечать прочитанным можно только то что прислали ТЕБЕ
create policy "users mark received messages as read"
  on public.messages for update
  to authenticated
  using (
    sender_id != auth.uid()
    and (auth.uid() = match_user_a or auth.uid() = match_user_b)
  )
  with check (
    sender_id != auth.uid()
    and (auth.uid() = match_user_a or auth.uid() = match_user_b)
  );

-- Включаем Realtime — клиенты получают INSERT'ы мгновенно
alter publication supabase_realtime add table public.messages;
