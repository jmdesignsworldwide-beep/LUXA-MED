import { z } from "zod";

/** Validación server-side del inicio de sesión. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginInput = z.infer<typeof loginSchema>;
