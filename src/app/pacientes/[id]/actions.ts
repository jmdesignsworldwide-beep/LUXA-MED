"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type RegistroState } from "@/app/pacientes/nuevo/actions";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { pacienteSchema } from "@/lib/validation/paciente";

/** Edita un paciente (RLS: admin, enfermera, recepción). */
export async function actualizarPaciente(
  id: string,
  _prev: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  if (!getSupabaseServerConfig().configured) {
    return { ok: false, message: "El servicio no está disponible en este momento." };
  }

  const parsed = pacienteSchema.safeParse(Object.fromEntries(formData.entries()));
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
  const { error } = await supabase
    .from("pacientes")
    .update({
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
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        errors: { cedula: ["Ya existe otro paciente con esta cédula."] },
        message: "Esa cédula ya está registrada en otro paciente.",
      };
    }
    return { ok: false, message: "No se pudieron guardar los cambios." };
  }

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
  redirect(`/pacientes/${id}?actualizado=1`);
}

/** Cambia el estado activo/inactivo. SOLO admin (enforce en trigger DB). */
export async function cambiarEstadoPaciente(
  id: string,
  activo: boolean,
  _formData: FormData,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("pacientes")
    .update({ activo })
    .eq("id", id);

  if (error) {
    redirect(`/pacientes/${id}?error=estado`);
  }

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
  redirect(`/pacientes/${id}?estado=${activo ? "activado" : "desactivado"}`);
}
