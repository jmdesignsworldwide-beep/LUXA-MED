/**
 * Tratamiento y saludos según el género del usuario logueado.
 * Por defecto masculino cuando no se conoce el género (caso del admin).
 */
export type Genero = "M" | "F" | null | undefined;

/** "Dr. " / "Dra. " solo para el admin (el médico). Vacío para el resto. */
export function tratamientoMedico(genero: Genero, rol?: string): string {
  if (rol !== "admin") return "";
  return genero === "F" ? "Dra. " : "Dr. ";
}

/** "Bienvenido" / "Bienvenida" (masculino por defecto). */
export function bienvenida(genero: Genero): string {
  return genero === "F" ? "Bienvenida" : "Bienvenido";
}

/** Etiqueta de rol con género (Administrador/a). */
export function etiquetaRol(rol: string, genero: Genero): string {
  switch (rol) {
    case "admin":
      return genero === "F" ? "Administradora" : "Administrador";
    case "enfermera":
      return genero === "M" ? "Enfermero" : "Enfermera";
    case "recepcion":
      return "Recepción";
    default:
      return rol;
  }
}
