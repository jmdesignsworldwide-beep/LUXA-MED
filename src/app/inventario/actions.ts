"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { entradaSchema, insumoSchema, salidaSchema } from "@/lib/validation/inventario";

export type InventarioState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

async function sesion() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Crear insumo (solo admin). Stock inicial opcional = entrada de apertura. */
export async function crearInsumo(
  _prev: InventarioState,
  formData: FormData,
): Promise<InventarioState> {
  if (!getSupabaseServerConfig().configured) return { ok: false, message: "Servicio no disponible." };
  const parsed = insumoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const { supabase, user } = await sesion();
  const d = parsed.data;
  const { data: insumo, error } = await supabase
    .from("insumos")
    .insert({
      nombre: d.nombre,
      categoria: d.categoria ?? null,
      unidad: d.unidad,
      nivel_minimo: d.nivel_minimo,
      costo_unitario: d.costo_unitario,
      proveedor: d.proveedor ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !insumo) {
    if (error?.code === "42501") return { ok: false, message: "Solo un administrador puede crear insumos." };
    return { ok: false, message: "No se pudo crear el insumo." };
  }
  if (d.stock_inicial && d.stock_inicial > 0) {
    await supabase.from("insumo_movimientos").insert({
      insumo_id: insumo.id,
      tipo: "entrada",
      cantidad: d.stock_inicial,
      costo_unitario: d.costo_unitario,
      motivo: "Stock inicial",
      created_by: user.id,
    });
  }
  revalidatePath("/inventario");
  redirect(`/inventario/${insumo.id}?creado=1`);
}

/** Editar insumo (solo admin). No toca el stock (eso va por movimientos). */
export async function editarInsumo(
  id: string,
  _prev: InventarioState,
  formData: FormData,
): Promise<InventarioState> {
  if (!getSupabaseServerConfig().configured) return { ok: false, message: "Servicio no disponible." };
  const parsed = insumoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const { supabase } = await sesion();
  const d = parsed.data;
  const { error } = await supabase
    .from("insumos")
    .update({
      nombre: d.nombre,
      categoria: d.categoria ?? null,
      unidad: d.unidad,
      nivel_minimo: d.nivel_minimo,
      costo_unitario: d.costo_unitario,
      proveedor: d.proveedor ?? null,
    })
    .eq("id", id);
  if (error) {
    if (error.code === "42501") return { ok: false, message: "Solo un administrador puede editar insumos." };
    return { ok: false, message: "No se pudo guardar." };
  }
  revalidatePath(`/inventario/${id}`);
  revalidatePath("/inventario");
  redirect(`/inventario/${id}?actualizado=1`);
}

/** Activar/desactivar insumo (soft-delete, solo admin). */
export async function cambiarEstadoInsumo(id: string, activo: boolean): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const { supabase } = await sesion();
  const { error } = await supabase.from("insumos").update({ activo }).eq("id", id);
  revalidatePath(`/inventario/${id}`);
  revalidatePath("/inventario");
  redirect(`/inventario/${id}?${error ? "error=estado" : `estado=${activo ? "activado" : "desactivado"}`}`);
}

/** Entrada (compra/reposición): suma stock + refleja gasto en finanzas (solo admin). */
export async function registrarEntrada(
  insumoId: string,
  _prev: InventarioState,
  formData: FormData,
): Promise<InventarioState> {
  if (!getSupabaseServerConfig().configured) return { ok: false, message: "Servicio no disponible." };
  const parsed = entradaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: "Revisa los campos.", errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const { supabase, user } = await sesion();
  const d = parsed.data;

  const { data: insumo } = await supabase.from("insumos").select("nombre").eq("id", insumoId).maybeSingle();

  // Reflejar como gasto "Insumos médicos" en finanzas.
  let gastoId: string | null = null;
  const { data: cat } = await supabase
    .from("categorias_gasto")
    .select("id")
    .eq("nombre", "Insumos médicos")
    .maybeSingle();
  if (cat?.id) {
    const { data: gasto } = await supabase
      .from("gastos")
      .insert({
        monto: d.cantidad * d.costo_unitario,
        fecha: d.fecha,
        categoria_id: cat.id,
        nota: `Compra de insumo: ${insumo?.nombre ?? ""} (${d.cantidad})`,
        origen: "insumo",
        origen_id: insumoId,
        created_by: user.id,
      })
      .select("id")
      .single();
    gastoId = (gasto?.id as string) ?? null;
  }

  const { error } = await supabase.from("insumo_movimientos").insert({
    insumo_id: insumoId,
    tipo: "entrada",
    cantidad: d.cantidad,
    costo_unitario: d.costo_unitario,
    motivo: d.motivo ?? "Compra/reposición",
    fecha: d.fecha,
    gasto_id: gastoId,
    created_by: user.id,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, message: "Solo un administrador puede registrar entradas." };
    return { ok: false, message: "No se pudo registrar la entrada." };
  }
  revalidatePath(`/inventario/${insumoId}`);
  revalidatePath("/inventario");
  redirect(`/inventario/${insumoId}?mov=entrada`);
}

/** Salida (uso/consumo): resta stock (admin y enfermera). */
export async function registrarSalida(
  insumoId: string,
  _prev: InventarioState,
  formData: FormData,
): Promise<InventarioState> {
  if (!getSupabaseServerConfig().configured) return { ok: false, message: "Servicio no disponible." };
  const parsed = salidaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: "Revisa los campos.", errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const { supabase, user } = await sesion();
  const d = parsed.data;

  const { data: insumo } = await supabase.from("insumos").select("stock").eq("id", insumoId).maybeSingle();
  if (insumo && Number(insumo.stock) < d.cantidad) {
    return { ok: false, message: `No hay suficiente stock (disponible: ${insumo.stock}).` };
  }

  const { error } = await supabase.from("insumo_movimientos").insert({
    insumo_id: insumoId,
    tipo: "salida",
    cantidad: d.cantidad,
    motivo: d.motivo ?? "Uso/consumo",
    fecha: d.fecha,
    created_by: user.id,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, message: "No tienes permiso para registrar salidas." };
    return { ok: false, message: "No se pudo registrar la salida." };
  }
  revalidatePath(`/inventario/${insumoId}`);
  revalidatePath("/inventario");
  redirect(`/inventario/${insumoId}?mov=salida`);
}
