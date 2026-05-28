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
