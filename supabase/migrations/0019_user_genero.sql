-- =============================================================================
-- 0019  Género del usuario (para tratar correctamente: Dr./Dra., Bienvenido/a)
-- =============================================================================
-- El médico/admin del sistema es el Dr. Ángel Morel (masculino).
-- Agregamos una columna de género para adaptar los textos de la interfaz.
-- Por defecto NULL => la app asume masculino. Idempotente.
-- =============================================================================

alter table public.user_profiles
  add column if not exists genero text
    check (genero is null or genero in ('M', 'F'));

comment on column public.user_profiles.genero is
  'Género para los textos de la UI (Dr./Dra., Bienvenido/a). NULL => masculino por defecto.';

-- El admin es el Dr. Ángel Morel (masculino).
update public.user_profiles
   set genero = 'M',
       nombre_completo = 'Ángel Morel'
 where role = 'admin'
   and (genero is distinct from 'M' or nombre_completo <> 'Ángel Morel');
