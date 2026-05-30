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
