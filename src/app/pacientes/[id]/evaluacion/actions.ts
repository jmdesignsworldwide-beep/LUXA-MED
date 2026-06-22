"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { evaluacionSchema } from "@/lib/validation/evaluacion";

export type EvaluacionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/** Agrupa los checkboxes/textos por prefijo en un objeto JSONB. */
function grupo(formData: FormData, prefijo: string) {
  const o: Record<string, boolean | string> = {};
  for (const [k, v] of Array.from(formData.entries())) {
    if (k.startsWith(prefijo)) {
      const key = k.slice(prefijo.length);
      o[key] = v === "1" ? true : String(v);
    }
  }
  return o;
}

/** Guarda (crea o actualiza) la evaluación HBO de un paciente. Solo admin (RLS). */
export async function guardarEvaluacion(
  pacienteId: string,
  _prev: EvaluacionState,
  formData: FormData,
): Promise<EvaluacionState> {
  if (!getSupabaseServerConfig().configured) {
    return { ok: false, message: "El servicio no está disponible en este momento." };
  }

  const parsed = evaluacionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const payload = {
    ...parsed.data,
    antecedentes: grupo(formData, "ant_"),
    indicacion_hbo: grupo(formData, "ind_"),
    contraindicaciones: grupo(formData, "ci_"),
  };

  // ¿Ya existe evaluación para este paciente? (una por paciente, por ahora)
  const { data: existente } = await supabase
    .from("evaluaciones_hbo")
    .select("id")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = existente
    ? await supabase
        .from("evaluaciones_hbo")
        .update(payload)
        .eq("id", existente.id)
    : await supabase
        .from("evaluaciones_hbo")
        .insert({ ...payload, paciente_id: pacienteId, created_by: user.id });

  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        message: "No tienes permiso para editar la evaluación (solo la doctora/admin).",
      };
    }
    return { ok: false, message: "No se pudo guardar la evaluación. Inténtalo de nuevo." };
  }

  revalidatePath(`/pacientes/${pacienteId}/evaluacion`);
  redirect(`/pacientes/${pacienteId}/evaluacion?guardado=1`);
}
