"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { gastoSchema, ingresoSchema } from "@/lib/validation/finanzas";

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

  const { error } = await supabase.from("gastos").insert({
    monto: d.monto,
    fecha: d.fecha,
    categoria_id: categoriaId,
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
