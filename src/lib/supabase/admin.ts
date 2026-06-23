import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseServerConfig } from "@/lib/supabase/server";

/**
 * Cliente ADMIN de Supabase (service_role). SOLO servidor: la llave nunca sale
 * al navegador. Se usa exclusivamente en acciones de administrador (crear
 * cuentas de acceso, resetear contraseñas). Respeta el resto de la seguridad:
 * cada acción verifica que quien la invoca sea admin antes de usar este cliente.
 *
 * La llave NO se pide por chat: se configura en las variables de entorno de
 * Vercel como SUPABASE_SERVICE_ROLE_KEY.
 */
function leerServiceKey(): string | undefined {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) return undefined;
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

/** ¿Está configurada la creación de cuentas (service_role presente)? */
export function adminDisponible(): boolean {
  const key = leerServiceKey();
  const { url } = getSupabaseServerConfig();
  return Boolean(url && key && key.length > 20);
}

export function createAdminClient() {
  const { url } = getSupabaseServerConfig();
  const key = leerServiceKey();
  return createClient(url ?? "", key ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
