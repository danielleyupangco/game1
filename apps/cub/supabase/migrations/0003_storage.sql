-- Private media storage.
--
-- Both buckets are private. Media is only ever reached through short-lived
-- signed URLs minted server-side; nothing here is publicly readable, which is
-- the point — these are photos of a family's pregnancy.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'memories',
    'memories',
    false,
    209715200, -- 200MB, the video cap
    array[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
      'video/mp4', 'video/quicktime', 'video/webm'
    ]
  ),
  (
    'thumbnails',
    'thumbnails',
    false,
    5242880, -- 5MB is ample for a poster frame
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do nothing;

/*
 * Objects are laid out as `<household_id>/<...>`, so the first path segment is
 * the tenant key and every policy below is the same household check used on the
 * data tables.
 */
create policy memories_read on storage.objects
  for select to authenticated
  using (
    bucket_id in ('memories', 'thumbnails')
    and (storage.foldername(name))[1] = public.current_household_id()::text
  );

create policy memories_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('memories', 'thumbnails')
    and (storage.foldername(name))[1] = public.current_household_id()::text
  );

create policy memories_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('memories', 'thumbnails')
    and (storage.foldername(name))[1] = public.current_household_id()::text
  );

create policy memories_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('memories', 'thumbnails')
    and (storage.foldername(name))[1] = public.current_household_id()::text
  );
