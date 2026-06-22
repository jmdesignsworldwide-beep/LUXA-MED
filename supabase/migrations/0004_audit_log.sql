-- =============================================================================
-- 0004  audit_log: quién hizo qué, cuándo (desde el día 1)
-- =============================================================================
-- Las escrituras ocurren SOLO vía trigger SECURITY DEFINER. No hay políticas de
-- INSERT/UPDATE/DELETE para nadie (ver 0005): el log es inmutable para usuarios.
-- =============================================================================

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  table_name  text not null,
  action      text not null,             -- INSERT | UPDATE | DELETE
  row_id      uuid,
  actor_id    uuid,                       -- auth.uid() del que hizo el cambio
  actor_role  text,                       -- rol en ese momento
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.audit_log is
  'Bitácora de auditoría. Inmutable: solo se escribe vía trigger SECURITY DEFINER.';

create index if not exists idx_audit_log_table_row
  on public.audit_log (table_name, row_id);
create index if not exists idx_audit_log_actor
  on public.audit_log (actor_id);
create index if not exists idx_audit_log_created_at
  on public.audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Trigger genérico de auditoría. SECURITY DEFINER para escribir en audit_log
-- saltando RLS (lo corre el dueño, postgres, con bypassrls).
-- ---------------------------------------------------------------------------
create or replace function public.fn_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role  text;
begin
  begin
    v_role := public.current_user_role()::text;
  exception when others then
    v_role := null;
  end;

  if tg_op = 'INSERT' then
    insert into public.audit_log (table_name, action, row_id, actor_id, actor_role, old_data, new_data)
    values (tg_table_name, tg_op, new.id, v_actor, v_role, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (table_name, action, row_id, actor_id, actor_role, old_data, new_data)
    values (tg_table_name, tg_op, new.id, v_actor, v_role, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (table_name, action, row_id, actor_id, actor_role, old_data, new_data)
    values (tg_table_name, tg_op, old.id, v_actor, v_role, to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enganchar auditoría a todas las tablas sensibles.
-- ---------------------------------------------------------------------------
drop trigger if exists trg_audit_user_profiles on public.user_profiles;
create trigger trg_audit_user_profiles
  after insert or update or delete on public.user_profiles
  for each row execute function public.fn_audit();

drop trigger if exists trg_audit_empleados on public.empleados;
create trigger trg_audit_empleados
  after insert or update or delete on public.empleados
  for each row execute function public.fn_audit();

drop trigger if exists trg_audit_pacientes on public.pacientes;
create trigger trg_audit_pacientes
  after insert or update or delete on public.pacientes
  for each row execute function public.fn_audit();

drop trigger if exists trg_audit_historia_clinica on public.historia_clinica;
create trigger trg_audit_historia_clinica
  after insert or update or delete on public.historia_clinica
  for each row execute function public.fn_audit();
