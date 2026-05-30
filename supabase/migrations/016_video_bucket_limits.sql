-- Явно фиксируем лимит видео-бакета.
-- На Supabase free-tier потолок per-request = 50 MB. Ставим ровно его и
-- разрешаем только распространённые видео-mime, чтоб не было сюрпризов.

update storage.buckets
set
  file_size_limit = 52428800, -- 50 * 1024 * 1024
  allowed_mime_types = array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ]
where id = 'videos';
