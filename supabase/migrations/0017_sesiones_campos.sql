-- =============================================================================
-- 0017  Sesiones HBO: campos operativos (uso diario)
-- =============================================================================
-- La tabla public.sesiones ya existe (0006) con RLS+FORCE RLS y auditoría:
--   admin y enfermera registran/ven; recepción NO; borrar solo admin.
-- Aquí solo agregamos campos. Idempotente.
-- =============================================================================

alter table public.sesiones
  add column if not exists cita_id        uuid references public.citas (id) on delete set null,
  add column if not exists numero_sesion  integer,
  add column if not exists total_sesiones integer,
  add column if not exists ta_antes       text,
  add column if not exists fc_antes       integer,
  add column if not exists incidencias    text;

create index if not exists idx_sesiones_cita on public.sesiones (cita_id);
create index if not exists idx_sesiones_paciente_fecha
  on public.sesiones (paciente_id, fecha desc);

comment on column public.sesiones.incidencias is
  'Registro de cualquier problema/incidencia durante la sesión.';
