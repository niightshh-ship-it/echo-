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
