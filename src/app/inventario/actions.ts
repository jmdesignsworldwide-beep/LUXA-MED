"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import {
  categoriaInsumoSchema,
  entradaSchema,
  insumoSchema,
  salidaSchema,
} from "@/lib/validation/inventario";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Resuelve la categoría elegida en el formulario de insumo:
 *   - "" / undefined  -> sin categoría (null)
 *   - "nueva"         -> crea (o reusa por nombre) usando nueva_categoria
 *   - un id existente -> ese id
 */
async function resolverCategoria(
  supabase: SupabaseClient,
  userId: string,
  categoriaId: string | undefined,
  nuevaCategoria: string | undefined,
): Promise<{ id: string | null } | { error: string }> {
  if (!categoriaId) return { id: null };
  if (categoriaId !== "nueva") return { id: categoriaId };
  if (!nuevaCategoria) return { error: "Escribe el nombre de la nueva categoría." };
  const { data: existente } = await supabase
    .from("categorias_insumo")
    .select("id")
    .ilike("nombre", nuevaCategoria)
    .maybeSingle();
  if (existente?.id) return { id: existente.id as string };
  const { data: creada, error } = await supabase
    .from("categorias_insumo")
    .insert({ nombre: nuevaCategoria, created_by: userId })
    .select("id")
    .single();
  if (error || !creada) return { error: "No se pudo crear la categoría nueva." };
  return { id: creada.id as string };
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
  const cat = await resolverCategoria(supabase, user.id, d.categoria_id, d.nueva_categoria);
  if ("error" in cat) return { ok: false, message: cat.error, errors: { nueva_categoria: ["Requerido"] } };
  const { data: insumo, error } = await supabase
    .from("insumos")
    .insert({
      nombre: d.nombre,
      categoria_id: cat.id,
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
  const { supabase, user } = await sesion();
  const d = parsed.data;
  const cat = await resolverCategoria(supabase, user.id, d.categoria_id, d.nueva_categoria);
  if ("error" in cat) return { ok: false, message: cat.error, errors: { nueva_categoria: ["Requerido"] } };
  const { error } = await supabase
    .from("insumos")
    .update({
      nombre: d.nombre,
      categoria_id: cat.id,
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

// ===========================================================================
// Categorías de insumos (gestión — solo admin)
// ===========================================================================

/** Crear categoría (gestión). */
export async function crearCategoriaInsumo(
  _prev: InventarioState,
  formData: FormData,
): Promise<InventarioState> {
  if (!getSupabaseServerConfig().configured) return { ok: false, message: "Servicio no disponible." };
  const parsed = categoriaInsumoSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) return { ok: false, message: "Nombre de categoría inválido." };
  const { supabase, user } = await sesion();
  const { error } = await supabase
    .from("categorias_insumo")
    .insert({ nombre: parsed.data.nombre, created_by: user.id });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Ya existe una categoría con ese nombre." };
    if (error.code === "42501") return { ok: false, message: "Solo el administrador puede gestionar categorías." };
    return { ok: false, message: "No se pudo crear la categoría." };
  }
  revalidatePath("/inventario/categorias");
  revalidatePath("/inventario");
  return { ok: true, message: "Categoría creada." };
}

/** Renombrar categoría (gestión). */
export async function renombrarCategoriaInsumo(id: string, formData: FormData): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const parsed = categoriaInsumoSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) return;
  const { supabase } = await sesion();
  await supabase.from("categorias_insumo").update({ nombre: parsed.data.nombre }).eq("id", id);
  revalidatePath("/inventario/categorias");
  revalidatePath("/inventario");
  redirect("/inventario/categorias?ok=1");
}

/** Borrar categoría (bloqueada si tiene insumos asignados). */
export async function borrarCategoriaInsumo(id: string): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const { supabase } = await sesion();
  const { count } = await supabase
    .from("insumos")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", id);
  if ((count ?? 0) > 0) {
    redirect("/inventario/categorias?error=enuso");
  }
  await supabase.from("categorias_insumo").delete().eq("id", id);
  revalidatePath("/inventario");
  redirect("/inventario/categorias?ok=1");
}
