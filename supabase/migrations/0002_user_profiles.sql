-- =============================================================================
-- 0002  Perfiles de usuario (1 usuario = 1 rol) + helpers de rol para RLS
-- =============================================================================
-- Cada fila enlaza con auth.users. El rol vive aquí y es la fuente de verdad
-- para todas las políticas RLS.
-- =============================================================================

create table if not exists public.user_profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            public.user_role not null,
  nombre_completo text not null,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.user_profiles is
  'Usuarios de la app y su rol único. Fuente de verdad para RLS.';

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers de rol. SECURITY DEFINER para poder leer el rol del usuario actual
-- sin chocar con RLS (y sin recursión en las políticas). search_path fijo por
-- seguridad.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

-- Personal clínico = admin, médico, enfermera. (Recepción NUNCA está aquí.)
create or replace function public.is_clinical_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'medico', 'enfermera');
$$;

-- Cualquier usuario con perfil activo (los 4 roles). Para datos de recepción
-- como los pacientes (demográficos), que sí ve recepción.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and activo = true
  );
$$;
