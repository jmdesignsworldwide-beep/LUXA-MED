import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

/**
 * Lee una variable de entorno en RUNTIME (no en build).
 *
 * Next "hornea" las NEXT_PUBLIC_* en el build; si en ese momento no estaban,
 * quedan vacías para siempre. Accediendo con una clave dinámica evitamos ese
 * horneado y leemos el valor real que Vercel inyecta en la función del
 * servidor. Además limpiamos comillas/espacios accidentales.
 */
function readRuntimeEnv(key: string): string | undefined {
  const raw = process.env[key];
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

/** Config de Supabase para el servidor, leída en runtime. */
export function getSupabaseServerConfig() {
  const url = readRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const configured = Boolean(
    url && /^https?:\/\//.test(url) && anonKey && anonKey.length > 20,
  );
  return { url, anonKey, configured };
}

/**
 * Cliente de Supabase para el servidor (Server Components, Server Actions,
 * Route Handlers). La autorización la garantiza RLS en la base de datos.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseServerConfig();
  const cookieStore = cookies();

  return createServerClient(url ?? "", anonKey ?? "", {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component; se ignora si hay middleware
          // refrescando la sesión.
        }
      },
    },
  });
}
