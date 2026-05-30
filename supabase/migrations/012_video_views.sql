-- Счётчик просмотров видео.
-- Хранится прямо в videos.views_count и увеличивается через RPC.
-- Свои просмотры не считаются.

alter table public.videos
  add column if not exists views_count int not null default 0;

create or replace function public.increment_video_views(p_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    return;
  end if;
  select user_id into v_owner from public.videos where id = p_video_id;
  if v_owner is null or v_owner = v_caller then
    return;
  end if;
  update public.videos
  set views_count = coalesce(views_count, 0) + 1
  where id = p_video_id;
end;
$$;

grant execute on function public.increment_video_views(uuid) to authenticated;
