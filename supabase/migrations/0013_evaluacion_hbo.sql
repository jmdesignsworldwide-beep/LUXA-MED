-- =============================================================================
-- 0013  Evaluación para Terapia Hiperbárica (historia clínica estructurada)
-- =============================================================================
-- Información clínica sensible (Ley 172-13).
-- Acceso por RLS:
--   * Admin (la doctora): escribe y ve.
--   * Enfermera: SOLO ve (no edita).
--   * Recepción: NO accede (ni ve).
-- Identidad NO se duplica: se autollena leyendo de public.pacientes.
-- Grupos de checkboxes (antecedentes, indicaciones, contraindicaciones) en JSONB.
-- Idempotente. RLS+FORCE RLS + auditoría.
-- =============================================================================

create table if not exists public.evaluaciones_hbo (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  estado      text not null default 'borrador'
              check (estado in ('borrador', 'finalizada')),

  -- Referente
  medico_referente        text,
  especialidad_referente  text,

  -- Motivo de consulta
  motivo_consulta text,

  -- Diagnóstico
  diagnostico_principal   text,
  diagnosticos_asociados  text,
  tiempo_evolucion        text,
  tratamientos_previos    text,

  -- Antecedentes patológicos (checkboxes en JSONB) + texto
  antecedentes          jsonb not null default '{}'::jsonb,
  medicamentos_actuales text,
  alergias              text,

  -- Evaluación HBO
  indicacion_hbo       jsonb not null default '{}'::jsonb,
  objetivo_terapeutico text,

  -- Contraindicaciones (absoluta + relativas) en JSONB
  contraindicaciones jsonb not null default '{}'::jsonb,

  -- Evaluación otorrino
  otoscopia_derecha       text,  -- 'normal' | 'alterada'
  otoscopia_izquierda     text,
  otorrino_observaciones  text,
  capacidad_compensacion  text,

  -- Examen físico
  ta          text,             -- tensión arterial "120/80"
  fc          integer,
  fr          integer,
  temperatura numeric(4, 1),
  sato2       integer check (sato2 is null or sato2 between 0 and 100),
  peso        numeric(5, 1),
  talla       numeric(4, 2),
  imc         numeric(4, 1),
  estado_general          text,
  sistema_cardiovascular  text,
  sistema_respiratorio    text,
  sistema_neurologico     text,
  extremidades            text,

  -- Evaluación médica
  es_candidato         boolean,
  justificacion        text,
  sesiones_estimadas   integer,
  presion_ata          numeric(4, 2),
  duracion_sesion_min  integer,

  -- Plan
  plan_tratamiento text,

  -- Consentimiento (texto estático en la app; nombre por ahora)
  consentimiento_nombre text,

  -- Firma médica
  firma_medico text,
  fecha_firma  date,

  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_evaluaciones_paciente
  on public.evaluaciones_hbo (paciente_id);

comment on table public.evaluaciones_hbo is
  'Evaluación para terapia hiperbárica (historia clínica). Admin escribe; enfermera solo ve; recepción sin acceso.';

drop trigger if exists trg_evaluaciones_updated_at on public.evaluaciones_hbo;
create trigger trg_evaluaciones_updated_at
  before update on public.evaluaciones_hbo
  for each row execute function public.set_updated_at();

drop trigger if exists trg_audit_evaluaciones on public.evaluaciones_hbo;
create trigger trg_audit_evaluaciones
  after insert or update or delete on public.evaluaciones_hbo
  for each row execute function public.fn_audit();

-- ---------------------------------------------------------------------------
-- Privilegios + RLS
-- ---------------------------------------------------------------------------
revoke all on public.evaluaciones_hbo from anon, public;
grant select, insert, update, delete on public.evaluaciones_hbo to authenticated;

alter table public.evaluaciones_hbo enable row level security;
alter table public.evaluaciones_hbo force  row level security;

-- Ver: personal clínico (admin + enfermera). Recepción NO (no es clínica).
drop policy if exists eval_select on public.evaluaciones_hbo;
create policy eval_select on public.evaluaciones_hbo
  for select to authenticated
  using (public.is_clinical_staff());

-- Escribir: SOLO admin (la doctora). Enfermera no edita.
drop policy if exists eval_insert on public.evaluaciones_hbo;
create policy eval_insert on public.evaluaciones_hbo
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists eval_update on public.evaluaciones_hbo;
create policy eval_update on public.evaluaciones_hbo
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists eval_delete on public.evaluaciones_hbo;
create policy eval_delete on public.evaluaciones_hbo
  for delete to authenticated
  using (public.is_admin());
