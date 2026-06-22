import { z } from "zod";

/**
 * Validación de variables de entorno con zod.
 *
 * Solo exponemos al navegador la URL del proyecto y la ANON key (públicas por
 * diseño). La service_role NUNCA vive en el código del cliente ni en este
 * archivo: si en el futuro hace falta, va en una variable de servidor aparte
 * y se maneja fuera del repo.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY parece inválida"),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  // Falla temprano y claro: sin entorno válido no arrancamos.
  console.error(
    "❌ Variables de entorno inválidas:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error(
    "Faltan o son inválidas variables de entorno de Supabase. Revisa .env.local (usa .env.example como guía).",
  );
}

export const env = parsed.data;
