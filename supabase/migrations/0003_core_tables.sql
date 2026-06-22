-- =============================================================================
-- 0003  Tablas núcleo: empleados (privado RRHH), pacientes (demográfico),
--        historia_clinica (clínico / diagnósticos)
-- =============================================================================
-- Frontera de seguridad clave:
--   * pacientes        -> demográfico, lo ve recepción y clínicos
--   * historia_clinica -> diagnósticos, NUNCA recepción (se bloquea en 0005)
--   * empleados        -> datos privados de RRHH, SOLO admin (se bloquea en 0005)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- empleados: datos privados de RRHH (cédula, salario, etc.). Solo Admin.
-- ---------------------------------------------------------------------------
create table if not exists public.empleados (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.user_profiles (id) on delete set null,
  nombre_completo text not null,
  cedula          text,
  telefono        text,
  direccion       text,
  salario         numeric(12, 2),
  fecha_ingreso   date,
  notas_rrhh      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint empleados_cedula_formato
    check (cedula is null or cedula ~ '^\d{3}-\d{7}-\d$')
);

comment on table public.empleados is
  'Datos privados de empleados (RRHH). Acceso exclusivo de Admin vía RLS.';

drop trigger if exists trg_empleados_updated_at on public.empleados;
create trigger trg_empleados_updated_at
  before update on public.empleados
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- pacientes: datos demográficos. Recepción SÍ trabaja con esto.
-- ---------------------------------------------------------------------------
create table if not exists public.pacientes (
  id                  uuid primary key default gen_random_uuid(),
  nombre_completo     text not null,
  cedula              text,
  fecha_nacimiento    date,
  sexo                text check (sexo is null or sexo in ('M', 'F', 'Otro')),
  telefono            text,
  email               text,
  direccion           text,
  contacto_emergencia text,
  created_by          uuid references public.user_profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint pacientes_cedula_formato
    check (cedula is null or cedula ~ '^\d{3}-\d{7}-\d$')
);

comment on table public.pacientes is
  'Datos demográficos de pacientes. Accesible por todo el personal (incl. recepción).';

drop trigger if exists trg_pacientes_updated_at on public.pacientes;
create trigger trg_pacientes_updated_at
  before update on public.pacientes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- historia_clinica: diagnósticos / notas clínicas. NUNCA recepción.
-- ---------------------------------------------------------------------------
create table if not exists public.historia_clinica (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes (id) on delete cascade,
  diagnostico    text not null,
  notas_clinicas text,
  tratamiento    text,
  medico_id      uuid references public.user_profiles (id) on delete set null,
  fecha          timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.historia_clinica is
  'Historia clínica y diagnósticos. Bloqueado para Recepción a nivel RLS.';

create index if not exists idx_historia_clinica_paciente
  on public.historia_clinica (paciente_id);

drop trigger if exists trg_historia_clinica_updated_at on public.historia_clinica;
create trigger trg_historia_clinica_updated_at
  before update on public.historia_clinica
  for each row execute function public.set_updated_at();
