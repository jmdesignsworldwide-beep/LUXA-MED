import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada request (App Router middleware).
 *
 * Falla CONTROLADA: si las variables de entorno de Supabase faltan o llegan
 * vacías, NO reventamos el sitio (eso causaba MIDDLEWARE_INVOCATION_FAILED).
 * En su lugar dejamos pasar la request sin refrescar sesión. Las páginas
 * públicas (como la bienvenida) siguen cargando. Cuando se active la
 * autenticación, las variables DEBEN estar presentes en el entorno.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Aviso claro en logs (no en producción para no ensuciar), sin romper.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[middleware] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY: " +
          "se omite el refresh de sesión.",
      );
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // No meter lógica entre createServerClient y getUser: refresca el token.
  await supabase.auth.getUser();

  return supabaseResponse;
}
