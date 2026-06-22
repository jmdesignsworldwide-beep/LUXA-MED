import { z } from "zod";

/**
 * Validaciones reutilizables con formatos dominicanos.
 */

/** Cédula RD: 000-0000000-0 (3-7-1 dígitos). */
export const cedulaSchema = z
  .string()
  .trim()
  .regex(
    /^\d{3}-\d{7}-\d$/,
    "La cédula debe tener el formato 000-0000000-0",
  );

/** Teléfono RD: acepta 809/829/849 con o sin guiones/espacios. */
export const telefonoRdSchema = z
  .string()
  .trim()
  .regex(
    /^(\+?1[\s-]?)?\(?(809|829|849)\)?[\s-]?\d{3}[\s-]?\d{4}$/,
    "Teléfono dominicano inválido (ej. 809-555-1234)",
  );

export const uuidSchema = z.string().uuid("Identificador inválido");

export const fechaSchema = z.coerce.date({
  errorMap: () => ({ message: "Fecha inválida" }),
});

export const sexoSchema = z.enum(["M", "F", "Otro"], {
  errorMap: () => ({ message: "Sexo inválido" }),
});
