import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Cliente de Supabase para el servidor (Server Components, Server Actions,
 * Route Handlers). Lee/escribe la sesión desde cookies.
 *
 * Importante: incluso en el servidor usamos la ANON key + la sesión del
 * usuario. La autorización la garantiza RLS en la base de datos, no el código.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
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
            // `setAll` se llamó desde un Server Component. Se puede ignorar
            // si hay middleware refrescando la sesión del usuario.
          }
        },
      },
    },
  );
}
