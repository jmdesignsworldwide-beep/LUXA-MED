-- =============================================================================
-- 0009  Auto-provisión de perfil al crear un usuario de auth
-- =============================================================================
-- Cuando un admin crea un usuario (Supabase → Authentication → Add user), se
-- crea automáticamente su fila en user_profiles con rol 'recepcion' (mínimo
-- privilegio). El admin luego puede elevar el rol.
--
-- SEGURIDAD: el registro público de usuarios DEBE estar DESACTIVADO en Supabase
-- Auth (solo el admin crea cuentas). Así nadie se auto-asigna acceso.
-- Idempotente.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, role, nombre_completo)
  values (
    new.id,
    'recepcion',
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
