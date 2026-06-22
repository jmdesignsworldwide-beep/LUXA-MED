-- =============================================================================
-- TEST DE RLS CON ROLES SIMULADOS  (no destructivo: todo se revierte)
-- =============================================================================
-- Qué prueba: que cada uno de los 4 roles ve/escribe SOLO lo que le toca.
-- Lo crítico: RECEPCIÓN no puede VER ni ESCRIBIR historia_clinica (diagnósticos),
-- ni ver datos privados de empleados, ni leer la bitácora de auditoría.
--
-- Cómo simula un rol: se pone el rol de Postgres `authenticated` y se inyecta
-- el JWT (`request.jwt.claims`) con el `sub` del usuario de prueba. Así
-- `auth.uid()` y los helpers de RLS responden como ese usuario real.
--
-- Cómo correrlo (psql):   \i supabase/tests/rls_simulation_test.sql
-- Empieza con BEGIN y termina con ROLLBACK: NO deja datos ni toca audit_log.
-- =============================================================================

begin;

-- --- Usuarios de prueba (uno por rol) -------------------------------------
insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.test@luxa.local'),
  ('aaaaaaaa-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'enfermera.test@luxa.local'),
  ('aaaaaaaa-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recepcion.test@luxa.local');

insert into public.user_profiles (id, role, nombre_completo)
values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'admin',     'Admin de Prueba (Doctora)'),
  ('aaaaaaaa-0000-0000-0000-0000000000a3', 'enfermera', 'Enfermera de Prueba'),
  ('aaaaaaaa-0000-0000-0000-0000000000a4', 'recepcion', 'Recepción de Prueba');

-- --- Datos sembrados (a los que los roles intentarán acceder) -------------
insert into public.empleados (id, nombre_completo, salario)
values ('bbbbbbbb-0000-0000-0000-0000000000e1', 'Empleada Privada', 95000.00);

insert into public.pacientes (id, nombre_completo, cedula)
values ('cccccccc-0000-0000-0000-0000000000c1', 'Paciente de Prueba', '001-1234567-8');

insert into public.historia_clinica (id, paciente_id, diagnostico)
values ('dddddddd-0000-0000-0000-0000000000d1',
        'cccccccc-0000-0000-0000-0000000000c1',
        'DIAGNÓSTICO CONFIDENCIAL — solo personal clínico');

insert into public.sesiones (id, paciente_id, presion_ata, spo2_antes, spo2_despues, evolucion)
values ('eeeeeeee-0000-0000-0000-0000000000f1',
        'cccccccc-0000-0000-0000-0000000000c1',
        2.40, 95, 99, 'Tolera bien la sesión');

-- --- Tabla temporal para juntar los resultados del test -------------------
create temporary table rls_resultados (
  orden     int,
  rol       text,
  prueba    text,
  resultado text
) on commit drop;

-- --- Recorre los 4 roles y mide qué ve / qué puede escribir ---------------
-- Dos pasadas para que los conteos queden limpios:
--   Pasada 1: solo LECTURAS (línea base, sin que nadie escriba todavía).
--   Pasada 2: ESCRITURAS, cada intento se DESHACE (sentinel PT001) para no
--             contaminar los conteos ni dejar datos.
do $$
declare
  rec       record;
  c_pac     int;
  c_hc      int;
  c_ses     int;
  c_emp     int;
  c_audit   int;
  ok_hc     text;
  ok_ses    text;
  ok_pac    text;
  v_pac     uuid := 'cccccccc-0000-0000-0000-0000000000c1';
