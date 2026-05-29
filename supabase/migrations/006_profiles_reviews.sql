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
