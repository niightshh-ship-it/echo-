-- Echo: текстовое описание к видео (опционально)
alter table public.videos add column if not exists description text
  check (description is null or length(description) <= 500);
