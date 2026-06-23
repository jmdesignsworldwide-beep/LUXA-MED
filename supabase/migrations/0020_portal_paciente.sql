-- =============================================================================
-- 0020  Portal del Paciente — acceso por enlace seguro (sin cuenta)
-- =============================================================================
-- El módulo MÁS sensible: un paciente JAMÁS puede ver datos de otro.
--
-- Modelo de seguridad (la frontera vive en la BASE DE DATOS):
--   * El acceso es por un enlace con un TOKEN largo aleatorio. Solo se guarda
--     su hash SHA-256 (nunca el token en claro).
--   * Antes de ver nada, el paciente verifica identidad (cédula o fecha de
--     nacimiento). Anti-fuerza-bruta: se bloquea tras 5 intentos fallidos.
--   * Tras verificar, se crea una SESIÓN corta (2h); el navegador guarda un
--     secreto aleatorio y la BD solo su hash.
--   * El paciente NO tiene cuenta ni usuario: usa el rol anon. TODO el acceso
--     pasa por funciones SECURITY DEFINER que validan token+sesión y devuelven
--     EXCLUSIVAMENTE la fila del paciente dueño del enlace. anon NO tiene
--     acceso directo a ninguna tabla.
--   * Solo lectura. Nada de diagnósticos, notas clínicas ni contraindicaciones.
--   * Cada acceso (ok/fallido) queda en audit_log.
-- Idempotente. RLS+FORCE RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table if not exists public.portal_enlaces (
  id              uuid primary key default gen_random_uuid(),
  paciente_id     uuid not null references public.pacientes (id) on delete cascade,
  token_hash      text not null unique,
  activo          boolean not null default true,
  intentos        integer not null default 0,
  bloqueado_hasta timestamptz,
  ultimo_acceso   timestamptz,
  created_by      uuid references public.user_profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_portal_enlaces_paciente
  on public.portal_enlaces (paciente_id);

comment on table public.portal_enlaces is
  'Enlaces del portal del paciente. Solo se guarda el hash del token, nunca el token.';

create table if not exists public.portal_sesiones (
  id          uuid primary key default gen_random_uuid(),
  enlace_id   uuid not null references public.portal_enlaces (id) on delete cascade,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  secret_hash text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists idx_portal_sesiones_enlace
  on public.portal_sesiones (enlace_id);

comment on table public.portal_sesiones is
  'Sesiones verificadas del portal (cortas). Solo se guarda el hash del secreto.';

-- Auditoría de generación/revocación de enlaces.
drop trigger if exists trg_audit_portal_enlaces on public.portal_enlaces;
create trigger trg_audit_portal_enlaces
  after insert or update or delete on public.portal_enlaces
  for each row execute function public.fn_audit();

-- ---------------------------------------------------------------------------
-- Privilegios + RLS
-- ---------------------------------------------------------------------------
-- portal_enlaces: el personal (incl. recepción, es operativo) genera/ve/revoca.
revoke all on public.portal_enlaces from anon, public;
grant select, insert, update on public.portal_enlaces to authenticated;

alter table public.portal_enlaces enable row level security;
alter table public.portal_enlaces force  row level security;

drop policy if exists portal_enlaces_select on public.portal_enlaces;
create policy portal_enlaces_select on public.portal_enlaces
  for select to authenticated using (public.is_staff());

drop policy if exists portal_enlaces_insert on public.portal_enlaces;
create policy portal_enlaces_insert on public.portal_enlaces
  for insert to authenticated with check (public.is_staff());

drop policy if exists portal_enlaces_update on public.portal_enlaces;
create policy portal_enlaces_update on public.portal_enlaces
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- portal_sesiones: NADIE accede directo. Solo las funciones SECURITY DEFINER.
revoke all on public.portal_sesiones from anon, public, authenticated;
alter table public.portal_sesiones enable row level security;
alter table public.portal_sesiones force  row level security;
-- (intencional: sin políticas -> bloqueado para todos salvo el dueño/definer)

-- ---------------------------------------------------------------------------
-- Función: verificar identidad y abrir sesión.
--   Devuelve { ok, session } en éxito, o { ok:false, error } en fallo.
--   Errores genéricos: NUNCA revela datos del paciente ni si el token existe.
-- ---------------------------------------------------------------------------
create or replace function public.portal_verificar(
  p_token  text,
  p_cedula text,
  p_fecha  date
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash   text := encode(digest(p_token, 'sha256'), 'hex');
  v_enlace public.portal_enlaces%rowtype;
  v_pac    public.pacientes%rowtype;
  v_ok     boolean := false;
  v_secret text;
begin
  select * into v_enlace
    from public.portal_enlaces
   where token_hash = v_hash and activo;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalido');
  end if;

  if v_enlace.bloqueado_hasta is not null and v_enlace.bloqueado_hasta > now() then
    return jsonb_build_object('ok', false, 'error', 'bloqueado');
  end if;

  select * into v_pac from public.pacientes where id = v_enlace.paciente_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalido');
  end if;

  -- Verificación: por cédula (solo dígitos) o por fecha de nacimiento.
  if p_cedula is not null
     and length(regexp_replace(p_cedula, '\D', '', 'g')) > 0 then
    v_ok := v_pac.cedula is not null
            and regexp_replace(v_pac.cedula, '\D', '', 'g')
              = regexp_replace(p_cedula, '\D', '', 'g');
  elsif p_fecha is not null then
    v_ok := v_pac.fecha_nacimiento is not null
            and v_pac.fecha_nacimiento = p_fecha;
  end if;

  if not v_ok then
    update public.portal_enlaces
       set intentos = intentos + 1,
           bloqueado_hasta = case
             when intentos + 1 >= 5 then now() + interval '15 minutes'
             else bloqueado_hasta end
     where id = v_enlace.id;
    insert into public.audit_log
      (table_name, action, row_id, actor_id, actor_role, new_data)
    values
      ('portal', 'ACCESO_FALLIDO', v_enlace.paciente_id, null, 'paciente',
       jsonb_build_object('enlace_id', v_enlace.id));
    return jsonb_build_object('ok', false, 'error', 'no_coincide');
  end if;

  -- Éxito: limpiar intentos y abrir sesión corta.
  update public.portal_enlaces
     set intentos = 0, bloqueado_hasta = null, ultimo_acceso = now()
   where id = v_enlace.id;

  v_secret := encode(gen_random_bytes(32), 'hex');
  insert into public.portal_sesiones (enlace_id, paciente_id, secret_hash, expires_at)
  values (v_enlace.id, v_enlace.paciente_id,
          encode(digest(v_secret, 'sha256'), 'hex'),
          now() + interval '2 hours');

  insert into public.audit_log
    (table_name, action, row_id, actor_id, actor_role, new_data)
  values
    ('portal', 'ACCESO_OK', v_enlace.paciente_id, null, 'paciente',
     jsonb_build_object('enlace_id', v_enlace.id));

  return jsonb_build_object('ok', true, 'session', v_secret);
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper interno: valida token + sesión y devuelve el paciente (o null).
-- ---------------------------------------------------------------------------
create or replace function public.portal_paciente_de_sesion(
  p_token   text,
  p_session text
)
returns public.pacientes
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash   text := encode(digest(p_token, 'sha256'), 'hex');
  v_shash  text := encode(digest(p_session, 'sha256'), 'hex');
  v_enlace public.portal_enlaces%rowtype;
  v_pac    public.pacientes%rowtype;
begin
  select * into v_enlace
    from public.portal_enlaces where token_hash = v_hash and activo;
  if not found then
    return null;
  end if;

  perform 1 from public.portal_sesiones
    where enlace_id = v_enlace.id
      and secret_hash = v_shash
      and expires_at > now();
  if not found then
    return null;
  end if;

  select * into v_pac from public.pacientes where id = v_enlace.paciente_id;
  return v_pac;
end;
$$;

-- ---------------------------------------------------------------------------
-- Función: datos del panel del paciente (SOLO lo suyo, amigable).
-- ---------------------------------------------------------------------------
create or replace function public.portal_panel(
  p_token   text,
  p_session text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pac      public.pacientes%rowtype;
  v_citas    jsonb;
  v_sesiones jsonb;
  v_hechas   integer;
  v_total    integer;
  v_doc      boolean;
begin
  v_pac := public.portal_paciente_de_sesion(p_token, p_session);
  if v_pac.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;

  -- Próximas citas (programadas, futuras).
  select coalesce(jsonb_agg(
           jsonb_build_object('inicio', c.inicio, 'fin', c.fin)
           order by c.inicio), '[]'::jsonb)
    into v_citas
    from public.citas c
   where c.paciente_id = v_pac.id
     and c.estado = 'programada'
     and c.inicio >= now();

  -- Progreso: cuántas sesiones lleva y el total estimado de su evaluación.
  select count(*) into v_hechas
    from public.sesiones s where s.paciente_id = v_pac.id;

  select sesiones_estimadas into v_total
    from public.evaluaciones_hbo
   where paciente_id = v_pac.id
   order by created_at desc limit 1;

  -- Evolución amigable: solo números (oxigenación), SIN notas clínicas.
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'fecha', s.fecha,
             'numero', s.numero_sesion,
             'spo2_antes', s.spo2_antes,
             'spo2_despues', s.spo2_despues
           ) order by s.fecha desc), '[]'::jsonb)
    into v_sesiones
    from public.sesiones s where s.paciente_id = v_pac.id;

  select exists(
    select 1 from public.firmas_consentimiento f where f.paciente_id = v_pac.id
  ) into v_doc;

  return jsonb_build_object(
    'ok', true,
    'paciente', jsonb_build_object(
      'nombre', v_pac.nombre_completo,
      'cedula', v_pac.cedula,
      'telefono', v_pac.telefono,
      'email', v_pac.email,
      'direccion', v_pac.direccion,
      'fecha_nacimiento', v_pac.fecha_nacimiento
    ),
    'citas', v_citas,
    'progreso', jsonb_build_object('hechas', v_hechas, 'total', v_total),
    'sesiones', v_sesiones,
    'tiene_documento', v_doc
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Función: PDF del consentimiento firmado (base64) del paciente verificado.
-- ---------------------------------------------------------------------------
create or replace function public.portal_documento(
  p_token   text,
  p_session text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pac public.pacientes%rowtype;
  v_pdf text;
begin
  v_pac := public.portal_paciente_de_sesion(p_token, p_session);
  if v_pac.id is null then
    return null;
  end if;

  select pdf_base64 into v_pdf
    from public.firmas_consentimiento
   where paciente_id = v_pac.id
   order by created_at desc limit 1;

  return v_pdf;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecución: el portal corre como anon (paciente sin cuenta).
-- ---------------------------------------------------------------------------
revoke all on function public.portal_verificar(text, text, date) from public;
revoke all on function public.portal_panel(text, text) from public;
revoke all on function public.portal_documento(text, text) from public;
revoke all on function public.portal_paciente_de_sesion(text, text) from public, anon, authenticated;

grant execute on function public.portal_verificar(text, text, date) to anon, authenticated;
grant execute on function public.portal_panel(text, text) to anon, authenticated;
grant execute on function public.portal_documento(text, text) to anon, authenticated;
