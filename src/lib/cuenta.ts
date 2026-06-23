/**
 * Utilidades para cuentas de acceso de empleados.
 * Sin dependencias de servidor: usables en cliente y servidor.
 */

/** Sugerencia de correo: nombreapellido@luxamed.do (sin acentos ni espacios). */
export function sugerirEmail(nombre: string): string {
  const limpio = (nombre ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
  const partes = limpio.split(/\s+/).filter(Boolean);
  const base =
    partes.length >= 2
      ? `${partes[0]}${partes[partes.length - 1]}`
      : partes[0] || "usuario";
  return `${base}@luxamed.do`;
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const NUMS = "23456789";
const SYM = "!@#$%&*";

function aleatorio(max: number): number {
  const g = globalThis.crypto;
  if (g?.getRandomValues) {
    const a = new Uint32Array(1);
    g.getRandomValues(a);
    return a[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/** Contraseña temporal segura: 12 chars, con mayúscula, minúscula, número y símbolo. */
export function generarPassword(): string {
  const todos = UPPER + LOWER + NUMS + SYM;
  const base = [
    UPPER[aleatorio(UPPER.length)],
    LOWER[aleatorio(LOWER.length)],
    NUMS[aleatorio(NUMS.length)],
    SYM[aleatorio(SYM.length)],
  ];
  for (let i = base.length; i < 12; i++) base.push(todos[aleatorio(todos.length)]);
  // Mezclar
  for (let i = base.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1);
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join("");
}

/** Fuerza 0..4 (para el medidor). */
export function fuerzaPassword(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
