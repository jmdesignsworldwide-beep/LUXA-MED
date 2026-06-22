-- =============================================================================
-- 0011  Solo admin puede activar/desactivar pacientes (a nivel base de datos)
-- =============================================================================
-- Recepción y enfermera pueden VER y EDITAR datos demográficos (RLS pac_update),
-- pero el cambio de estado (activo) queda reservado a admin. RLS no puede
-- comparar el valor viejo vs nuevo, así que lo enforce un trigger BEFORE UPDATE.
-- Idempotente.
-- =============================================================================

create or replace function public.fn_pacientes_estado_solo_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.activo is distinct from old.activo) and not public.is_admin() then
    raise exception 'Solo un administrador puede activar o desactivar pacientes'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pacientes_estado_solo_admin on public.pacientes;
create trigger trg_pacientes_estado_solo_admin
  before update on public.pacientes
  for each row execute function public.fn_pacientes_estado_solo_admin();
