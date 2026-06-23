-- =============================================================================
-- 0018  Auditoría del cambio de contraseña (sin guardar la contraseña)
-- =============================================================================
-- El audit_log es inmutable: solo se escribe vía funciones SECURITY DEFINER
-- (ver 0004/0005). El cambio de clave ocurre en Supabase Auth (auth.users), que
-- no tiene nuestro trigger de auditoría. Esta función deja constancia de QUE se
-- cambió la clave (quién y cuándo) — NUNCA la contraseña en sí.
-- Idempotente.
-- =============================================================================

create or replace function public.registrar_cambio_password()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role  text;
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  begin
    v_role := public.current_user_role()::text;
  exception when others then
    v_role := null;
  end;

  insert into public.audit_log
    (table_name, action, row_id, actor_id, actor_role, old_data, new_data)
  values
    ('auth.users', 'PASSWORD_CHANGE', v_actor, v_actor, v_role, null,
     jsonb_build_object('evento', 'cambio_de_contraseña', 'at', now()));
end;
$$;

comment on function public.registrar_cambio_password() is
  'Deja constancia en audit_log de que el usuario actual cambió su contraseña. Nunca almacena la contraseña.';

grant execute on function public.registrar_cambio_password() to authenticated;
