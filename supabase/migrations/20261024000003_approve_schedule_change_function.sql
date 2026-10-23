create or replace function public.approve_schedule_change(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.approve_schedule_change(p_request_id, true, null::text);
end;
$$;

revoke all on function public.approve_schedule_change(uuid) from public;
grant execute on function public.approve_schedule_change(uuid) to authenticated;
