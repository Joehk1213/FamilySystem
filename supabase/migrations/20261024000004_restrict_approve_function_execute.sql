revoke all on function public.approve_schedule_change(uuid)
from public, anon, service_role;
grant execute on function public.approve_schedule_change(uuid)
to authenticated;

revoke all on function public.approve_schedule_change(uuid, boolean, text)
from public, anon, service_role;
grant execute on function public.approve_schedule_change(uuid, boolean, text)
to authenticated;
