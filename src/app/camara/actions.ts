"use server";

import { revalidatePath } from "next/cache";

import { CAMARA_ID } from "@/lib/constants/camara";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import {
  estadoCamaraSchema,
  incidenciaSchema,
  mantenimientoSchema,
} from "@/lib/validation/camara";

export type CamaraState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

function fail(message: string): CamaraState {
  return { ok: false, message };
}

async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Registrar un mantenimiento (solo admin, lo refuerza RLS). */
export async function registrarMantenimiento(
  _prev: CamaraState,
  formData: FormData,
): Promise<CamaraState> {
  if (!getSupabaseServerConfig().configured) return fail("Servicio no disponible.");

  const parsed = mantenimientoSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { supabase, user } = await getUser();
  if (!user) return fail("Tu sesión expiró. Vuelve a iniciar sesión.");

  const d = parsed.data;
  const { error } = await supabase.from("camara_mantenimientos").insert({
    fecha: d.fecha,
    tipo: d.tipo,
    descripcion: d.descripcion,
    realizado_por: d.realizado_por ?? null,
    costo: d.costo ?? null,
    proximo_mantenimiento: d.proximo_mantenimiento ?? null,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "42501") {
      return fail("Solo un administrador puede registrar mantenimientos.");
    }
    return fail("No se pudo registrar el mantenimiento. Inténtalo de nuevo.");
  }

  // Si se anotó un próximo mantenimiento, queda como el de la cámara.
  if (d.proximo_mantenimiento) {
    await supabase
      .from("camara")
      .update({ proximo_mantenimiento: d.proximo_mantenimiento, updated_by: user.id })
      .eq("id", CAMARA_ID);
  }

  revalidatePath("/camara");
  revalidatePath("/");
  return { ok: true, message: "Mantenimiento registrado." };
}

/** Registrar una incidencia (admin o enfermera). */
export async function registrarIncidencia(
  _prev: CamaraState,
  formData: FormData,
): Promise<CamaraState> {
  if (!getSupabaseServerConfig().configured) return fail("Servicio no disponible.");

  const parsed = incidenciaSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { supabase, user } = await getUser();
  if (!user) return fail("Tu sesión expiró. Vuelve a iniciar sesión.");

  const d = parsed.data;
  const { error } = await supabase.from("camara_incidencias").insert({
    fecha: d.fecha,
    descripcion: d.descripcion,
    resolucion: d.resolucion ?? null,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "42501") {
      return fail("No tienes permiso para registrar incidencias.");
    }
    return fail("No se pudo registrar la incidencia. Inténtalo de nuevo.");
  }

  revalidatePath("/camara");
  return { ok: true, message: "Incidencia registrada." };
}

/** Cambiar el estado de la cámara + nota + próximo mantenimiento (solo admin). */
export async function actualizarEstadoCamara(
  _prev: CamaraState,
  formData: FormData,
): Promise<CamaraState> {
  if (!getSupabaseServerConfig().configured) return fail("Servicio no disponible.");

  const parsed = estadoCamaraSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { supabase, user } = await getUser();
  if (!user) return fail("Tu sesión expiró. Vuelve a iniciar sesión.");

  const d = parsed.data;
  const { error } = await supabase
    .from("camara")
    .update({
      estado: d.estado,
      estado_nota: d.estado_nota ?? null,
      proximo_mantenimiento: d.proximo_mantenimiento ?? null,
      updated_by: user.id,
    })
    .eq("id", CAMARA_ID);

  if (error) {
    if (error.code === "42501") {
      return fail("Solo un administrador puede cambiar el estado de la cámara.");
    }
    return fail("No se pudo actualizar el estado. Inténtalo de nuevo.");
  }

  revalidatePath("/camara");
  revalidatePath("/");
  return { ok: true, message: "Estado actualizado." };
}
