-- =============================================================================
-- 0022  Cámara Hiperbárica — estado + bitácora de mantenimiento e incidencias
-- =============================================================================
-- UNA sola cámara (sin multi-cámara). Bitácora simple y sólida.
-- Las ALERTAS AUTOMÁTICAS por tiempo/uso NO se construyen aún (se definirán con
-- el técnico). Aquí se deja el estado + la fecha de próximo mantenimiento manual.
--
-- Seguridad (RLS + FORCE RLS + auditoría):
--   * Estado de la cámara: lo VE todo el personal (recepción incluida, para
--     saber disponibilidad); solo ADMIN lo cambia.
--   * Mantenimientos: ven admin y enfermera; solo ADMIN gestiona (crea/edita).
--   * Incidencias: ven y REGISTRAN admin y enfermera; solo ADMIN edita/borra.
--   * Recepción: solo ve el estado (no la bitácora).
-- Idempotente.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'camara_estado') then
    create type public.camara_estado as enum
      ('operativa', 'en_mantenimiento', 'fuera_de_servicio');
  end if;
  if not exists (select 1 from pg_type where typname = 'mantenimiento_tipo') then
    create type public.mantenimiento_tipo as enum ('preventivo', 'correctivo');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Cámara (fila única): estado actual + próximo mantenimiento programado.
-- ---------------------------------------------------------------------------
create table if not exists public.camara (
  id                    uuid primary key default gen_random_uuid(),
  nombre                text not null default 'Cámara Hiperbárica',
  estado                public.camara_estado not null default 'operativa',
  estado_nota           text,
  proximo_mantenimiento date,
  updated_by            uuid references public.user_profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Fila única semilla (id fijo).
insert into public.camara (id, nombre)
values ('00000000-0000-0000-0000-0000000000c1', 'Cámara Hiperbárica')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Bitácora de mantenimiento.
-- ---------------------------------------------------------------------------
create table if not exists public.camara_mantenimientos (
  id                    uuid primary key default gen_random_uuid(),
  fecha                 date not null default current_date,
  tipo                  public.mantenimiento_tipo not null,
  descripcion           text not null,
  realizado_por         text,
  costo                 numeric(12, 2),
  proximo_mantenimiento date,
  created_by            uuid references public.user_profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint camara_mant_costo_no_negativo check (costo is null or costo >= 0)
);
create index if not exists idx_camara_mant_fecha
  on public.camara_mantenimientos (fecha desc);

-- ---------------------------------------------------------------------------
-- Registro de incidencias.
-- ---------------------------------------------------------------------------
create table if not exists public.camara_incidencias (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null default current_date,
  descripcion text not null,
  resolucion  text,
  created_by  uuid references public.user_profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_camara_inc_fecha
  on public.camara_incidencias (fecha desc);

-- ---------------------------------------------------------------------------
-- updated_at + auditoría
-- ---------------------------------------------------------------------------
drop trigger if exists trg_camara_updated_at on public.camara;
create trigger trg_camara_updated_at before update on public.camara
  for each row execute function public.set_updated_at();
drop trigger if exists trg_camara_mant_updated_at on public.camara_mantenimientos;
create trigger trg_camara_mant_updated_at before update on public.camara_mantenimientos
  for each row execute function public.set_updated_at();
drop trigger if exists trg_camara_inc_updated_at on public.camara_incidencias;
create trigger trg_camara_inc_updated_at before update on public.camara_incidencias
  for each row execute function public.set_updated_at();

drop trigger if exists trg_audit_camara on public.camara;
create trigger trg_audit_camara after insert or update or delete on public.camara
  for each row execute function public.fn_audit();
drop trigger if exists trg_audit_camara_mant on public.camara_mantenimientos;
create trigger trg_audit_camara_mant after insert or update or delete on public.camara_mantenimientos
  for each row execute function public.fn_audit();
drop trigger if exists trg_audit_camara_inc on public.camara_incidencias;
create trigger trg_audit_camara_inc after insert or update or delete on public.camara_incidencias
  for each row execute function public.fn_audit();

-- ---------------------------------------------------------------------------
-- Privilegios + RLS
-- ---------------------------------------------------------------------------
revoke all on public.camara                from anon, public;
revoke all on public.camara_mantenimientos from anon, public;
revoke all on public.camara_incidencias    from anon, public;

grant select, update                 on public.camara                to authenticated;
grant select, insert, update, delete on public.camara_mantenimientos to authenticated;
grant select, insert, update, delete on public.camara_incidencias    to authenticated;

alter table public.camara                enable row level security;
alter table public.camara                force  row level security;
alter table public.camara_mantenimientos enable row level security;
alter table public.camara_mantenimientos force  row level security;
alter table public.camara_incidencias    enable row level security;
alter table public.camara_incidencias    force  row level security;

-- Cámara (estado): todo el personal lo ve; solo admin lo cambia.
drop policy if exists camara_select on public.camara;
create policy camara_select on public.camara
  for select to authenticated using (public.is_staff());
drop policy if exists camara_update on public.camara;
create policy camara_update on public.camara
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Mantenimientos: ven clínicos (admin+enfermera); solo admin gestiona.
drop policy if exists camara_mant_select on public.camara_mantenimientos;
create policy camara_mant_select on public.camara_mantenimientos
  for select to authenticated using (public.is_clinical_staff());
drop policy if exists camara_mant_insert on public.camara_mantenimientos;
create policy camara_mant_insert on public.camara_mantenimientos
  for insert to authenticated with check (public.is_admin());
drop policy if exists camara_mant_update on public.camara_mantenimientos;
create policy camara_mant_update on public.camara_mantenimientos
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists camara_mant_delete on public.camara_mantenimientos;
create policy camara_mant_delete on public.camara_mantenimientos
  for delete to authenticated using (public.is_admin());

-- Incidencias: ven y registran clínicos (admin+enfermera); solo admin edita/borra.
drop policy if exists camara_inc_select on public.camara_incidencias;
create policy camara_inc_select on public.camara_incidencias
  for select to authenticated using (public.is_clinical_staff());
drop policy if exists camara_inc_insert on public.camara_incidencias;
create policy camara_inc_insert on public.camara_incidencias
  for insert to authenticated with check (public.is_clinical_staff());
drop policy if exists camara_inc_update on public.camara_incidencias;
create policy camara_inc_update on public.camara_incidencias
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists camara_inc_delete on public.camara_incidencias;
create policy camara_inc_delete on public.camara_incidencias
  for delete to authenticated using (public.is_admin());

-- ===========================================================================
-- PREPARADO (NO activo): aquí irán las alertas automáticas por tiempo/uso
-- cuando el técnico confirme la frecuencia de mantenimiento. No se construye
-- todavía: por ahora solo existe 'proximo_mantenimiento' (fecha manual).
-- ===========================================================================
