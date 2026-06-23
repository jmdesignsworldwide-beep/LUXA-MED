-- =============================================================================
-- 0023  Empleados — base para nóminas y panel financiero (datos sensibles)
-- =============================================================================
-- Separación de permisos CRÍTICA. RLS es por FILA, no por columna, y todos los
-- roles comparten el rol de BD 'authenticated'. Por eso la garantía a nivel de
-- base de datos se logra con DOS tablas:
--   * public.empleados          -> datos PÚBLICOS (los ve todo el personal)
--   * public.empleados_privado  -> datos PRIVADOS (SOLO admin: salario, cédula,
--                                   banco, dirección, contacto, documentos)
-- Así enfermera/recepción no pueden leer lo privado aunque consulten directo:
-- la RLS de empleados_privado devuelve 0 filas para quien no es admin.
--
-- La tabla public.empleados ya existe (0003) y estaba SOLO-admin. Aquí:
--   - se agregan campos públicos (puesto, email, activo)
--   - se mueven los privados a empleados_privado
--   - se reabre el SELECT público a todo el personal (is_staff)
-- Idempotente. RLS + FORCE RLS + auditoría.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'empleado_puesto') then
    create type public.empleado_puesto as enum
      ('medico', 'enfermera', 'recepcion', 'tecnico', 'otro');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- empleados: campos PÚBLICOS
-- ---------------------------------------------------------------------------
alter table public.empleados
  add column if not exists puesto public.empleado_puesto,
  add column if not exists email  text,
  add column if not exists activo boolean not null default true;

-- Un empleado se vincula (opcional) a UNA cuenta de login.
create unique index if not exists empleados_user_id_unique
  on public.empleados (user_id) where user_id is not null;
create index if not exists idx_empleados_nombre on public.empleados (nombre_completo);
create index if not exists idx_empleados_activo on public.empleados (activo);

-- ---------------------------------------------------------------------------
-- empleados_privado: datos PRIVADOS (solo admin)
-- ---------------------------------------------------------------------------
create table if not exists public.empleados_privado (
  empleado_id                  uuid primary key
                               references public.empleados (id) on delete cascade,
  cedula                       text,
  salario                      numeric(12, 2),
  banco                        text,
  cuenta_banco                 text,
  direccion                    text,
  contacto_emergencia_nombre   text,
  contacto_emergencia_telefono text,
  documentos                   jsonb not null default '[]'::jsonb,
  notas_rrhh                   text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint emp_priv_cedula_formato
    check (cedula is null or cedula ~ '^\d{3}-\d{7}-\d$'),
  constraint emp_priv_salario_no_negativo
    check (salario is null or salario >= 0)
);

comment on table public.empleados_privado is
  'Datos privados de empleados (salario, cédula, banco). SOLO admin vía RLS.';

-- Migrar datos privados que pudieran existir en la tabla vieja.
insert into public.empleados_privado (empleado_id, cedula, salario, direccion, notas_rrhh)
  select id, cedula, salario, direccion, notas_rrhh
  from public.empleados
  where cedula is not null or salario is not null
     or direccion is not null or notas_rrhh is not null
  on conflict (empleado_id) do nothing;

-- Quitar las columnas privadas de la tabla pública.
alter table public.empleados
  drop column if exists cedula,
  drop column if exists salario,
  drop column if exists direccion,
  drop column if exists notas_rrhh;

-- updated_at + auditoría
drop trigger if exists trg_emp_priv_updated_at on public.empleados_privado;
create trigger trg_emp_priv_updated_at before update on public.empleados_privado
  for each row execute function public.set_updated_at();

drop trigger if exists trg_audit_empleados_privado on public.empleados_privado;
create trigger trg_audit_empleados_privado
  after insert or update or delete on public.empleados_privado
  for each row execute function public.fn_audit();

-- ---------------------------------------------------------------------------
-- Privilegios + RLS
-- ---------------------------------------------------------------------------
revoke all on public.empleados_privado from anon, public;
grant select, insert, update, delete on public.empleados_privado to authenticated;

alter table public.empleados_privado enable row level security;
alter table public.empleados_privado force  row level security;

-- empleados PÚBLICO: lo ve todo el personal; SOLO admin gestiona.
drop policy if exists emp_select on public.empleados;
create policy emp_select on public.empleados
  for select to authenticated using (public.is_staff());

drop policy if exists emp_insert on public.empleados;
create policy emp_insert on public.empleados
  for insert to authenticated with check (public.is_admin());

drop policy if exists emp_update on public.empleados;
create policy emp_update on public.empleados
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists emp_delete on public.empleados;
create policy emp_delete on public.empleados
  for delete to authenticated using (public.is_admin());

-- empleados_privado: SOLO admin (ver y editar). Nadie más, garantizado por RLS.
drop policy if exists emp_priv_select on public.empleados_privado;
create policy emp_priv_select on public.empleados_privado
  for select to authenticated using (public.is_admin());

drop policy if exists emp_priv_insert on public.empleados_privado;
create policy emp_priv_insert on public.empleados_privado
  for insert to authenticated with check (public.is_admin());

drop policy if exists emp_priv_update on public.empleados_privado;
create policy emp_priv_update on public.empleados_privado
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists emp_priv_delete on public.empleados_privado;
create policy emp_priv_delete on public.empleados_privado
  for delete to authenticated using (public.is_admin());
