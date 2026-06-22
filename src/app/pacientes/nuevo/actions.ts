"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { pacienteSchema } from "@/lib/validation/paciente";

export type RegistroState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/** Registra un paciente nuevo (RLS: admin, enfermera, recepción). */
export async function registrarPaciente(
  _prev: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  if (!getSupabaseServerConfig().configured) {
    return { ok: false, message: "El servicio no está disponible en este momento." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = pacienteSchema.safeParse(raw);

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
  const payload = {
    nombre_completo: d.nombre_completo,
    cedula: d.cedula,
    fecha_nacimiento: d.fecha_nacimiento
      ? d.fecha_nacimiento.toISOString().slice(0, 10)
      : null,
    sexo: d.sexo ?? null,
    telefono: d.telefono ?? null,
    email: d.email ?? null,
    direccion: d.direccion ?? null,
    tipo_sangre: d.tipo_sangre ?? null,
    alergias: d.alergias ?? null,
    contacto_emergencia_nombre: d.contacto_emergencia_nombre ?? null,
    contacto_emergencia_telefono: d.contacto_emergencia_telefono ?? null,
    ars: d.ars ?? null,
    ars_numero_afiliado: d.ars_numero_afiliado ?? null,
    created_by: user.id,
  };

  const { error } = await supabase.from("pacientes").insert(payload);

  if (error) {
    // 23505 = violación de unicidad (cédula duplicada)
    if (error.code === "23505") {
      return {
        ok: false,
        errors: { cedula: ["Ya existe un paciente con esta cédula."] },
        message: "Esa cédula ya está registrada.",
      };
    }
    return {
      ok: false,
      message: "No se pudo guardar el paciente. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/pacientes");
  redirect("/pacientes?creado=1");
}
