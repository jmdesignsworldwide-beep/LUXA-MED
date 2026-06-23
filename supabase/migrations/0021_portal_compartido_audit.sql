-- =============================================================================
-- 0021  Auditoría: registro de que se compartió el portal con el paciente
-- =============================================================================
-- audit_log es inmutable (solo se escribe vía SECURITY DEFINER). Esta función
-- deja constancia de que el personal compartió el enlace del portal (quién,
-- cuándo y por qué medio). Idempotente.
-- =============================================================================

create or replace function public.registrar_portal_compartido(
  p_paciente_id uuid,
  p_via         text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role  text;
begin
  if not public.is_staff() then
    raise exception 'No autorizado';
  end if;

  begin
    v_role := public.current_user_role()::text;
  exception when others then
    v_role := null;
  end;

  insert into public.audit_log
    (table_name, action, row_id, actor_id, actor_role, new_data)
  values
    ('portal', 'COMPARTIDO', p_paciente_id, v_actor, v_role,
     jsonb_build_object('via', coalesce(p_via, 'desconocido'), 'at', now()));
end;
$$;

comment on function public.registrar_portal_compartido(uuid, text) is
  'Deja constancia en audit_log de que el personal compartió el portal del paciente.';

revoke all on function public.registrar_portal_compartido(uuid, text) from public, anon;
grant execute on function public.registrar_portal_compartido(uuid, text) to authenticated;
