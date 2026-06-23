"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { generarTokenPortal, sha256hex } from "@/lib/portal";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { telefonoRdSchema } from "@/lib/validation/common";

export type EnlaceState = {
  ok: boolean;
  url?: string;
  message?: string;
};

/**
 * Genera (o regenera) el enlace seguro del portal para un paciente.
 * Solo personal (is_staff). Desactiva enlaces previos: 1 enlace activo por
 * paciente. Devuelve la URL completa una sola vez (solo se guarda el hash).
 */
export async function generarEnlacePortal(
  pacienteId: string,
  _prev: EnlaceState,
  _formData: FormData,
): Promise<EnlaceState> {
  if (!getSupabaseServerConfig().configured) {
    return { ok: false, message: "El servicio no está disponible." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  const token = generarTokenPortal();
  const tokenHash = sha256hex(token);

  // Un solo enlace activo por paciente: desactivar los anteriores.
  await supabase
    .from("portal_enlaces")
    .update({ activo: false })
    .eq("paciente_id", pacienteId)
    .eq("activo", true);

  const { error } = await supabase.from("portal_enlaces").insert({
    paciente_id: pacienteId,
    token_hash: tokenHash,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "42501") {
      return { ok: false, message: "No tienes permiso para generar el enlace." };
    }
    return { ok: false, message: "No se pudo generar el enlace. Inténtalo de nuevo." };
  }

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${host}/portal/${token}`;

  revalidatePath(`/pacientes/${pacienteId}`);
  return { ok: true, url };
}

/** Deja constancia en audit_log de que se compartió el portal (quién/cuándo). */
export async function registrarCompartido(
  pacienteId: string,
  via: string,
): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc("registrar_portal_compartido", {
    p_paciente_id: pacienteId,
    p_via: via,
  });
}

export type TelefonoState = {
  ok: boolean;
  message?: string;
};

/** Guarda/actualiza el número de teléfono del paciente (para el envío). */
export async function guardarTelefonoPortal(
  pacienteId: string,
  _prev: TelefonoState,
  formData: FormData,
): Promise<TelefonoState> {
  if (!getSupabaseServerConfig().configured) {
    return { ok: false, message: "El servicio no está disponible." };
  }

  const telefono = String(formData.get("telefono") ?? "").trim();
  const parsed = telefonoRdSchema.safeParse(telefono);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Número dominicano inválido (ej. 809-555-1234).",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  const { error } = await supabase
    .from("pacientes")
    .update({ telefono: parsed.data })
    .eq("id", pacienteId);

  if (error) {
    return { ok: false, message: "No se pudo guardar el número. Inténtalo de nuevo." };
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { ok: true };
}

/** Revoca el enlace activo del portal del paciente. */
export async function revocarEnlacePortal(pacienteId: string): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("portal_enlaces")
    .update({ activo: false })
    .eq("paciente_id", pacienteId)
    .eq("activo", true);

  revalidatePath(`/pacientes/${pacienteId}`);
}
