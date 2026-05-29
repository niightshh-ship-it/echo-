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
