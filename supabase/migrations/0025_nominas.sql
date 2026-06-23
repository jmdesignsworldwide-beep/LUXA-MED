-- =============================================================================
-- 0025  Nóminas — registro de pagos a empleados (datos privados)
-- =============================================================================
-- Se conecta con empleados. Por ahora: registro simple del monto pagado.
-- Las DEDUCCIONES de ley dominicanas (TSS: AFP + SFS, ISR) se calcularán
-- después, cuando el contador confirme los %. Se deja el espacio preparado
-- (columnas deducciones/monto_bruto) pero NO se usan todavía.
--
-- Seguridad: SOLO admin gestiona y ve la nómina. Enfermera/recepción NO acceden
-- a nada (RLS = is_admin en todas las operaciones). Garantizado en la BD.
-- Idempotente. RLS + FORCE RLS + auditoría.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pago_metodo') then
    create type public.pago_metodo as enum ('transferencia', 'efectivo', 'cheque');
  end if;
end
$$;

create table if not exists public.nominas (
  id          uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id) on delete restrict,
  monto       numeric(12, 2) not null check (monto >= 0),
  fecha_pago  date not null default current_date,
  periodo     text not null,
  metodo      public.pago_metodo not null,
  notas       text,

  -- Preparado para el futuro (NO activo): deducciones de ley + bruto/neto.
  deducciones  jsonb not null default '{}'::jsonb,
  monto_bruto  numeric(12, 2),

  created_by  uuid references public.user_profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_nominas_empleado on public.nominas (empleado_id);
create index if not exists idx_nominas_fecha on public.nominas (fecha_pago desc);

comment on table public.nominas is
  'Pagos de nómina a empleados. SOLO admin (RLS). Alimenta el panel financiero (gasto).';
comment on column public.nominas.deducciones is
  'Reservado para TSS/ISR cuando el contador confirme los porcentajes. No usar aún.';

drop trigger if exists trg_nominas_updated_at on public.nominas;
create trigger trg_nominas_updated_at before update on public.nominas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_audit_nominas on public.nominas;
create trigger trg_audit_nominas
  after insert or update or delete on public.nominas
  for each row execute function public.fn_audit();

-- ---------------------------------------------------------------------------
-- Privilegios + RLS — SOLO admin
-- ---------------------------------------------------------------------------
revoke all on public.nominas from anon, public;
grant select, insert, update, delete on public.nominas to authenticated;

alter table public.nominas enable row level security;
alter table public.nominas force  row level security;

drop policy if exists nominas_select on public.nominas;
create policy nominas_select on public.nominas
  for select to authenticated using (public.is_admin());

drop policy if exists nominas_insert on public.nominas;
create policy nominas_insert on public.nominas
  for insert to authenticated with check (public.is_admin());

drop policy if exists nominas_update on public.nominas;
create policy nominas_update on public.nominas
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists nominas_delete on public.nominas;
create policy nominas_delete on public.nominas
  for delete to authenticated using (public.is_admin());
