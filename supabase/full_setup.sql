-- ========================================================
-- Echo — полная схема базы (все миграции 001-021 по порядку)
-- Вставь это целиком в Supabase SQL Editor нового проекта и нажми Run.
-- ========================================================


-- ============ 001_profiles.sql ============
-- Echo: profiles table
-- Каждая запись связана с пользователем из auth.users (создаётся при регистрации)

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  city text not null,
  skills text[] not null default '{}' check (array_length(skills, 1) is null or array_length(skills, 1) <= 3),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Выдаём базовые права роли authenticated (RLS дальше ограничит ЧТО именно можно)
grant select, insert, update on public.profiles to authenticated;

-- Включаем Row Level Security (без RLS любой может читать/писать всё)
alter table public.profiles enable row level security;

-- Любой залогиненный может смотреть профили (нужно для фида и мэтчинга)
create policy "profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Юзер может создать свой профиль при онбординге
create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Юзер может редактировать только свой профиль
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Авто-обновление updated_at при каждом изменении
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();


-- ============ 002_videos.sql ============
-- Echo: видео-таблица + storage bucket

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

grant select, insert, delete on public.videos to authenticated;

alter table public.videos enable row level security;

create policy "videos are viewable by authenticated users"
  on public.videos for select
  to authenticated
  using (true);

create policy "users can insert their own videos"
  on public.videos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete their own videos"
  on public.videos for delete
  to authenticated
  using (auth.uid() = user_id);

-- Storage bucket для видео. public=true чтобы фид мог проигрывать без подписи URL.
-- Загрузки/удаления всё равно контролируются policy ниже.
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- Юзер может загружать только в свою папку: videos/<user_id>/...
create policy "users can upload videos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Юзер может удалять только свои файлы
create policy "users can delete their own video files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============ 003_likes_matches.sql ============
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


-- ============ 004_messages.sql ============
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


-- ============ 005_verification.sql ============
-- Echo: селфи-верификация с ручной модерацией

-- ============= ADMIN FLAG =============
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ============= VERIFICATIONS =============
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create index verifications_pending_idx
  on public.verifications (submitted_at)
  where status = 'pending';

create index verifications_user_idx
  on public.verifications (user_id, submitted_at desc);

grant select, insert, update on public.verifications to authenticated;
alter table public.verifications enable row level security;

-- Юзер видит свои заявки
create policy "users see their own verifications"
  on public.verifications for select
  to authenticated
  using (user_id = auth.uid());

-- Юзер подаёт заявку только на себя
create policy "users submit their own verifications"
  on public.verifications for insert
  to authenticated
  with check (user_id = auth.uid());

-- Админ видит все
create policy "admins see all verifications"
  on public.verifications for select
  to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin
  ));

-- Только админ может менять статус
create policy "admins update verifications"
  on public.verifications for update
  to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin
  ));

-- ============= TRIGGERS =============
-- 1. При смене статуса заполняем reviewed_at/by автоматом
create or replace function public.handle_verification_review_meta()
returns trigger
language plpgsql
as $$
begin
  if (OLD.status is distinct from NEW.status)
     and NEW.status in ('approved', 'rejected') then
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  end if;
  return NEW;
end;
$$;

create trigger verifications_review_meta
  before update on public.verifications
  for each row execute function public.handle_verification_review_meta();

-- 2. После approved — флипаем profiles.verified
create or replace function public.handle_verification_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status = 'approved' and (OLD.status is distinct from 'approved') then
    update public.profiles
      set verified = true
      where id = NEW.user_id;
  end if;
  return NEW;
end;
$$;

create trigger verifications_approval
  after update on public.verifications
  for each row execute function public.handle_verification_approval();

-- ============= STORAGE BUCKET =============
-- Приватный — видео только для владельца и админов
insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

create policy "users upload verification to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users read their own verification files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admins read all verification files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verifications'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin
    )
  );


-- ============ 006_profiles_reviews.sql ============
-- Echo: обогащение профиля + отзывы (Волна 2)

-- ============= PROFILE FIELDS =============
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists languages text[] not null default '{}';
alter table public.profiles add column if not exists wants text[] not null default '{}'
  check (array_length(wants, 1) is null or array_length(wants, 1) <= 3);
