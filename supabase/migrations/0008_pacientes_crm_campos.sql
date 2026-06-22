-- =============================================================================
-- 0008  CRM de pacientes: ampliar la tabla con campos del expediente demográfico
-- =============================================================================
-- La tabla public.pacientes ya existe (0003) con RLS+FORCE RLS y auditoría.
-- Aquí SOLO agregamos campos. La seguridad y las políticas se mantienen:
--   admin, enfermera y recepción ven/registran pacientes (is_staff);
--   NADIE ve diagnósticos desde aquí (eso vive en historia_clinica).
-- Idempotente.
-- =============================================================================

-- Médico básico
alter table public.pacientes
  add column if not exists tipo_sangre text,
  add column if not exists alergias text;

-- Contacto de emergencia (nombre + teléfono). Reemplaza el campo único previo.
alter table public.pacientes drop column if exists contacto_emergencia;
alter table public.pacientes
  add column if not exists contacto_emergencia_nombre text,
  add column if not exists contacto_emergencia_telefono text;

-- Seguro (ARS) + número de afiliado
alter table public.pacientes
  add column if not exists ars text,
  add column if not exists ars_numero_afiliado text;

-- Estado activo/inactivo (soft-delete: nunca se borra de verdad)
alter table public.pacientes
  add column if not exists activo boolean not null default true;

-- Tipo de sangre válido (o nulo)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pacientes_tipo_sangre_valido'
  ) then
    alter table public.pacientes
      add constraint pacientes_tipo_sangre_valido
      check (tipo_sangre is null or tipo_sangre in
        ('A+','A-','B+','B-','AB+','AB-','O+','O-'));
  end if;
end
$$;

-- Cédula ÚNICA (permite varios NULL para casos sin cédula, ej. menores)
create unique index if not exists pacientes_cedula_unique
  on public.pacientes (cedula)
  where cedula is not null;

-- Índices para la lista (búsqueda y filtro)
create index if not exists idx_pacientes_nombre on public.pacientes (nombre_completo);
create index if not exists idx_pacientes_activo on public.pacientes (activo);
create index if not exists idx_pacientes_created_at on public.pacientes (created_at desc);

comment on column public.pacientes.activo is
  'Soft-delete: false = inactivo (no se borra el registro). Cambios quedan en audit_log.';
