alter table public.progress_photos
  drop constraint if exists progress_photos_photo_type_check;

alter table public.progress_photos
  add constraint progress_photos_photo_type_check
  check (photo_type in ('front', 'side', 'rear'));
