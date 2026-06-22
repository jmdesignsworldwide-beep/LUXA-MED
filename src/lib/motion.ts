import type { Transition, Variants } from "framer-motion";

/**
 * ADN de movimiento LUXAMED — fuente única.
 *
 * Concepto "respiración": las cosas entran suaves y se asientan, como exhalar.
 * UNA sola curva + tiempos calmados, usados en TODO el sistema (bienvenida,
 * hover, clic, transiciones). Consistencia = sensación premium.
 */

/** La curva firma: salida suave tipo "exhalar". */
export const EASE_BREATH: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Tiempos calmados (segundos). */
export const DURATION = {
  fast: 0.4,
  base: 0.7,
  slow: 1.1,
  cinematic: 1.6,
} as const;

/** Transición base reutilizable. */
export function breath(
  duration: number = DURATION.base,
  delay = 0,
): Transition {
  return { duration, delay, ease: EASE_BREATH };
}

/** Entrar desde abajo, suave (texto, tarjetas). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: breath(DURATION.base, delay),
  }),
};

/** Aparecer escalando apenas (logo, focos). */
export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: breath(DURATION.slow, delay),
  }),
  exit: { opacity: 0, scale: 0.98, transition: breath(DURATION.fast) },
};

/** Pulso lento de "respiración" para atmósferas de fondo. */
export const breathingPulse = {
  scale: [1, 1.06, 1],
  opacity: [0.55, 0.8, 0.55],
  transition: {
    duration: 7,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

/** Resorte premium con rebote elegante visible. */
export const SPRING = {
  type: "spring" as const,
  stiffness: 260,
  damping: 20,
  mass: 1,
};

/** Contenedor en cascada: hijos entran uno tras otro (120 ms). */
export const cascadeContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

/** Elemento de la cascada: fundido + sube notable (y:30), con resorte. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: SPRING },
};

