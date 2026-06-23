"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { rateLimit } from "@/lib/rate-limit";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = { error: string } | undefined;

/**
 * Inicio de sesión real con Supabase Auth (server-side, las llaves no salen al
 * navegador). Valida con zod, aplica rate-limiting best-effort y devuelve
 * errores elegantes en español sin revelar si el correo existe.
 */
export async function iniciarSesion(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!getSupabaseServerConfig().configured) {
    return { error: "El inicio de sesión no está disponible en este momento." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Revisa el correo y la contraseña." };
  }

  // Rate-limiting por IP + correo (best-effort).
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  const limit = rateLimit(`login:${ip}:${parsed.data.email}`);
  if (!limit.ok) {
    return {
      error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Mensaje genérico: no revelamos si el correo existe.
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/");
}

/** Cierra la sesión del personal y vuelve al login. */
export async function cerrarSesion(): Promise<void> {
  if (getSupabaseServerConfig().configured) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
