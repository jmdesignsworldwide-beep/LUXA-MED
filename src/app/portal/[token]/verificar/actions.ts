"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { PORTAL_COOKIE } from "@/lib/portal";
import { rateLimit } from "@/lib/rate-limit";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export type VerifyState = { error?: string };

/**
 * Verifica la identidad del paciente (cédula o fecha de nacimiento) contra el
 * enlace, vía función SECURITY DEFINER. Si coincide, abre una sesión corta y
 * guarda su secreto en una cookie httpOnly. Mensajes genéricos: nunca revela
 * datos del paciente ni si el enlace existe.
 */
export async function verificarPortal(
  token: string,
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  if (!getSupabaseServerConfig().configured) {
    return { error: "El portal no está disponible en este momento." };
  }

  const cedula = String(formData.get("cedula") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  if (!cedula && !fecha) {
    return { error: "Ingresa tu cédula o tu fecha de nacimiento." };
  }

  // Primera barrera anti-fuerza-bruta (por IP + enlace). La barrera fuerte vive
  // en la BD (bloqueo tras 5 intentos).
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  const limit = rateLimit(`portal:${ip}:${token}`, 8, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_verificar", {
    p_token: token,
    p_cedula: cedula || null,
    p_fecha: fecha || null,
  });

  if (error) {
    return { error: "No se pudo verificar. Inténtalo de nuevo." };
  }
  if (!data?.ok) {
    if (data?.error === "bloqueado") {
      return {
        error:
          "Por seguridad, este acceso quedó bloqueado por unos minutos tras varios intentos. Vuelve más tarde.",
      };
    }
    return { error: "Los datos no coinciden. Revísalos e inténtalo de nuevo." };
  }

  cookies().set(PORTAL_COOKIE, data.session as string, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/portal",
    maxAge: 2 * 60 * 60,
  });

  redirect(`/portal/${token}/panel`);
}

/** Cierra la sesión del portal (borra la cookie). */
export async function salirPortal(token: string): Promise<void> {
  cookies().delete(PORTAL_COOKIE);
  redirect(`/portal/${token}`);
}
