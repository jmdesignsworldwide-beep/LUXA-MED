-- =============================================================================
-- 0026  Panel Financiero Gerencial (interno, NO fiscal)
-- =============================================================================
-- Para que el Dr. Morel vea la salud del negocio: entra, sale, margen.
-- NO es facturación fiscal (eso es otro módulo con el contador).
--
-- Seguridad: SOLO admin ve/gestiona (RLS + FORCE RLS en las 3 tablas).
-- Enfermera/recepción no acceden a nada. Todo auditado.
--
-- Conexión: la nómina (módulo existente) se REFLEJA como gasto de categoría
-- "Nóminas" en el resumen (sin duplicar datos: la nómina sigue siendo la fuente).
-- Preparado (no activo): insumos (inventario futuro) y mantenimiento (cámara)
-- también podrán alimentar gastos.
-- Idempotente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Categorías de gasto (base precargadas + las que añada el admin)
-- ---------------------------------------------------------------------------
create table if not exists public.categorias_gasto (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  es_sistema boolean not null default false,
  activo     boolean not null default true,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categorias_gasto (nombre, es_sistema) values
  ('Gastos de negocio', true),
  ('Nóminas', true),
  ('Insumos médicos', true),
  ('Mantenimiento', true),
  ('Otros', true)
on conflict (nombre) do nothing;

-- ---------------------------------------------------------------------------
-- Gastos
-- ---------------------------------------------------------------------------
create table if not exists public.gastos (
  id           uuid primary key default gen_random_uuid(),
  monto        numeric(12, 2) not null check (monto >= 0),
  fecha        date not null default current_date,
  categoria_id uuid references public.categorias_gasto (id) on delete set null,
  nota         text,
  origen       text not null default 'manual', -- manual | nomina | insumo | mantenimiento
  origen_id    uuid,
  created_by   uuid references public.user_profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_gastos_fecha on public.gastos (fecha desc);
create index if not exists idx_gastos_categoria on public.gastos (categoria_id);

-- ---------------------------------------------------------------------------
-- Ingresos (manual por ahora; futuro: facturación los alimenta)
-- ---------------------------------------------------------------------------
create table if not exists public.ingresos (
  id         uuid primary key default gen_random_uuid(),
  monto      numeric(12, 2) not null check (monto >= 0),
  fecha      date not null default current_date,
  concepto   text not null,
  nota       text,
  origen     text not null default 'manual',
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ingresos_fecha on public.ingresos (fecha desc);

-- ---------------------------------------------------------------------------
-- updated_at + auditoría
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['categorias_gasto', 'gastos', 'ingresos'] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$s for each row execute function public.set_updated_at()', t);
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.fn_audit()', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Privilegios + RLS — SOLO admin
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['categorias_gasto', 'gastos', 'ingresos'] loop
    execute format('revoke all on public.%1$s from anon, public', t);
    execute format('grant select, insert, update, delete on public.%1$s to authenticated', t);
    execute format('alter table public.%1$s enable row level security', t);
    execute format('alter table public.%1$s force row level security', t);

    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.is_admin())', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (public.is_admin())', t);
    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (public.is_admin())', t);
  end loop;
end
$$;