alter table public.profiles add column if not exists availability text;

-- ============= REVIEWS =============
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  check (reviewer_id <> reviewee_id),
  unique (reviewer_id, reviewee_id)
);

create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);

grant select, insert, update, delete on public.reviews to authenticated;
alter table public.reviews enable row level security;

-- Отзывы видны всем залогиненным (показываются на профилях)
create policy "reviews readable by authenticated"
  on public.reviews for select
  to authenticated
  using (true);

-- Оставить отзыв можно только тому, с кем есть мэтч, и только от своего имени
create policy "users can review their matches"
  on public.reviews for insert
  to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.user_a = least(auth.uid(), reviewee_id)
        and m.user_b = greatest(auth.uid(), reviewee_id)
    )
  );

-- Редактировать/удалять можно только свой отзыв
create policy "users update own review"
  on public.reviews for update
  to authenticated
  using (reviewer_id = auth.uid());

create policy "users delete own review"
  on public.reviews for delete
  to authenticated
  using (reviewer_id = auth.uid());

-- ============= AVATARS BUCKET =============
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "users upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============ 007_blocks_reports.sql ============
-- Echo: блокировки и жалобы (безопасность)

-- ============= BLOCKS =============
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

grant select, insert, delete on public.blocks to authenticated;
alter table public.blocks enable row level security;

-- Вижу блокировки, где я с любой стороны (чтобы фильтровать в обе стороны)
create policy "see own block relations"
  on public.blocks for select to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

create policy "create own blocks"
  on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());

create policy "delete own blocks"
  on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- ============= REPORTS =============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

grant select, insert on public.reports to authenticated;
alter table public.reports enable row level security;

create policy "create own reports"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

create policy "see own reports"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid());


-- ============ 008_video_category.sql ============
-- Echo: категория у видео (предустановленная или свободный ввод)
alter table public.videos add column if not exists category text;
create index if not exists videos_category_idx on public.videos (category);


-- ============ 009_random_videos.sql ============
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


-- ============ 010_video_description.sql ============
-- Echo: текстовое описание к видео (опционально)
alter table public.videos add column if not exists description text
  check (description is null or length(description) <= 500);


-- ============ 011_video_comments.sql ============
-- Echo: комментарии к видео (для случайных)
create table public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 500),
  created_at timestamptz not null default now()
);

create index video_comments_video_idx on public.video_comments(video_id, created_at desc);

grant select, insert, delete on public.video_comments to authenticated;
alter table public.video_comments enable row level security;

create policy "comments readable by authenticated"
  on public.video_comments for select to authenticated using (true);

create policy "users can comment"
  on public.video_comments for insert to authenticated
  with check (user_id = auth.uid());

create policy "users delete own comments"
  on public.video_comments for delete to authenticated
  using (user_id = auth.uid());


-- ============ 012_video_views.sql ============
-- Счётчик просмотров видео.
-- Хранится прямо в videos.views_count и увеличивается через RPC.
-- Свои просмотры не считаются.

alter table public.videos
  add column if not exists views_count int not null default 0;

create or replace function public.increment_video_views(p_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    return;
  end if;
  select user_id into v_owner from public.videos where id = p_video_id;
  if v_owner is null or v_owner = v_caller then
    return;
  end if;
  update public.videos
  set views_count = coalesce(views_count, 0) + 1
  where id = p_video_id;
end;
$$;

grant execute on function public.increment_video_views(uuid) to authenticated;


-- ============ 013_notifications.sql ============
-- Уведомления: матч и новое сообщение.
-- Триггеры на matches/messages сами создают записи —
-- юзеры через приложение ничего не INSERTят, только читают/обновляют (read_at) и удаляют свои.

do $$ begin
  -- 'like' включён сразу (в исходных миграциях добавлялся позже через
  -- ALTER TYPE; в едином файле так надёжнее — без конфликта транзакции).
  create type public.notification_type as enum ('match', 'message', 'like');
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


-- ============ 014_email_notifications.sql ============
-- Email-уведомления: опция в профиле + лог для троттлинга.
-- Письма шлёт серверный API после успешного действия (а не Postgres напрямую),
-- так что миграция тут лёгкая.

alter table public.profiles
  add column if not exists email_notifications boolean not null default true,
  add column if not exists locale text;

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  sent_at timestamptz not null default now()
);

