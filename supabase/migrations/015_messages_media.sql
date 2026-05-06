alter table messages
  add column if not exists media_id text,
  add column if not exists media_url text,
  add column if not exists filename text;
