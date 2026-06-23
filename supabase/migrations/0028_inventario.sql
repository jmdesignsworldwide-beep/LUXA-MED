-- =============================================================================
-- 0028  Inventario de insumos médicos (con movimientos y stock vivo)
-- =============================================================================
-- Seguridad (RLS + FORCE RLS):
--   * Insumos: los VE todo el personal (stock); SOLO admin los gestiona.
--   * Movimientos: ENTRADA solo admin; SALIDA admin y enfermera; recepción no.
--     Todos ven el historial.
-- El stock se mantiene vivo con un trigger SECURITY DEFINER (suma/resta según
-- el movimiento), así una salida de enfermera ajusta el stock sin que ella
-- tenga permiso de editar el insumo.
-- Preparado: salidas por sesión (insumo_movimientos.sesion_id) y enlace al
-- gasto de finanzas (gasto_id) al comprar insumos.
-- Idempotente.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'insumo_mov_tipo') then
    create type public.insumo_mov_tipo as enum ('entrada', 'salida');
  end if;
end
$$;

create table if not exists public.insumos (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  categoria      text,
  unidad         text not null default 'unidades',
  stock          numeric(12, 2) not null default 0,
  nivel_minimo   numeric(12, 2) not null default 0,
  costo_unitario numeric(12, 2) not null default 0 check (costo_unitario >= 0),
  proveedor      text,
  activo         boolean not null default true,
  created_by     uuid references public.user_profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_insumos_nombre on public.insumos (nombre);
create index if not exists idx_insumos_categoria on public.insumos (categoria);
create index if not exists idx_insumos_activo on public.insumos (activo);

create table if not exists public.insumo_movimientos (
  id             uuid primary key default gen_random_uuid(),
  insumo_id      uuid not null references public.insumos (id) on delete cascade,
  tipo           public.insumo_mov_tipo not null,
  cantidad       numeric(12, 2) not null check (cantidad > 0),
  costo_unitario numeric(12, 2),
  motivo         text,
  fecha          date not null default current_date,
  sesion_id      uuid references public.sesiones (id) on delete set null,
  gasto_id       uuid references public.gastos (id) on delete set null,
  created_by     uuid references public.user_profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_insumo_mov_insumo on public.insumo_movimientos (insumo_id, fecha desc);
create index if not exists idx_insumo_mov_sesion on public.insumo_movimientos (sesion_id);

-- ---------------------------------------------------------------------------
-- Stock vivo: trigger SECURITY DEFINER que ajusta insumos.stock
-- ---------------------------------------------------------------------------
create or replace function public.fn_ajustar_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.insumos
       set stock = stock + (case when new.tipo = 'entrada' then new.cantidad else -new.cantidad end),
           updated_at = now()
     where id = new.insumo_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.insumos
       set stock = stock - (case when old.tipo = 'entrada' then old.cantidad else -old.cantidad end),
           updated_at = now()
     where id = old.insumo_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_ajustar_stock on public.insumo_movimientos;
create trigger trg_ajustar_stock
  after insert or delete on public.insumo_movimientos
  for each row execute function public.fn_ajustar_stock();

-- updated_at + auditoría
drop trigger if exists trg_insumos_updated_at on public.insumos;
create trigger trg_insumos_updated_at before update on public.insumos
  for each row execute function public.set_updated_at();
drop trigger if exists trg_audit_insumos on public.insumos;
create trigger trg_audit_insumos after insert or update or delete on public.insumos
  for each row execute function public.fn_audit();
drop trigger if exists trg_audit_insumo_mov on public.insumo_movimientos;
create trigger trg_audit_insumo_mov after insert or update or delete on public.insumo_movimientos
  for each row execute function public.fn_audit();

-- ---------------------------------------------------------------------------
-- Privilegios + RLS
-- ---------------------------------------------------------------------------
revoke all on public.insumos from anon, public;
revoke all on public.insumo_movimientos from anon, public;
grant select, insert, update, delete on public.insumos to authenticated;
grant select, insert, update, delete on public.insumo_movimientos to authenticated;

alter table public.insumos enable row level security;
alter table public.insumos force  row level security;
alter table public.insumo_movimientos enable row level security;
alter table public.insumo_movimientos force  row level security;

-- Insumos: todo el personal ve; solo admin gestiona.
drop policy if exists insumos_select on public.insumos;
create policy insumos_select on public.insumos for select to authenticated using (public.is_staff());
drop policy if exists insumos_insert on public.insumos;
create policy insumos_insert on public.insumos for insert to authenticated with check (public.is_admin());
drop policy if exists insumos_update on public.insumos;
create policy insumos_update on public.insumos for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists insumos_delete on public.insumos;
create policy insumos_delete on public.insumos for delete to authenticated using (public.is_admin());

-- Movimientos: todos ven; ENTRADA solo admin, SALIDA admin+enfermera.
drop policy if exists insumo_mov_select on public.insumo_movimientos;
create policy insumo_mov_select on public.insumo_movimientos for select to authenticated using (public.is_staff());
drop policy if exists insumo_mov_insert on public.insumo_movimientos;
create policy insumo_mov_insert on public.insumo_movimientos
  for insert to authenticated
  with check (
    public.is_admin()
    or (public.is_clinical_staff() and tipo = 'salida')
  );
drop policy if exists insumo_mov_update on public.insumo_movimientos;
create policy insumo_mov_update on public.insumo_movimientos for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists insumo_mov_delete on public.insumo_movimientos;
create policy insumo_mov_delete on public.insumo_movimientos for delete to authenticated using (public.is_admin());
