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
