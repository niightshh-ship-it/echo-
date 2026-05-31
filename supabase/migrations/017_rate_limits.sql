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
