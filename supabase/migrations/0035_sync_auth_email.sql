-- 0035_sync_auth_email.sql
-- Keep profiles.email in step with auth.users.email. An email change from
-- Account & settings only completes once the user clicks the confirmation link
-- (secure email change), so the sync has to happen DB-side when auth.users
-- actually updates — the client can't do it at that moment.
create or replace function public.handle_email_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_email_changed on auth.users;
create trigger on_auth_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_email_change();
