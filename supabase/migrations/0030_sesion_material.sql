-- =============================================================================
-- 0030  Material utilizado por sesión (consumo de inventario por terapia)
-- =============================================================================
-- El material usado en una sesión se registra como SALIDAS de inventario con
-- insumo_movimientos.sesion_id apuntando a la sesión. Para que cancelar una
-- sesión devuelva el stock de forma infalible:
--   * insumo_movimientos.sesion_id pasa a ON DELETE CASCADE: al borrar/cancelar
--     la sesión se borran sus salidas y el trigger fn_ajustar_stock las revierte
--     (suma de vuelta el stock). Sin tocar nada a mano.
-- Y para que el stock NUNCA quede mal:
--   * fn_ajustar_stock bloquea cualquier salida que dejaría el stock negativo.
-- Idempotente.
-- =============================================================================

-- 1) sesion_id -> ON DELETE CASCADE (antes era ON DELETE SET NULL).
alter table public.insumo_movimientos
  drop constraint if exists insumo_movimientos_sesion_id_fkey;
alter table public.insumo_movimientos
  add constraint insumo_movimientos_sesion_id_fkey
  foreign key (sesion_id) references public.sesiones (id) on delete cascade;

-- 2) Trigger de stock: igual que antes, pero con seguro anti-negativo en salidas.
create or replace function public.fn_ajustar_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock numeric;
begin
  if tg_op = 'INSERT' then
    if new.tipo = 'salida' then
      select stock into v_stock from public.insumos where id = new.insumo_id for update;
      if v_stock is null then
        raise exception 'INSUMO_INEXISTENTE';
      end if;
      if v_stock < new.cantidad then
        raise exception 'STOCK_INSUFICIENTE: disponible %, se intentó sacar %', v_stock, new.cantidad;
      end if;
    end if;
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
