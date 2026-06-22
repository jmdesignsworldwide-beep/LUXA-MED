-- =============================================================================
-- 0006  Separar "escribir diagnóstico" de "registrar datos de sesión"
-- =============================================================================
-- Decisión clínica de Marien:
--   * Escribir / actualizar DIAGNÓSTICO (historia_clinica): solo MÉDICO y ADMIN.
--     Enfermera: DENEGADO. Recepción: DENEGADO.
--   * Registrar DATOS DE SESIÓN (SpO2, presión ATA, evolución): MÉDICO,
--     ENFERMERA y ADMIN. Recepción: DENEGADO.
--   * Ver diagnóstico: médico, enfermera, admin (sin cambios). Recepción: 0.
-- Idempotente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: ¿el usuario actual es médico o admin? (quién puede escribir diagnóstico)
-- ---------------------------------------------------------------------------
create or replace function public.is_medico_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('medico', 'admin');
$$;

grant execute on function public.is_medico_or_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Nueva tabla: sesiones (datos de la terapia hiperbárica)
-- ---------------------------------------------------------------------------
create table if not exists public.sesiones (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes (id) on delete cascade,
  fecha          timestamptz not null default now(),
  presion_ata    numeric(4, 2),
  duracion_min   integer,
  spo2_antes     integer,
  spo2_despues   integer,
  evolucion      text,
  registrado_por uuid references public.user_profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint sesiones_spo2_antes_rango
    check (spo2_antes is null or spo2_antes between 0 and 100),
  constraint sesiones_spo2_despues_rango
    check (spo2_despues is null or spo2_despues between 0 and 100),
  constraint sesiones_presion_positiva
    check (presion_ata is null or presion_ata > 0),
  constraint sesiones_duracion_positiva
    check (duracion_min is null or duracion_min > 0)
);

comment on table public.sesiones is
  'Datos de sesión de terapia hiperbárica (SpO2, ATA, evolución). Personal clínico (incl. enfermera). Recepción bloqueada.';

create index if not exists idx_sesiones_paciente on public.sesiones (paciente_id);

drop trigger if exists trg_sesiones_updated_at on public.sesiones;
create trigger trg_sesiones_updated_at
  before update on public.sesiones
  for each row execute function public.set_updated_at();

drop trigger if exists trg_audit_sesiones on public.sesiones;
create trigger trg_audit_sesiones
  after insert or update or delete on public.sesiones
  for each row execute function public.fn_audit();

-- ---------------------------------------------------------------------------
-- Privilegios + RLS para sesiones
-- ---------------------------------------------------------------------------
revoke all on public.sesiones from anon, public;
grant select, insert, update, delete on public.sesiones to authenticated;

alter table public.sesiones enable row level security;
alter table public.sesiones force  row level security;

-- Ver / registrar / actualizar: personal clínico (admin, médico, enfermera).
drop policy if exists ses_select on public.sesiones;
create policy ses_select on public.sesiones
  for select to authenticated
  using (public.is_clinical_staff());

drop policy if exists ses_insert on public.sesiones;
create policy ses_insert on public.sesiones
  for insert to authenticated
  with check (public.is_clinical_staff());

drop policy if exists ses_update on public.sesiones;
create policy ses_update on public.sesiones
  for update to authenticated
  using (public.is_clinical_staff())
  with check (public.is_clinical_staff());

drop policy if exists ses_delete on public.sesiones;
create policy ses_delete on public.sesiones
  for delete to authenticated
  using (public.is_admin());

-- ===========================================================================
-- historia_clinica: ESCRIBIR (insert/update) ahora SOLO médico y admin.
--   (Ver sigue siendo personal clínico; borrar sigue siendo admin.)
-- ===========================================================================
drop policy if exists hc_insert on public.historia_clinica;
create policy hc_insert on public.historia_clinica
  for insert to authenticated
  with check (public.is_medico_or_admin());

drop policy if exists hc_update on public.historia_clinica;
create policy hc_update on public.historia_clinica
  for update to authenticated
  using (public.is_medico_or_admin())
  with check (public.is_medico_or_admin());
