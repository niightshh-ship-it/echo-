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