create index if not exists email_log_recipient_actor_type_idx
  on public.email_log(recipient_id, actor_id, type, sent_at desc);

grant select, insert on public.email_log to authenticated;
alter table public.email_log enable row level security;

-- Юзеры могут видеть только свой лог (на всякий случай — UI это не использует)
drop policy if exists "email_log: read own" on public.email_log;
create policy "email_log: read own" on public.email_log
  for select to authenticated using (recipient_id = auth.uid());


-- ============ 015_public_profile_read.sql ============
-- Публичное чтение профилей, видео и отзывов.
-- Это нужно чтобы /u/[id] открывалась без логина (для SEO и шаринга),
-- и чтобы Googlebot/превью-боты видели контент.
-- На скрытых данных это никак не сказывается — у профиля нет приватных полей,
-- видео уже отдавались в публичный bucket, отзывы публичны по дизайну.

grant select on public.profiles to anon;
grant select on public.videos to anon;
grant select on public.reviews to anon;

drop policy if exists "profiles: public read" on public.profiles;
create policy "profiles: public read" on public.profiles
  for select to anon using (true);

drop policy if exists "videos: public read" on public.videos;
create policy "videos: public read" on public.videos
  for select to anon using (true);

drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read" on public.reviews
  for select to anon using (true);


-- ============ 016_video_bucket_limits.sql ============
-- Явно фиксируем лимит видео-бакета.
-- На Supabase free-tier потолок per-request = 50 MB. Ставим ровно его и
-- разрешаем только распространённые видео-mime, чтоб не было сюрпризов.

update storage.buckets
set
  file_size_limit = 52428800, -- 50 * 1024 * 1024
  allowed_mime_types = array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ]
where id = 'videos';


-- ============ 017_rate_limits.sql ============
-- Rate limiting для /api/auth/send-code
-- Храним попытки отправки кода по email.
-- Логика: не более 3 попыток на email за скользящее окно в 10 минут.

create table public.rate_limits (
  id          uuid primary key default gen_random_uuid(),
  key         text not null,          -- например 'send-code:user@example.com'
  created_at  timestamptz not null default now()
);

-- Индекс для быстрого COUNT за окно
create index rate_limits_key_created_idx on public.rate_limits (key, created_at desc);

-- Включаем RLS — API использует service_role и обходит её, но лучше закрыть для anon/authenticated
alter table public.rate_limits enable row level security;
-- Никаких публичных политик — таблица доступна только через service_role на сервере

-- Автоматическая очистка старых записей (старше 1 часа) чтобы таблица не росла бесконечно
create or replace function public.cleanup_rate_limits()
returns void
language sql
security definer
as $$
  delete from public.rate_limits where created_at < now() - interval '1 hour';
$$;


-- ============ 018_service_role_grants.sql ============
-- Service-role нужен для серверных API-роутов (notify/match, notify/message,
-- notify/review, OG-картинки, sitemap и т.д.). В этом Supabase-проекте
-- service_role без явных GRANTов получает "permission denied for table ...",
-- из-за чего серверные функции тихо ломаются.
--
-- Эта миграция даёт service_role полный доступ ко всему в схеме public
-- и устанавливает дефолтные привилегии для будущих таблиц,
-- чтобы такое больше не повторялось.

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Дефолтные привилегии — действуют для таблиц/функций созданных ПОСЛЕ этой миграции
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;


-- ============ 019_who_liked_me.sql ============
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


-- ============ 020_like_notifications.sql ============
-- Уведомление о лайке навыка (даже если мэтча ещё нет).
-- Добавляем тип 'like' и триггер на likes.

-- (в едином файле 'like' уже добавлен при создании enum выше — эта строка
-- оставлена как no-op для совместимости со старыми проектами)
-- alter type public.notification_type add value if not exists 'like';

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


-- ============ 021_dismissed_likes.sql ============
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

