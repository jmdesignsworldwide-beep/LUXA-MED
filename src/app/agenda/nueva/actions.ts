"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DIAS_SEMANA, RD_OFFSET } from "@/lib/constants/citas";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { citaSchema } from "@/lib/validation/cita";

export type CitaState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Agenda una cita. Bloqueo de cámara garantizado por la base (exclusión). */
export async function agendarCita(
  _prev: CitaState,
  formData: FormData,
): Promise<CitaState> {
  if (!getSupabaseServerConfig().configured) {
    return { ok: false, message: "El servicio no está disponible en este momento." };
  }

  const parsed = citaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { paciente_id, fecha, hora, duracion_min } = parsed.data;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Día de la semana de la fecha (0=domingo … 6=sábado), independiente de zona.
  const dow = new Date(`${fecha}T00:00:00Z`).getUTCDay();

  const { data: horario } = await supabase
    .from("horario_operacion")
    .select("abierto, hora_apertura, hora_cierre")
    .eq("dia_semana", dow)
    .maybeSingle();

  if (!horario || !horario.abierto) {
    return {
      ok: false,
      message: `La clínica no atiende los ${DIAS_SEMANA[dow].toLowerCase()}.`,
    };
  }

  const inicioMin = aMinutos(hora);
  const finMin = inicioMin + duracion_min;
  const aperturaMin = aMinutos(String(horario.hora_apertura).slice(0, 5));
  const cierreMin = aMinutos(String(horario.hora_cierre).slice(0, 5));

  if (inicioMin < aperturaMin) {
    return {
      ok: false,
      message: `La clínica abre a las ${String(horario.hora_apertura).slice(0, 5)}.`,
    };
  }
  if (finMin > cierreMin) {
    return {
      ok: false,
      message: `La cita termina después del cierre (${String(horario.hora_cierre).slice(0, 5)}). Acórtala o elige otra hora.`,
    };
  }

  const inicioISO = new Date(`${fecha}T${hora}:00${RD_OFFSET}`).toISOString();
  const finISO = new Date(
    new Date(inicioISO).getTime() + duracion_min * 60000,
  ).toISOString();

  const { error } = await supabase.from("citas").insert({
    paciente_id,
    inicio: inicioISO,
    fin: finISO,
    created_by: user.id,
  });

  if (error) {
    // 23P01 = exclusion_violation -> la cámara ya está ocupada en ese rango
    if (error.code === "23P01") {
      return {
        ok: false,
        message:
          "Ese horario ya está ocupado (la cámara es única). Elige otro horario.",
      };
    }
    return { ok: false, message: "No se pudo agendar la cita. Inténtalo de nuevo." };
  }

  revalidatePath("/agenda");
  redirect(`/agenda?fecha=${fecha}&creada=1`);
}
