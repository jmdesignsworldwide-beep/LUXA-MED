-- =============================================================================
-- 0027  Subcategorías de gasto (dos niveles: categoría madre → subcategoría)
-- =============================================================================
-- SOLO admin (RLS + FORCE RLS), igual que finanzas. Idempotente.
-- =============================================================================

create table if not exists public.subcategorias_gasto (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias_gasto (id) on delete cascade,
  nombre       text not null,
  es_sistema   boolean not null default false,
  activo       boolean not null default true,
  created_by   uuid references public.user_profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (categoria_id, nombre)
);
create index if not exists idx_subcategorias_categoria on public.subcategorias_gasto (categoria_id);

alter table public.gastos
  add column if not exists subcategoria_id uuid
    references public.subcategorias_gasto (id) on delete set null;
create index if not exists idx_gastos_subcategoria on public.gastos (subcategoria_id);

-- Subcategorías estándar precargadas para las categorías del sistema.
do $$
declare v_cat uuid;
begin
  select id into v_cat from public.categorias_gasto where nombre = 'Gastos de negocio';
  if v_cat is not null then
    insert into public.subcategorias_gasto (categoria_id, nombre, es_sistema) values
      (v_cat, 'Alquiler', true),
      (v_cat, 'Luz', true),
      (v_cat, 'Agua', true),
      (v_cat, 'Internet/Teléfono', true)
    on conflict (categoria_id, nombre) do nothing;
  end if;

  select id into v_cat from public.categorias_gasto where nombre = 'Mantenimiento';
  if v_cat is not null then
    insert into public.subcategorias_gasto (categoria_id, nombre, es_sistema) values
      (v_cat, 'Cámara', true),
      (v_cat, 'Equipos', true),
      (v_cat, 'Instalaciones', true)
    on conflict (categoria_id, nombre) do nothing;
  end if;
end
$$;

-- updated_at + auditoría
drop trigger if exists trg_subcategorias_gasto_updated_at on public.subcategorias_gasto;
create trigger trg_subcategorias_gasto_updated_at before update on public.subcategorias_gasto
  for each row execute function public.set_updated_at();
drop trigger if exists trg_audit_subcategorias_gasto on public.subcategorias_gasto;
create trigger trg_audit_subcategorias_gasto after insert or update or delete on public.subcategorias_gasto
  for each row execute function public.fn_audit();

-- Privilegios + RLS — SOLO admin
revoke all on public.subcategorias_gasto from anon, public;
grant select, insert, update, delete on public.subcategorias_gasto to authenticated;
alter table public.subcategorias_gasto enable row level security;
alter table public.subcategorias_gasto force  row level security;

drop policy if exists subcat_select on public.subcategorias_gasto;
create policy subcat_select on public.subcategorias_gasto for select to authenticated using (public.is_admin());
drop policy if exists subcat_insert on public.subcategorias_gasto;
create policy subcat_insert on public.subcategorias_gasto for insert to authenticated with check (public.is_admin());
drop policy if exists subcat_update on public.subcategorias_gasto;
create policy subcat_update on public.subcategorias_gasto for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists subcat_delete on public.subcategorias_gasto;
create policy subcat_delete on public.subcategorias_gasto for delete to authenticated using (public.is_admin());
