-- =============================================================================
-- 0029  Categorías de insumos (tabla propia, gestionable por el admin)
-- =============================================================================
-- Convierte insumos.categoria (texto libre) en una relación real:
--   * Tabla categorias_insumo con semillas estándar para clínica hiperbárica.
--   * insumos.categoria_id -> categorias_insumo(id).
--   * Respalda los valores de texto existentes creando sus categorías.
-- Seguridad (RLS + FORCE RLS):
--   * Todo el personal VE las categorías (para filtros y etiquetas del stock).
--   * SOLO admin las gestiona (crear/renombrar/borrar).
-- Las categorías con insumos asignados se protegen de borrado desde la app
-- (FK on delete set null como red de seguridad). Idempotente.
-- =============================================================================

create table if not exists public.categorias_insumo (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  es_sistema boolean not null default false,
  activo     boolean not null default true,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Semillas estándar para una clínica hiperbárica (el admin las puede editar).
insert into public.categorias_insumo (nombre, es_sistema) values
  ('Oxigenoterapia', true),
  ('Material de curación', true),
  ('Descartables', true),
  ('Equipos/Accesorios', true),
  ('Limpieza/Desinfección', true)
on conflict (nombre) do nothing;

alter table public.insumos
  add column if not exists categoria_id uuid
    references public.categorias_insumo (id) on delete set null;
create index if not exists idx_insumos_categoria_id on public.insumos (categoria_id);

-- Respaldo: por cada texto de categoría existente, crear su categoría y enlazar.
do $$
declare r record;
declare v_id uuid;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'insumos' and column_name = 'categoria'
  ) then
    for r in
      select distinct categoria from public.insumos
      where categoria is not null and btrim(categoria) <> ''
    loop
      insert into public.categorias_insumo (nombre) values (btrim(r.categoria))
        on conflict (nombre) do nothing;
      select id into v_id from public.categorias_insumo where nombre = btrim(r.categoria);
      update public.insumos set categoria_id = v_id
        where categoria = r.categoria and categoria_id is null;
    end loop;
  end if;
end
$$;

-- Ya no necesitamos la columna de texto libre.
alter table public.insumos drop column if exists categoria;

-- updated_at + auditoría
drop trigger if exists trg_categorias_insumo_updated_at on public.categorias_insumo;
create trigger trg_categorias_insumo_updated_at before update on public.categorias_insumo
  for each row execute function public.set_updated_at();
drop trigger if exists trg_audit_categorias_insumo on public.categorias_insumo;
create trigger trg_audit_categorias_insumo after insert or update or delete on public.categorias_insumo
  for each row execute function public.fn_audit();

-- ---------------------------------------------------------------------------
-- Privilegios + RLS
-- ---------------------------------------------------------------------------
revoke all on public.categorias_insumo from anon, public;
grant select, insert, update, delete on public.categorias_insumo to authenticated;
alter table public.categorias_insumo enable row level security;
alter table public.categorias_insumo force  row level security;

-- Todo el personal ve; solo admin gestiona.
drop policy if exists categorias_insumo_select on public.categorias_insumo;
create policy categorias_insumo_select on public.categorias_insumo
  for select to authenticated using (public.is_staff());
drop policy if exists categorias_insumo_insert on public.categorias_insumo;
create policy categorias_insumo_insert on public.categorias_insumo
  for insert to authenticated with check (public.is_admin());
drop policy if exists categorias_insumo_update on public.categorias_insumo;
create policy categorias_insumo_update on public.categorias_insumo
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists categorias_insumo_delete on public.categorias_insumo;
create policy categorias_insumo_delete on public.categorias_insumo
  for delete to authenticated using (public.is_admin());