begin
  -- ----------------------- PASADA 1: LECTURAS -----------------------------
  for rec in
    select * from (values
      (1, 'admin',     'aaaaaaaa-0000-0000-0000-0000000000a1'::uuid),
      (2, 'enfermera', 'aaaaaaaa-0000-0000-0000-0000000000a3'::uuid),
      (3, 'recepcion', 'aaaaaaaa-0000-0000-0000-0000000000a4'::uuid)
    ) as t(orden, rol, uid)
  loop
    execute 'set local role authenticated';
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', rec.uid, 'role', 'authenticated')::text,
      true
    );

    select count(*) into c_pac   from public.pacientes;
    select count(*) into c_hc    from public.historia_clinica;
    select count(*) into c_ses   from public.sesiones;
    select count(*) into c_emp   from public.empleados;
    select count(*) into c_audit from public.audit_log;

    execute 'reset role';

    insert into rls_resultados values
      (rec.orden, rec.rol, 'VER pacientes (demográfico)',        c_pac::text || ' fila(s)'),
      (rec.orden, rec.rol, 'VER historia_clinica (diagnóstico)', c_hc::text || ' fila(s)'),
      (rec.orden, rec.rol, 'VER sesiones (SpO2/ATA/evolución)',  c_ses::text || ' fila(s)'),
      (rec.orden, rec.rol, 'VER empleados (privado RRHH)',       c_emp::text || ' fila(s)'),
      (rec.orden, rec.rol, 'VER audit_log (bitácora)',           c_audit::text || ' fila(s)');
  end loop;

  -- ----------------------- PASADA 2: ESCRITURAS ---------------------------
  for rec in
    select * from (values
      (1, 'admin',     'aaaaaaaa-0000-0000-0000-0000000000a1'::uuid),
      (2, 'enfermera', 'aaaaaaaa-0000-0000-0000-0000000000a3'::uuid),
      (3, 'recepcion', 'aaaaaaaa-0000-0000-0000-0000000000a4'::uuid)
    ) as t(orden, rol, uid)
  loop
    execute 'set local role authenticated';
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', rec.uid, 'role', 'authenticated')::text,
      true
    );

    -- ESCRIBIR DIAGNÓSTICO en historia_clinica: solo médico/admin. Se deshace.
    begin
      insert into public.historia_clinica (paciente_id, diagnostico)
      values (v_pac, 'intento de diagnóstico por ' || rec.rol);
      raise exception using errcode = 'PT001';  -- éxito -> deshacer
    exception
      when sqlstate 'PT001' then ok_hc := 'PERMITIDO';
      when others           then ok_hc := 'DENEGADO';
    end;

    -- REGISTRAR DATOS DE SESIÓN en sesiones: clínicos (incl. enfermera). Se deshace.
    begin
      insert into public.sesiones (paciente_id, presion_ata, spo2_antes, spo2_despues, evolucion)
      values (v_pac, 2.0, 96, 98, 'sesión registrada por ' || rec.rol);
      raise exception using errcode = 'PT001';  -- éxito -> deshacer
    exception
      when sqlstate 'PT001' then ok_ses := 'PERMITIDO';
      when others           then ok_ses := 'DENEGADO';
    end;

    -- ESCRIBIR pacientes (todo el personal sí). Se deshace.
    begin
      insert into public.pacientes (nombre_completo)
      values ('alta por ' || rec.rol);
      raise exception using errcode = 'PT001';  -- éxito -> deshacer
    exception
      when sqlstate 'PT001' then ok_pac := 'PERMITIDO';
      when others           then ok_pac := 'DENEGADO';
    end;

    execute 'reset role';

    insert into rls_resultados values
      (rec.orden, rec.rol, 'ESCRIBIR diagnóstico (historia_clinica)', ok_hc),
      (rec.orden, rec.rol, 'REGISTRAR sesión (sesiones)',             ok_ses),
      (rec.orden, rec.rol, 'ESCRIBIR pacientes',                      ok_pac);
  end loop;
end
$$;

-- --- Resultado legible -----------------------------------------------------
-- Esperado (3 roles; ya NO existe 'medico'):
--   admin     -> ve todo; ESCRIBIR diagnóstico = PERMITIDO; sesión = PERMITIDO
--   enfermera -> ve clínico (historia/sesiones); ESCRIBIR diagnóstico = DENEGADO;
--                REGISTRAR sesión = PERMITIDO; empleados 0, audit 0
--   recepcion -> pacientes sí; HISTORIA 0, SESIONES 0, empleados 0, audit 0;
--                diagnóstico = DENEGADO; sesión = DENEGADO; pacientes = PERMITIDO
select rol, prueba, resultado
from rls_resultados
order by orden, prueba;

rollback;
