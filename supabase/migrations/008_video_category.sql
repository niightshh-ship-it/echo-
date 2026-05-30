-- Echo: категория у видео (предустановленная или свободный ввод)
alter table public.videos add column if not exists category text;
create index if not exists videos_category_idx on public.videos (category);
