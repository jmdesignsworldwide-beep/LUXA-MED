"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import {
  categoriaSchema,
  gastoSchema,
  ingresoSchema,
} from "@/lib/validation/finanzas";

export type FinanzasState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

async function admin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function registrarGasto(
  _prev: FinanzasState,
  formData: FormData,
): Promise<FinanzasState> {
  if (!getSupabaseServerConfig().configured) return { ok: false, message: "Servicio no disponible." };
  const parsed = gastoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { supabase, user } = await admin();
  const d = parsed.data;
  const { error } = await supabase.from("gastos").insert({
    monto: d.monto,
    fecha: d.fecha,
    categoria_id: d.categoria_id,
    nota: d.nota ?? null,
    origen: "manual",
    created_by: user.id,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, message: "Solo el administrador puede registrar gastos." };
    return { ok: false, message: "No se pudo registrar el gasto." };
  }
  revalidatePath("/finanzas");
  redirect("/finanzas?creado=gasto");
}

export async function registrarIngreso(
  _prev: FinanzasState,
  formData: FormData,
): Promise<FinanzasState> {
  if (!getSupabaseServerConfig().configured) return { ok: false, message: "Servicio no disponible." };
  const parsed = ingresoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { supabase, user } = await admin();
  const d = parsed.data;
  const { error } = await supabase.from("ingresos").insert({
    monto: d.monto,
    fecha: d.fecha,
    concepto: d.concepto,
    nota: d.nota ?? null,
    origen: "manual",
    created_by: user.id,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, message: "Solo el administrador puede registrar ingresos." };
    return { ok: false, message: "No se pudo registrar el ingreso." };
  }
  revalidatePath("/finanzas");
  redirect("/finanzas?creado=ingreso");
}

/** Crear categoría de gasto. */
export async function crearCategoria(
  _prev: FinanzasState,
  formData: FormData,
): Promise<FinanzasState> {
  if (!getSupabaseServerConfig().configured) return { ok: false, message: "Servicio no disponible." };
  const parsed = categoriaSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return { ok: false, message: "Nombre de categoría inválido." };
  }
  const { supabase, user } = await admin();
  const { error } = await supabase
    .from("categorias_gasto")
    .insert({ nombre: parsed.data.nombre, created_by: user.id });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Ya existe una categoría con ese nombre." };
    if (error.code === "42501") return { ok: false, message: "Solo el administrador puede gestionar categorías." };
    return { ok: false, message: "No se pudo crear la categoría." };
  }
  revalidatePath("/finanzas/categorias");
  return { ok: true, message: "Categoría creada." };
}

/** Renombrar una categoría (no las del sistema). */
export async function renombrarCategoria(id: string, formData: FormData): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const parsed = categoriaSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) return;
  const { supabase } = await admin();
  await supabase
    .from("categorias_gasto")
    .update({ nombre: parsed.data.nombre })
    .eq("id", id)
    .eq("es_sistema", false);
  revalidatePath("/finanzas/categorias");
  redirect("/finanzas/categorias?ok=1");
}

/** Activar/desactivar una categoría (no las del sistema). */
export async function alternarCategoria(id: string, activo: boolean): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const { supabase } = await admin();
  await supabase
    .from("categorias_gasto")
    .update({ activo })
    .eq("id", id)
    .eq("es_sistema", false);
  revalidatePath("/finanzas/categorias");
  redirect("/finanzas/categorias?ok=1");
}
