"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { categoriaSchema, gastoSchema, ingresoSchema } from "@/lib/validation/finanzas";

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

  // Crear categoría al vuelo si se eligió "nueva".
  let categoriaId = d.categoria_id;
  if (categoriaId === "nueva") {
    if (!d.nueva_categoria) {
      return { ok: false, message: "Escribe el nombre de la nueva categoría.", errors: { nueva_categoria: ["Requerido"] } };
    }
    // Reusar si ya existe (por nombre), si no, crearla.
    const { data: existente } = await supabase
      .from("categorias_gasto")
      .select("id")
      .ilike("nombre", d.nueva_categoria)
      .maybeSingle();
    if (existente?.id) {
      categoriaId = existente.id as string;
    } else {
      const { data: creada, error: errCat } = await supabase
        .from("categorias_gasto")
        .insert({ nombre: d.nueva_categoria, created_by: user.id })
        .select("id")
        .single();
      if (errCat || !creada) {
        return { ok: false, message: "No se pudo crear la categoría nueva." };
      }
      categoriaId = creada.id as string;
    }
  }

  // Resolver subcategoría (opcional; "nueva" la crea bajo la categoría).
  let subcategoriaId: string | null = null;
  if (d.subcategoria_id === "nueva") {
    if (d.nueva_subcategoria) {
      const { data: existeSub } = await supabase
        .from("subcategorias_gasto")
        .select("id")
        .eq("categoria_id", categoriaId)
        .ilike("nombre", d.nueva_subcategoria)
        .maybeSingle();
      if (existeSub?.id) {
        subcategoriaId = existeSub.id as string;
      } else {
        const { data: subCreada } = await supabase
          .from("subcategorias_gasto")
          .insert({ categoria_id: categoriaId, nombre: d.nueva_subcategoria, created_by: user.id })
          .select("id")
          .single();
        subcategoriaId = (subCreada?.id as string) ?? null;
      }
    }
  } else if (d.subcategoria_id) {
    subcategoriaId = d.subcategoria_id;
  }

  const { error } = await supabase.from("gastos").insert({
    monto: d.monto,
    fecha: d.fecha,
    categoria_id: categoriaId,
    subcategoria_id: subcategoriaId,
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

/** Crear categoría madre (gestión). */
export async function crearCategoria(
  _prev: FinanzasState,
  formData: FormData,
): Promise<FinanzasState> {
  if (!getSupabaseServerConfig().configured) return { ok: false, message: "Servicio no disponible." };
  const parsed = categoriaSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) return { ok: false, message: "Nombre de categoría inválido." };
  const { supabase, user } = await admin();
  const { error } = await supabase
    .from("categorias_gasto")
    .insert({ nombre: parsed.data.nombre, created_by: user.id });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Ya existe una categoría con ese nombre." };
    return { ok: false, message: "No se pudo crear la categoría." };
  }
  revalidatePath("/finanzas/categorias");
  return { ok: true, message: "Categoría creada." };
}

/** Crear subcategoría dentro de una categoría madre (gestión). */
export async function crearSubcategoria(
  categoriaId: string,
  _prev: FinanzasState,
  formData: FormData,
): Promise<FinanzasState> {
  if (!getSupabaseServerConfig().configured) return { ok: false, message: "Servicio no disponible." };
  const parsed = categoriaSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) return { ok: false, message: "Nombre inválido." };
  const { supabase, user } = await admin();
  const { error } = await supabase
    .from("subcategorias_gasto")
    .insert({ categoria_id: categoriaId, nombre: parsed.data.nombre, created_by: user.id });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Ya existe esa subcategoría." };
    return { ok: false, message: "No se pudo crear la subcategoría." };
  }
  revalidatePath("/finanzas/categorias");
  return { ok: true, message: "Subcategoría creada." };
}

/** Renombrar subcategoría (gestión). */
export async function renombrarSubcategoria(id: string, formData: FormData): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const parsed = categoriaSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) return;
  const { supabase } = await admin();
  await supabase.from("subcategorias_gasto").update({ nombre: parsed.data.nombre }).eq("id", id);
  revalidatePath("/finanzas/categorias");
  redirect("/finanzas/categorias?ok=1");
}

/** Borrar subcategoría (bloqueada si tiene gastos amarrados). */
export async function borrarSubcategoria(id: string): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const { supabase } = await admin();
  const { count } = await supabase
    .from("gastos")
    .select("id", { count: "exact", head: true })
    .eq("subcategoria_id", id);
  if ((count ?? 0) > 0) {
    redirect("/finanzas/categorias?error=enuso");
  }
  await supabase.from("subcategorias_gasto").delete().eq("id", id);
  redirect("/finanzas/categorias?ok=1");
}
