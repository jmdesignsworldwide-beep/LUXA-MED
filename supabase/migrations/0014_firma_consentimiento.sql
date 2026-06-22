-- =============================================================================
-- 0014  Firma digital del consentimiento informado (inmutable)
-- =============================================================================
-- Cierre legal del consentimiento (Ley 172-13). Una vez firmado, NO se edita
-- ni se borra: no hay políticas de UPDATE/DELETE (inmutable por RLS).
--   * Admin (doctora) registra la firma.
--   * Enfermera: solo ve.
--   * Recepción: sin acceso.
-- Guarda el PDF firmado (bytes en base64) + su hash SHA-256 (verificación).
-- Idempotente. RLS+FORCE RLS + auditoría.
-- =============================================================================

create table if not exists public.firmas_consentimiento (
  id                  uuid primary key default gen_random_uuid(),
  evaluacion_id       uuid not null unique
                      references public.evaluaciones_hbo (id) on delete cascade,
  paciente_id         uuid not null references public.pacientes (id) on delete cascade,
  tipo_firma          text not null check (tipo_firma in ('dibujada', 'tipografica')),
  firma_imagen        text,   -- data URL PNG (si dibujada)
  firma_texto         text,   -- nombre escrito (si tipográfica)
  paciente_nombre     text not null,
  paciente_cedula     text,
  consentimiento_texto text not null,
  firmado_en          timestamptz not null default now(),
  pdf_base64          text not null,
  pdf_hash            text not null,   -- SHA-256 hex de los bytes del PDF
  created_by          uuid references public.user_profiles (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_firmas_paciente
  on public.firmas_consentimiento (paciente_id);

comment on table public.firmas_consentimiento is
  'Consentimiento firmado (inmutable). Sin UPDATE/DELETE: integridad legal.';

drop trigger if exists trg_audit_firmas on public.firmas_consentimiento;
create trigger trg_audit_firmas
  after insert or update or delete on public.firmas_consentimiento
  for each row execute function public.fn_audit();

-- ---------------------------------------------------------------------------
-- Privilegios + RLS — inmutable (solo SELECT e INSERT)
-- ---------------------------------------------------------------------------
revoke all on public.firmas_consentimiento from anon, public;
grant select, insert on public.firmas_consentimiento to authenticated;
-- (NO se otorga update/delete: la firma no se puede alterar)

alter table public.firmas_consentimiento enable row level security;
alter table public.firmas_consentimiento force  row level security;

-- Ver: personal clínico (admin + enfermera). Recepción no.
drop policy if exists firma_select on public.firmas_consentimiento;
create policy firma_select on public.firmas_consentimiento
  for select to authenticated
  using (public.is_clinical_staff());

-- Registrar firma: solo admin (la doctora).
drop policy if exists firma_insert on public.firmas_consentimiento;
create policy firma_insert on public.firmas_consentimiento
  for insert to authenticated
  with check (public.is_admin());

-- (intencional: sin políticas UPDATE/DELETE -> inmutable para todos)
