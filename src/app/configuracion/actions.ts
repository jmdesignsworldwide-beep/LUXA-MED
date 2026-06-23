"use server";

import { createServerClient } from "@supabase/ssr";

import { rateLimit } from "@/lib/rate-limit";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { cambioPasswordSchema } from "@/lib/validation/password";

export type PasswordState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/**
 * Cambia la contraseña del usuario logueado (server-side).
 *  1) Verifica la contraseña ACTUAL con un cliente desechable (sin tocar la
 *     sesión real ni dejar nada en cookies).
 *  2) Aplica la nueva con Supabase Auth (updateUser).
 *  3) Deja constancia en audit_log (sin guardar la clave).
 * Las contraseñas nunca se registran en logs.
 */
export async function cambiarPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const cfg = getSupabaseServerConfig();
  if (!cfg.configured) {
    return { ok: false, message: "El servicio no está disponible en este momento." };
  }

  const parsed = cambioPasswordSchema.safeParse({
    actual: formData.get("actual"),
    nueva: formData.get("nueva"),
    confirmar: formData.get("confirmar"),
  });
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
  if (!user?.email) {
    return { ok: false, message: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  // Anti-fuerza-bruta de la contraseña actual (best-effort, por usuario).
  const limit = rateLimit(`password:${user.id}`);
  if (!limit.ok) {
    return {
      ok: false,
      message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  // 1) Verificar la contraseña ACTUAL sin alterar la sesión real.
  const verificador = createServerClient(cfg.url ?? "", cfg.anonKey ?? "", {
    cookies: { getAll: () => [], setAll: () => {} },
  });
  const { error: errVerif } = await verificador.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.actual,
  });
  if (errVerif) {
    return {
      ok: false,
      message: "La contraseña actual no es correcta.",
      errors: { actual: ["La contraseña actual no es correcta"] },
    };
  }

  // 2) Aplicar la nueva contraseña (refresca la sesión actual).
  const { error: errUpdate } = await supabase.auth.updateUser({
    password: parsed.data.nueva,
  });
  if (errUpdate) {
    return {
      ok: false,
      message: "No se pudo cambiar la contraseña. Inténtalo de nuevo.",
    };
  }

  // 3) Constancia en la bitácora (sin la contraseña).
  await supabase.rpc("registrar_cambio_password");

  return { ok: true, message: "Tu contraseña se cambió correctamente." };
}
