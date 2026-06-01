-- Service-role нужен для серверных API-роутов (notify/match, notify/message,
-- notify/review, OG-картинки, sitemap и т.д.). В этом Supabase-проекте
-- service_role без явных GRANTов получает "permission denied for table ...",
-- из-за чего серверные функции тихо ломаются.
--
-- Эта миграция даёт service_role полный доступ ко всему в схеме public
-- и устанавливает дефолтные привилегии для будущих таблиц,
-- чтобы такое больше не повторялось.

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Дефолтные привилегии — действуют для таблиц/функций созданных ПОСЛЕ этой миграции
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;
