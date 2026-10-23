do $$
begin
  update storage.buckets
  set public = false,
      file_size_limit = 10485760
  where id = 'family-attachments';

  if not found then
    raise exception 'The family-attachments storage bucket does not exist.';
  end if;
end;
$$;
