-- =============================================================================
-- 0007  Eliminar el rol "medico". Quedan 3 roles: admin, enfermera, recepcion.
-- =============================================================================
-- Decisión de Marien: la doctora-dueña es ADMIN y es la única que diagnostica.
--
-- Riesgo vigilado: que ninguna política RLS quede huérfana apuntando a "medico".
-- Por eso, ANTES de quitar el valor del enum, repuntamos a admin toda la lógica
-- que dependía de "medico":
--   * historia_clinica (escribir): is_medico_or_admin()  ->  is_admin()
--   * is_clinical_staff(): (admin, medico, enfermera)     ->  (admin, enfermera)
-- y eliminamos el helper obsoleto is_medico_or_admin().
--
-- Idempotente: el reemplazo del enum solo corre si "medico" aún existe.
-- =============================================================================

-- 1) Reasignar cualquier usuario con rol 'medico' a 'admin' (la doctora-dueña).
--    Se hace mientras el enum todavía tiene 'medico'.
update public.user_profiles set role = 'admin' where role::text = 'medico';

-- 2) Repuntar ESCRITURA de diagnóstico a admin ANTES de soltar 'medico'.
drop policy if exists hc_insert on public.historia_clinica;
create policy hc_insert on public.historia_clinica
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists hc_update on public.historia_clinica;
create policy hc_update on public.historia_clinica
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3) Recrear el enum sin 'medico'. Postgres no permite quitar un valor de un
--    enum, así que se recrea el tipo y se convierte la columna.
do $do$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role' and e.enumlabel = 'medico'
  ) then
    alter type public.user_role rename to user_role__old;
    create type public.user_role as enum ('admin', 'enfermera', 'recepcion');
    -- current_user_role() devuelve el enum: hay que soltarla y recrearla (paso 4).
    drop function if exists public.current_user_role();
    alter table public.user_profiles
      alter column role type public.user_role
      using role::text::public.user_role;
    drop type public.user_role__old;
  end if;
end
$do$;

-- 4) Recrear current_user_role() (idempotente; devuelve el enum nuevo).
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where id = auth.uid();
$$;

grant execute on function public.current_user_role() to authenticated;

-- 5) Personal clínico ahora = admin + enfermera (sin 'medico').
create or replace function public.is_clinical_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'enfermera');
$$;

-- 6) Eliminar helper obsoleto. Ya nada lo referencia (paso 2 lo repuntó).
drop function if exists public.is_medico_or_admin();
