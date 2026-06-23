-- =============================================================================
-- 0024  empleados_privado: columna id para el trigger genérico de auditoría
-- =============================================================================
-- fn_audit() (0004) escribe row_id = new.id en TODAS las tablas. empleados_privado
-- (0023) usa empleado_id como PK y no tenía 'id', lo que rompía insert/update.
-- Agregamos 'id' (no es la PK; empleado_id sigue siendo la PK y el on-conflict).
-- Idempotente.
-- =============================================================================

alter table public.empleados_privado
  add column if not exists id uuid not null default gen_random_uuid();

create unique index if not exists empleados_privado_id_key
  on public.empleados_privado (id);
