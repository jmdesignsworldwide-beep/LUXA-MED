"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { sesionSchema } from "@/lib/validation/sesion";

export type SesionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/** Registra una sesión HBO (RLS: admin y enfermera; recepción no). */
export async function registrarSesion(
  pacienteId: string,
  _prev: SesionState,
  formData: FormData,
): Promise<SesionState> {
  if (!getSupabaseServerConfig().configured) {
    return { ok: false, message: "El servicio no está disponible en este momento." };
  }

  const parsed = sesionSchema.safeParse(Object.fromEntries(formData.entries()));
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

  const d = parsed.data;

  // Si se vincula a una cita, solo se permite si está PROGRAMADA.
  if (d.cita_id) {
    const { data: cita } = await supabase
      .from("citas")
      .select("estado")
      .eq("id", d.cita_id)
      .maybeSingle();
    if (!cita) {
      return { ok: false, message: "La cita seleccionada no existe." };
    }
    if (cita.estado !== "programada") {
      return {
        ok: false,
        message:
          "Esa cita no está programada (cancelada, no asistió o ya completada). No se puede registrar una sesión sobre ella.",
      };
    }
  }

  const { error } = await supabase.from("sesiones").insert({
    paciente_id: pacienteId,
    cita_id: d.cita_id ?? null,
    numero_sesion: d.numero_sesion ?? null,
    total_sesiones: d.total_sesiones ?? null,
    spo2_antes: d.spo2_antes ?? null,
    ta_antes: d.ta_antes ?? null,
    fc_antes: d.fc_antes ?? null,
    presion_ata: d.presion_ata ?? null,
    duracion_min: d.duracion_min ?? null,
    spo2_despues: d.spo2_despues ?? null,
    evolucion: d.evolucion ?? null,
    incidencias: d.incidencias ?? null,
    registrado_por: user.id,
  });

  if (error) {
    if (error.code === "42501") {
      return { ok: false, message: "No tienes permiso para registrar sesiones." };
    }
    return { ok: false, message: "No se pudo registrar la sesión. Inténtalo de nuevo." };
  }

  // Cierra el ciclo: la cita programada queda "completada" automáticamente.
  if (d.cita_id) {
    await supabase
      .from("citas")
      .update({ estado: "completada" })
      .eq("id", d.cita_id)
      .eq("estado", "programada");
    revalidatePath("/agenda");
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  redirect(`/pacientes/${pacienteId}?sesion=1`);
}
