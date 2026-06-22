-- =============================================================================
-- 0005  RLS + FORCE RLS + políticas en TODAS las tablas
-- =============================================================================
-- Regla de oro de este proyecto:
--   La autorización vive AQUÍ, en la base de datos. La UI nunca "esconde"
--   datos; si un rol no debe verlo, RLS lo bloquea de raíz.
--
-- Frontera crítica:
--   * Recepción ve pacientes (demográfico) pero NUNCA historia_clinica.
--   * Solo Admin ve empleados (datos privados de RRHH).
--   * audit_log: solo Admin lee; nadie escribe (solo el trigger).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Privilegios base: quitamos todo a anon/public y damos a authenticated lo
-- justo. RLS se aplica ENCIMA de estos privilegios.
-- ---------------------------------------------------------------------------
revoke all on public.user_profiles    from anon, public;
revoke all on public.empleados        from anon, public;
revoke all on public.pacientes        from anon, public;
revoke all on public.historia_clinica from anon, public;
revoke all on public.audit_log        from anon, public;

grant select, insert, update, delete on public.user_profiles    to authenticated;
grant select, insert, update, delete on public.empleados        to authenticated;
grant select, insert, update, delete on public.pacientes        to authenticated;
grant select, insert, update, delete on public.historia_clinica to authenticated;
-- audit_log: authenticated solo puede LEER (las políticas lo limitan a admin).
-- No damos insert/update/delete: el log es inmutable salvo por el trigger.
grant select on public.audit_log to authenticated;

-- Las funciones helper se usan dentro de las políticas.
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin()           to authenticated;
grant execute on function public.is_clinical_staff()  to authenticated;
grant execute on function public.is_staff()           to authenticated;

-- ---------------------------------------------------------------------------
-- Activar RLS + FORCE RLS en TODAS las tablas (incluye al dueño).
-- ---------------------------------------------------------------------------
alter table public.user_profiles    enable row level security;
alter table public.user_profiles    force  row level security;
alter table public.empleados        enable row level security;
alter table public.empleados        force  row level security;
alter table public.pacientes        enable row level security;
alter table public.pacientes        force  row level security;
alter table public.historia_clinica enable row level security;
alter table public.historia_clinica force  row level security;
alter table public.audit_log         enable row level security;
alter table public.audit_log         force  row level security;

-- ===========================================================================
-- user_profiles
--   * Cada quien lee su propio perfil; Admin lee todos.
--   * Solo Admin crea / cambia / borra perfiles (asigna roles).
-- ===========================================================================
drop policy if exists up_select on public.user_profiles;
create policy up_select on public.user_profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists up_insert on public.user_profiles;
create policy up_insert on public.user_profiles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists up_update on public.user_profiles;
create policy up_update on public.user_profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists up_delete on public.user_profiles;
create policy up_delete on public.user_profiles
  for delete to authenticated
  using (public.is_admin());

-- ===========================================================================
-- empleados  ->  SOLO Admin (datos privados de RRHH)
-- ===========================================================================
drop policy if exists emp_select on public.empleados;
create policy emp_select on public.empleados
  for select to authenticated
  using (public.is_admin());

drop policy if exists emp_insert on public.empleados;
create policy emp_insert on public.empleados
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists emp_update on public.empleados;
create policy emp_update on public.empleados
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists emp_delete on public.empleados;
create policy emp_delete on public.empleados
  for delete to authenticated
  using (public.is_admin());

-- ===========================================================================
-- pacientes  ->  todo el personal (incl. recepción); borrar solo Admin
-- ===========================================================================
drop policy if exists pac_select on public.pacientes;
create policy pac_select on public.pacientes
  for select to authenticated
  using (public.is_staff());

drop policy if exists pac_insert on public.pacientes;
create policy pac_insert on public.pacientes
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists pac_update on public.pacientes;
create policy pac_update on public.pacientes
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists pac_delete on public.pacientes;
create policy pac_delete on public.pacientes
  for delete to authenticated
  using (public.is_admin());

-- ===========================================================================
-- historia_clinica  ->  SOLO personal clínico. Recepción BLOQUEADA.
--   Sin política que aplique a recepción => 0 filas y INSERT/UPDATE denegados.
-- ===========================================================================
drop policy if exists hc_select on public.historia_clinica;
create policy hc_select on public.historia_clinica
  for select to authenticated
  using (public.is_clinical_staff());

drop policy if exists hc_insert on public.historia_clinica;
create policy hc_insert on public.historia_clinica
  for insert to authenticated
  with check (public.is_clinical_staff());

drop policy if exists hc_update on public.historia_clinica;
create policy hc_update on public.historia_clinica
  for update to authenticated
  using (public.is_clinical_staff())
  with check (public.is_clinical_staff());

drop policy if exists hc_delete on public.historia_clinica;
create policy hc_delete on public.historia_clinica
  for delete to authenticated
  using (public.is_admin());

-- ===========================================================================
-- audit_log  ->  solo Admin LEE; nadie escribe (solo el trigger SECURITY DEFINER)
-- ===========================================================================
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select to authenticated
  using (public.is_admin());
-- (intencional: sin políticas de insert/update/delete => inmutable para usuarios)
