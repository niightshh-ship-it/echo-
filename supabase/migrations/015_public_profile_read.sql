-- Публичное чтение профилей, видео и отзывов.
-- Это нужно чтобы /u/[id] открывалась без логина (для SEO и шаринга),
-- и чтобы Googlebot/превью-боты видели контент.
-- На скрытых данных это никак не сказывается — у профиля нет приватных полей,
-- видео уже отдавались в публичный bucket, отзывы публичны по дизайну.

grant select on public.profiles to anon;
grant select on public.videos to anon;
grant select on public.reviews to anon;

drop policy if exists "profiles: public read" on public.profiles;
create policy "profiles: public read" on public.profiles
  for select to anon using (true);

drop policy if exists "videos: public read" on public.videos;
create policy "videos: public read" on public.videos
  for select to anon using (true);

drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read" on public.reviews
  for select to anon using (true);
