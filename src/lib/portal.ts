import crypto from "crypto";

/** Token largo aleatorio para el enlace del portal (64 hex = 256 bits). */
export function generarTokenPortal(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** SHA-256 hex (para guardar solo el hash del token, nunca el token). */
export function sha256hex(valor: string): string {
  return crypto.createHash("sha256").update(valor).digest("hex");
}

/** Nombre de la cookie de sesión verificada del portal. */
export const PORTAL_COOKIE = "portal_sesion";
