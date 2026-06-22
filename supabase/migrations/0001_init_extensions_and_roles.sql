-- =============================================================================
-- 0001  Extensiones, enum de roles y utilidades base
-- =============================================================================
-- Idempotente: se puede correr varias veces sin romper nada.
-- LUXA-MED — clínica hiperbárica (RD). Datos médicos: la seguridad es la base.
-- =============================================================================

-- gen_random_uuid() viene de pgcrypto (disponible en Supabase).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enum de los 4 roles fijos. Un usuario = un rol.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'medico', 'enfermera', 'recepcion');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Función genérica para mantener updated_at al día.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
