-- =============================================================================
-- 0012  Módulo Citas/Agenda — cámara única (anti-doble-agendamiento)
-- =============================================================================
-- Lo crítico: NUNCA dos citas solapadas (una sola cámara). Se garantiza con una
-- RESTRICCIÓN DE EXCLUSIÓN de Postgres (no se puede burlar desde la app).
-- Horario de operación configurable en tabla (admin lo cambia).
-- Idempotente. RLS+FORCE RLS + auditoría como el resto del sistema.
-- =============================================================================

-- Estados de cita
do $$
begin
  if not exists (select 1 from pg_type where typname = 'cita_estado') then
    create type public.cita_estado as enum
      ('programada', 'completada', 'cancelada', 'no_asistio');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Horario de operación (configurable). dia_semana: 0=domingo … 6=sábado.
-- ---------------------------------------------------------------------------
create table if not exists public.horario_operacion (
  dia_semana    int primary key check (dia_semana between 0 and 6),
  abierto       boolean not null default true,
  hora_apertura time,
  hora_cierre   time,
  constraint horario_rango_valido
    check (not abierto or (hora_apertura is not null and hora_cierre is not null
           and hora_cierre > hora_apertura))
);

comment on table public.horario_operacion is
  'Horario de operación configurable por admin. 0=domingo … 6=sábado.';

drop trigger if exists trg_horario_updated_at on public.horario_operacion;

insert into public.horario_operacion (dia_semana, abierto, hora_apertura, hora_cierre)
values
  (0, false, null,    null),      -- domingo: cerrado
  (1, true,  '08:00', '20:00'),   -- lunes
  (2, true,  '08:00', '20:00'),   -- martes
  (3, true,  '08:00', '20:00'),   -- miércoles
  (4, true,  '08:00', '20:00'),   -- jueves
  (5, true,  '08:00', '20:00'),   -- viernes
  (6, true,  '08:00', '13:00')    -- sábado
on conflict (dia_semana) do nothing;

-- ---------------------------------------------------------------------------
-- Citas
-- ---------------------------------------------------------------------------
create table if not exists public.citas (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete restrict,
  inicio      timestamptz not null,
  fin         timestamptz not null,
  estado      public.cita_estado not null default 'programada',
  notas       text,
  created_by  uuid references public.user_profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint citas_fin_mayor_inicio check (fin > inicio)
);

create index if not exists idx_citas_inicio on public.citas (inicio);
create index if not exists idx_citas_paciente on public.citas (paciente_id);

-- 🔒 EL BLOQUEO: no se permiten dos citas que se solapen (salvo canceladas).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'citas_sin_solape') then
    alter table public.citas
      add constraint citas_sin_solape
      exclude using gist (tstzrange(inicio, fin) with &&)
      where (estado <> 'cancelada');
  end if;
end
$$;

drop trigger if exists trg_citas_updated_at on public.citas;
create trigger trg_citas_updated_at
  before update on public.citas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_audit_citas on public.citas;
create trigger trg_audit_citas
  after insert or update or delete on public.citas
  for each row execute function public.fn_audit();

-- ---------------------------------------------------------------------------
-- Privilegios + RLS
-- ---------------------------------------------------------------------------
revoke all on public.horario_operacion from anon, public;
revoke all on public.citas from anon, public;

grant select on public.horario_operacion to authenticated;
grant select, insert, update, delete on public.citas to authenticated;

alter table public.horario_operacion enable row level security;
alter table public.horario_operacion force  row level security;
alter table public.citas enable row level security;
alter table public.citas force  row level security;

-- Horario: todo el personal lo lee; solo admin lo cambia.
drop policy if exists horario_select on public.horario_operacion;
create policy horario_select on public.horario_operacion
  for select to authenticated using (public.is_staff());

drop policy if exists horario_admin on public.horario_operacion;
create policy horario_admin on public.horario_operacion
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Citas: admin, enfermera y recepción ven/agendan/editan; borrar solo admin.
drop policy if exists citas_select on public.citas;
create policy citas_select on public.citas
  for select to authenticated using (public.is_staff());

drop policy if exists citas_insert on public.citas;
create policy citas_insert on public.citas
  for insert to authenticated with check (public.is_staff());

drop policy if exists citas_update on public.citas;
create policy citas_update on public.citas
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists citas_delete on public.citas;
create policy citas_delete on public.citas
  for delete to authenticated using (public.is_admin());
