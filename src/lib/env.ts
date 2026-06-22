import { z } from "zod";

/**
 * Variables de entorno públicas (URL + ANON de Supabase). Públicas por diseño:
 * van al navegador. La service_role NUNCA vive aquí.
 *
 * Diseño tolerante: NO lanzamos error al importar (eso tumbaba el sitio si
 * faltaba una variable). Validamos, avisamos claro en logs, y exponemos
 * `isSupabaseConfigured` para que cada consumidor falle de forma controlada.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success && typeof window === "undefined") {
  console.warn(
    "[env] Variables de Supabase ausentes o inválidas:",
    parsed.error.flatten().fieldErrors,
  );
}

export const isSupabaseConfigured = parsed.success;

export const env = parsed.success
  ? parsed.data
  : { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" };
